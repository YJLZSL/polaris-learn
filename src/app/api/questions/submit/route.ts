import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLevelInfo, XP_REWARDS } from "@/lib/game";

// 获取今天的日期字符串 YYYY-MM-DD
function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// POST: 提交答案并获取反馈
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;

    const body = await request.json();
    const { questionId, answer } = body;

    if (!questionId || typeof questionId !== "string") {
      return NextResponse.json({ error: "请指定题目ID" }, { status: 400 });
    }

    if (answer === undefined || answer === null || (typeof answer === "string" && answer.trim().length === 0)) {
      return NextResponse.json({ error: "请提供答案" }, { status: 400 });
    }

    // 查找题目
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        subject: true,
        difficulty: true,
        answer: true,
        explanation: true,
      },
    });

    if (!question) {
      return NextResponse.json({ error: "题目不存在" }, { status: 404 });
    }

    const correct = String(answer).trim() === String(question.answer).trim();

    // 使用事务处理提交结果
    const result = await prisma.$transaction(async (tx) => {
      let xpEarned = 0;
      let leveledUp = false;
      let newXP = 0;
      let newLevel = 0;
      let newStreak = 0;

      if (correct) {
        // 计算 XP
        xpEarned = question.difficulty >= 3
          ? XP_REWARDS.hardCorrectAnswer
          : XP_REWARDS.correctAnswer;

        // 创建学习记录
        await tx.learningRecord.create({
          data: {
            userId,
            subject: question.subject,
            type: "practice",
            duration: 0,
            questionsDone: 1,
            questionsCorrect: 1,
            xpEarned,
          },
        });

        // 更新用户 XP
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { id: true, xp: true, level: true, streak: true, maxStreak: true, lastStudyDate: true },
        });

        if (!user) throw new Error("用户不存在");

        const updatedXP = user.xp + xpEarned;
        const levelInfo = getLevelInfo(updatedXP);
        leveledUp = levelInfo.level > user.level;

        // 更新 streak
        const todayStr = getTodayDateString();
        let streak = user.streak;
        if (user.lastStudyDate) {
          const lastDate = new Date(user.lastStudyDate);
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const lastDateStr = `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, "0")}-${String(lastDate.getDate()).padStart(2, "0")}`;
          const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

          if (lastDateStr === todayStr) {
            // 今天已经学习过，streak 不变
            streak = user.streak;
          } else if (lastDateStr === yesterdayStr) {
            streak = user.streak + 1;
          } else {
            streak = 1;
          }
        } else {
          streak = 1;
        }

        const newMaxStreak = Math.max(user.maxStreak, streak);

        await tx.user.update({
          where: { id: userId },
          data: {
            xp: updatedXP,
            level: levelInfo.level,
            streak,
            maxStreak: newMaxStreak,
            lastStudyDate: new Date(),
          },
        });

        // 创建 XP 记录
        await tx.xPRecord.create({
          data: {
            userId,
            amount: xpEarned,
            reason: `练习答题正确 (${question.subject})`,
            source: "practice",
          },
        });

        newXP = updatedXP;
        newLevel = levelInfo.level;
        newStreak = streak;
      } else {
        // 答错：创建学习记录 + 错题记录
        await tx.learningRecord.create({
          data: {
            userId,
            subject: question.subject,
            type: "practice",
            duration: 0,
            questionsDone: 1,
            questionsCorrect: 0,
            xpEarned: 0,
          },
        });

        // 检查是否已有该题目的活跃错题记录
        const existingError = await tx.errorNote.findFirst({
          where: {
            userId,
            questionId,
            status: "active",
          },
        });

        if (!existingError) {
          await tx.errorNote.create({
            data: {
              userId,
              questionId,
              wrongAnswer: String(answer),
              status: "active",
            },
          });
        }

        // 更新 streak
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { id: true, xp: true, level: true, streak: true, maxStreak: true, lastStudyDate: true },
        });

        if (user) {
          const todayStr = getTodayDateString();
          let streak = user.streak;
          if (user.lastStudyDate) {
            const lastDate = new Date(user.lastStudyDate);
            const lastDateStr = `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, "0")}-${String(lastDate.getDate()).padStart(2, "0")}`;
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

            if (lastDateStr === todayStr) {
              streak = user.streak;
            } else if (lastDateStr === yesterdayStr) {
              streak = user.streak + 1;
            } else {
              streak = 1;
            }
          } else {
            streak = 1;
          }

          await tx.user.update({
            where: { id: userId },
            data: {
              streak,
              maxStreak: Math.max(user.maxStreak, streak),
              lastStudyDate: new Date(),
            },
          });

          newXP = user.xp;
          newLevel = user.level;
          newStreak = streak;
        }
      }

      return { xpEarned, leveledUp, newXP, newLevel, newStreak };
    });

    return NextResponse.json({
      correct,
      correctAnswer: !correct ? question.answer : undefined,
      explanation: question.explanation,
      xpEarned: result.xpEarned || undefined,
      newXP: result.newXP,
      leveledUp: result.leveledUp,
      newLevel: result.newLevel,
      newStreak: result.newStreak,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "提交答案失败";
    console.error("提交答案失败:", error);
    return NextResponse.json({ error: message }, { status: message === "用户不存在" ? 404 : 500 });
  }
}
