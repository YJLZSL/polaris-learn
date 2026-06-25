import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLevelInfo } from "@/lib/game";
import { hasAPIKey } from "@/lib/llm-adapter";

// GET: 获取当前用户资料和统计数据
export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: true,
        badges: {
          include: {
            badge: true,
          },
        },
        _count: {
          select: {
            conversations: true,
            errorNotes: true,
            notes: true,
            learningRecords: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 获取今日学习统计数据
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayRecords = await prisma.learningRecord.findMany({
      where: {
        userId,
        createdAt: { gte: today },
      },
    });

    const todayStats = {
      questionsDone: todayRecords.reduce((sum: number, r: typeof todayRecords[number]) => sum + r.questionsDone, 0),
      questionsCorrect: todayRecords.reduce((sum: number, r: typeof todayRecords[number]) => sum + r.questionsCorrect, 0),
      xpEarned: todayRecords.reduce((sum: number, r: typeof todayRecords[number]) => sum + r.xpEarned, 0),
      studyDuration: todayRecords.reduce((sum: number, r: typeof todayRecords[number]) => sum + r.duration, 0),
    };

    // 计算等级信息
    const levelInfo = getLevelInfo(user.xp);

    // 排除敏感字段
    const { password: _password, ...safeUser } = user;

    return NextResponse.json({
      user: {
        id: safeUser.id,
        name: safeUser.name,
        email: safeUser.email,
        grade: safeUser.grade,
        avatar: safeUser.avatar,
        xp: safeUser.xp,
        level: safeUser.level,
        streak: safeUser.streak,
        maxStreak: safeUser.maxStreak,
        lastStudyDate: safeUser.lastStudyDate,
        createdAt: safeUser.createdAt,
        updatedAt: safeUser.updatedAt,
        studentProfile: safeUser.studentProfile,
        levelInfo,
        todayStats,
        badges: safeUser.badges.map((ub: typeof safeUser.badges[number]) => ({
          id: ub.badge.id,
          name: ub.badge.name,
          description: ub.badge.description,
          icon: ub.badge.icon,
          category: ub.badge.category,
          rarity: ub.badge.rarity,
          earnedAt: ub.earnedAt,
        })),
        stats: {
          totalConversations: safeUser._count.conversations,
          totalErrorNotes: safeUser._count.errorNotes,
          totalNotes: safeUser._count.notes,
          totalLearningRecords: safeUser._count.learningRecords,
        },
        hasApiKey: hasAPIKey(),
      },
    });
  } catch (error) {
    console.error("获取用户资料失败:", error);
    return NextResponse.json({ error: "获取用户资料失败" }, { status: 500 });
  }
}

// PUT: 更新用户资料
export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;

    const body = await request.json();
    const { name, grade, avatar, learningStyle, dailyGoalMin, weeklyGoalDays } = body;

    // 可使用 Prisma 事务来原子更新 user 和 studentProfile
    const result = await prisma.$transaction(async (tx) => {
      // 更新 User 基础字段
      const userUpdateData: Record<string, unknown> = {};
      if (name !== undefined) {
        if (typeof name !== "string" || name.trim().length === 0) {
          throw new Error("姓名不能为空");
        }
        userUpdateData.name = name.trim();
      }
      if (grade !== undefined) {
        userUpdateData.grade = grade || null;
      }
      if (avatar !== undefined) {
        userUpdateData.avatar = avatar || null;
      }

      let user;
      if (Object.keys(userUpdateData).length > 0) {
        user = await tx.user.update({
          where: { id: userId },
          data: userUpdateData,
        });
      } else {
        user = await tx.user.findUnique({ where: { id: userId } });
      }

      // 更新 StudentProfile 字段
      const profileUpdateData: Record<string, unknown> = {};
      if (learningStyle !== undefined) profileUpdateData.learningStyle = learningStyle;
      if (dailyGoalMin !== undefined) {
        const goal = parseInt(dailyGoalMin);
        if (isNaN(goal) || goal < 1 || goal > 480) {
          throw new Error("每日学习目标应在1-480分钟之间");
        }
        profileUpdateData.dailyGoalMin = goal;
      }
      if (weeklyGoalDays !== undefined) {
        const days = parseInt(weeklyGoalDays);
        if (isNaN(days) || days < 1 || days > 7) {
          throw new Error("每周学习天数应在1-7天之间");
        }
        profileUpdateData.weeklyGoalDays = days;
      }

      if (Object.keys(profileUpdateData).length > 0) {
        await tx.studentProfile.upsert({
          where: { userId },
          create: {
            userId,
            ...profileUpdateData,
          },
          update: profileUpdateData,
        });
      }

      return user;
    });

    if (!result) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: result.id,
        name: result.name,
        grade: result.grade,
        avatar: result.avatar,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新资料失败";
    const status = message.includes("不能为空") || message.includes("应在") ? 400 : 500;
    console.error("更新用户资料失败:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
