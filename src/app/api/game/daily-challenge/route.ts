import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLevelInfo, XP_REWARDS, STREAK_MILESTONES } from "@/lib/game";

// 获取今天的日期字符串 YYYY-MM-DD
function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// GET: 获取今日挑战题目
export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;
    const today = getTodayDateString();

    // 查找今天的挑战记录
    let challenge = await prisma.dailyChallenge.findUnique({
      where: {
        userId_date: { userId, date: today },
      },
      include: {
        question: {
          include: {
            knowledge: {
              include: {
                knowledgePoint: {
                  select: { id: true, name: true, subject: true },
                },
              },
            },
          },
        },
      },
    });

    // 如果不存在，创建一个新的每日挑战
    if (!challenge) {
      // 随机选取一道题目
      const questionCount = await prisma.question.count();
      if (questionCount === 0) {
        return NextResponse.json({ error: "暂无可用的题目" }, { status: 404 });
      }

      const randomSkip = Math.floor(Math.random() * questionCount);
      const randomQuestion = await prisma.question.findFirst({
        skip: randomSkip,
        include: {
          knowledge: {
            include: {
              knowledgePoint: {
                select: { id: true, name: true, subject: true },
              },
            },
          },
        },
      });

      if (!randomQuestion) {
        return NextResponse.json({ error: "暂无可用的题目" }, { status: 404 });
      }

      challenge = await prisma.dailyChallenge.create({
        data: {
          userId,
          date: today,
          questionId: randomQuestion.id,
          completed: false,
        },
        include: {
          question: {
            include: {
              knowledge: {
                include: {
                  knowledgePoint: {
                    select: { id: true, name: true, subject: true },
                  },
                },
              },
            },
          },
        },
      });

      // 重新查询以获取完整数据
      challenge = await prisma.dailyChallenge.findUnique({
        where: { id: challenge.id },
        include: {
          question: {
            include: {
              knowledge: {
                include: {
                  knowledgePoint: {
                    select: { id: true, name: true, subject: true },
                  },
                },
              },
            },
          },
        },
      });
    }

    if (!challenge) {
      return NextResponse.json({ error: "创建每日挑战失败" }, { status: 500 });
    }

    return NextResponse.json({
      challenge: {
        id: challenge.id,
        date: challenge.date,
        completed: challenge.completed,
        createdAt: challenge.createdAt,
        question: {
          id: challenge.question.id,
          subject: challenge.question.subject,
          type: challenge.question.type,
          difficulty: challenge.question.difficulty,
          content: challenge.question.content,
          options: JSON.parse(challenge.question.options),
          gradeLevel: challenge.question.gradeLevel,
          knowledgePoints: challenge.question.knowledge?.map((k: typeof challenge.question.knowledge[number]) => k.knowledgePoint) || [],
        },
      },
    });
  } catch (error) {
    console.error("获取每日挑战失败:", error);
    return NextResponse.json({ error: "获取每日挑战失败" }, { status: 500 });
  }
}

// POST: 完成每日挑战
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;

    const body = await request.json();
    const { questionId, correct } = body;

    if (!questionId || typeof questionId !== "string") {
      return NextResponse.json({ error: "请指定题目ID" }, { status: 400 });
    }

    const today = getTodayDateString();

    // 查找今天的挑战
    const challenge = await prisma.dailyChallenge.findUnique({
      where: {
        userId_date: { userId, date: today },
      },
    });

    if (!challenge) {
      return NextResponse.json({ error: "今天的每日挑战不存在" }, { status: 404 });
    }

    if (challenge.completed) {
      return NextResponse.json({ error: "今天的每日挑战已完成" }, { status: 400 });
    }

    if (challenge.questionId !== questionId) {
      return NextResponse.json({ error: "题目ID不匹配" }, { status: 400 });
    }

    // 使用事务处理
    const result = await prisma.$transaction(async (tx) => {
      // 标记挑战完成
      await tx.dailyChallenge.update({
        where: { id: challenge.id },
        data: { completed: true },
      });

      // 获取用户信息
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, xp: true, level: true, streak: true, maxStreak: true, lastStudyDate: true },
      });

      if (!user) throw new Error("用户不存在");

      // 计算 streak
      let newStreak = user.streak;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

      if (user.lastStudyDate) {
        const lastDateStr = `${user.lastStudyDate.getFullYear()}-${String(user.lastStudyDate.getMonth() + 1).padStart(2, "0")}-${String(user.lastStudyDate.getDate()).padStart(2, "0")}`;
        if (lastDateStr === yesterdayStr) {
          // 连续签到
          newStreak = user.streak + 1;
        } else if (lastDateStr === today) {
          // 今天已经签到过
          newStreak = user.streak;
        } else {
          // 断签了
          newStreak = 1;
        }
      } else {
        newStreak = 1;
      }

      const newMaxStreak = Math.max(user.maxStreak, newStreak);

      // 计算经验值
      let xpAmount = XP_REWARDS.dailyChallenge;

      // 如果答对了，额外奖励
      if (correct) {
        xpAmount += XP_REWARDS.correctAnswer;
      }

      // 连续签到奖励
      if (newStreak >= 3) {
        xpAmount += XP_REWARDS.streakBonus;
      }

      // 检查连续打卡里程碑
      const milestone = STREAK_MILESTONES.find((m) => m.days === newStreak);

      if (milestone) {
        xpAmount += milestone.xpBonus;
      }

      const newXp = user.xp + xpAmount;
      const newLevelInfo = getLevelInfo(newXp);
      const leveledUp = newLevelInfo.level > user.level;

      // 更新用户数据
      await tx.user.update({
        where: { id: userId },
        data: {
          xp: newXp,
          level: newLevelInfo.level,
          streak: newStreak,
          maxStreak: newMaxStreak,
          lastStudyDate: new Date(),
        },
      });

      // 创建经验记录
      const xpRecord = await tx.xPRecord.create({
        data: {
          userId,
          amount: xpAmount,
          reason: `每日挑战${correct ? "（答对）" : "（完成）"}`,
          source: "daily_challenge",
        },
      });

      return {
        xp: newXp,
        xpEarned: xpAmount,
        oldLevel: user.level,
        newLevel: newLevelInfo.level,
        leveledUp,
        levelInfo: newLevelInfo,
        streak: newStreak,
        maxStreak: newMaxStreak,
        corrected: correct === true,
        milestone: milestone ? { name: milestone.name, icon: milestone.icon } : null,
        xpRecord,
      };
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "完成每日挑战失败";
    console.error("完成每日挑战失败:", error);
    return NextResponse.json({ error: message }, { status: message === "用户不存在" ? 404 : 500 });
  }
}
