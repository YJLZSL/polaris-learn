import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLevelInfo } from "@/lib/game";

// POST: 为用户添加经验值
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;

    const body = await request.json();
    const { amount, reason, source } = body;

    // 参数校验
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "经验值必须为正整数" }, { status: 400 });
    }

    if (amount > 10000) {
      return NextResponse.json({ error: "单次经验值不能超过10000" }, { status: 400 });
    }

    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      return NextResponse.json({ error: "请说明经验值来源原因" }, { status: 400 });
    }

    const xpAmount = Math.floor(amount);

    // 使用事务保证原子性
    const result = await prisma.$transaction(async (tx) => {
      // 获取当前用户，记录旧等级
      const currentUser = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, xp: true, level: true },
      });

      if (!currentUser) {
        throw new Error("用户不存在");
      }

      const oldLevel = currentUser.level;
      const newXp = currentUser.xp + xpAmount;

      // 更新用户XP
      const _updatedUser = await tx.user.update({
        where: { id: userId },
        data: { xp: newXp },
      });

      // 计算新等级
      const newLevelInfo = getLevelInfo(newXp);
      const leveledUp = newLevelInfo.level > oldLevel;

      // 如果升级了，同步更新 level 字段
      if (leveledUp) {
        await tx.user.update({
          where: { id: userId },
          data: { level: newLevelInfo.level },
        });
      }

      // 创建经验记录
      const xpRecord = await tx.xPRecord.create({
        data: {
          userId,
          amount: xpAmount,
          reason: reason.trim(),
          source: source || null,
        },
      });

      return {
        xp: newXp,
        oldLevel,
        newLevel: newLevelInfo.level,
        leveledUp,
        levelInfo: newLevelInfo,
        xpRecord,
      };
    });

    return NextResponse.json({
      success: true,
      xp: result.xp,
      level: result.newLevel,
      leveledUp: result.leveledUp,
      levelInfo: result.levelInfo,
      xpRecord: {
        id: result.xpRecord.id,
        amount: result.xpRecord.amount,
        reason: result.xpRecord.reason,
        source: result.xpRecord.source,
        createdAt: result.xpRecord.createdAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "添加经验值失败";
    console.error("添加经验值失败:", error);
    return NextResponse.json({ error: message }, { status: message === "用户不存在" ? 404 : 500 });
  }
}
