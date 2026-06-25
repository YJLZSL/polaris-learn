import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: 获取排行榜数据
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "all"; // "weekly" | "monthly" | "all"

    let leaderboard: Array<{
      rank: number;
      userId: string;
      name: string;
      avatar: string | null;
      level: number;
      xp: number;
      streak: number;
    }> = [];

    if (period === "all") {
      // 总榜：按用户 XP 降序排列
      const users = await prisma.user.findMany({
        orderBy: { xp: "desc" },
        take: 50,
        select: {
          id: true,
          name: true,
          avatar: true,
          level: true,
          xp: true,
          streak: true,
        },
      });

      leaderboard = users.map((u, idx) => ({
        rank: idx + 1,
        userId: u.id,
        name: u.name,
        avatar: u.avatar,
        level: u.level,
        xp: u.xp,
        streak: u.streak,
      }));
    } else {
      // 周榜 / 月榜：基于 LearningRecord 汇总
      const now = new Date();
      let since: Date;

      if (period === "weekly") {
        since = new Date(now);
        since.setDate(since.getDate() - 7);
      } else {
        // monthly
        since = new Date(now);
        since.setMonth(since.getMonth() - 1);
      }

      // 按 userId 分组汇总 xpEarned
      const records = await prisma.learningRecord.groupBy({
        by: ["userId"],
        where: {
          createdAt: { gte: since },
        },
        _sum: { xpEarned: true },
        orderBy: { _sum: { xpEarned: "desc" } },
        take: 50,
      });

      if (records.length > 0) {
        const userIds = records.map((r) => r.userId);
        const users = await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: {
            id: true,
            name: true,
            avatar: true,
            level: true,
            xp: true,
            streak: true,
          },
        });

        const userMap = new Map(users.map((u) => [u.id, u]));

        leaderboard = records.map((r, idx) => {
          const u = userMap.get(r.userId);
          return {
            rank: idx + 1,
            userId: r.userId,
            name: u?.name || "未知用户",
            avatar: u?.avatar || null,
            level: u?.level || 1,
            xp: r._sum.xpEarned || 0,
            streak: u?.streak || 0,
          };
        });
      }
    }

    // 确保当前用户在列表中（如果不在 top 50 中）
    const currentUserInList = leaderboard.find((u) => u.userId === userId);
    let currentUserData: typeof leaderboard[0] | null = currentUserInList || null;
    let currentUserRankValue: number | null = currentUserInList?.rank || null;

    if (!currentUserData) {
      // 查询当前用户的排名
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, avatar: true, level: true, xp: true, streak: true },
      });

      if (currentUser) {
        let rank = 0;
        if (period === "all") {
          rank = await prisma.user.count({
            where: { xp: { gt: currentUser.xp } },
          });
        } else {
          const now = new Date();
          let since: Date;
          if (period === "weekly") {
            since = new Date(now);
            since.setDate(since.getDate() - 7);
          } else {
            since = new Date(now);
            since.setMonth(since.getMonth() - 1);
          }

          const currentUserXP = await prisma.learningRecord.aggregate({
            where: { userId, createdAt: { gte: since } },
            _sum: { xpEarned: true },
          });

          const higherCount = await prisma.learningRecord.groupBy({
            by: ["userId"],
            where: { createdAt: { gte: since } },
            _sum: { xpEarned: true },
            having: { xpEarned: { _sum: { gt: currentUserXP._sum.xpEarned || 0 } } },
          });

          rank = higherCount.length;
        }

        currentUserRankValue = rank + 1;
        currentUserData = {
          rank: rank + 1,
          userId: currentUser.id,
          name: currentUser.name,
          avatar: currentUser.avatar,
          level: currentUser.level,
          xp: period === "all" ? currentUser.xp : 0,
          streak: currentUser.streak,
        };
      }
    }

    return NextResponse.json({
      leaderboard,
      currentUser: currentUserData,
      currentUserRank: currentUserRankValue,
      period,
    });
  } catch (error) {
    console.error("获取排行榜失败:", error);
    return NextResponse.json({ error: "获取排行榜失败" }, { status: 500 });
  }
}
