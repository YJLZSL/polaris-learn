import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLevelInfo } from "@/lib/game";

// GET: 获取首页统计数据
export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;

    // 获取用户基础数据
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        avatar: true,
        xp: true,
        level: true,
        streak: true,
        maxStreak: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 获取今日学习记录
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayRecords = await prisma.learningRecord.findMany({
      where: {
        userId,
        createdAt: { gte: today, lt: tomorrow },
      },
      orderBy: { createdAt: "desc" },
    });

    const todayDuration = todayRecords.reduce((sum, r) => sum + r.duration, 0);
    const todayQuestions = todayRecords.reduce((sum, r) => sum + r.questionsDone, 0);
    const todayCorrect = todayRecords.reduce((sum, r) => sum + r.questionsCorrect, 0);
    const todayXP = todayRecords.reduce((sum, r) => sum + r.xpEarned, 0);
    const correctRate = todayQuestions > 0 ? Math.round((todayCorrect / todayQuestions) * 100) : 0;

    // 获取最近5条学习记录
    const recentRecords = await prisma.learningRecord.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        subject: true,
        type: true,
        questionsDone: true,
        questionsCorrect: true,
        xpEarned: true,
        createdAt: true,
      },
    });

    // 等级信息
    const levelInfo = getLevelInfo(user.xp);

    return NextResponse.json({
      xp: user.xp,
      level: user.level,
      streak: user.streak,
      maxStreak: user.maxStreak,
      todayDuration,
      todayQuestions,
      todayCorrect,
      correctRate,
      todayXP,
      totalXP: user.xp,
      levelInfo,
      recentRecords: recentRecords.map((r) => ({
        id: r.id,
        subject: r.subject,
        type: r.type,
        questionsDone: r.questionsDone,
        questionsCorrect: r.questionsCorrect,
        xpEarned: r.xpEarned,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error("获取首页统计失败:", error);
    return NextResponse.json({ error: "获取首页统计失败" }, { status: 500 });
  }
}
