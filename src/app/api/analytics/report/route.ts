import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLevelInfo } from "@/lib/game";

type Period = "7d" | "30d" | "90d";

function getPeriodDays(period: Period): number {
  switch (period) {
    case "7d": return 7;
    case "30d": return 30;
    case "90d": return 90;
    default: return 30;
  }
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

interface DailyStat {
  date: string;
  studyMinutes: number;
  questionsDone: number;
  correctRate: number;
  xpEarned: number;
}

interface SubjectBreakdown {
  subject: string;
  questionsDone: number;
  correctRate: number;
  studyMinutes: number;
}

interface Recommendation {
  type: "review" | "practice" | "challenge";
  topic: string;
  priority: "high" | "medium" | "low";
  reason: string;
}

// GET: 获取用户的综合分析报告
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;

    // 解析查询参数
    const { searchParams } = new URL(request.url);
    const periodParam = searchParams.get("period") || "30d";
    const period: Period = ["7d", "30d", "90d"].includes(periodParam)
      ? (periodParam as Period)
      : "30d";

    const days = getPeriodDays(period);
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    // 并行查询所有数据
    const [
      user,
      learningRecords,
      knowledgeMasteryList,
    ] = await Promise.all([
      // 用户基本信息
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, xp: true, level: true, streak: true },
      }),

      // 期间内的学习记录
      prisma.learningRecord.findMany({
        where: {
          userId,
          createdAt: { gte: startDate },
        },
        orderBy: { createdAt: "asc" },
      }),

      // 知识点掌握度（含关联知识点信息）
      prisma.userKnowledgeMastery.findMany({
        where: { userId },
        include: {
          knowledgePoint: {
            select: { id: true, name: true, subject: true },
          },
        },
        orderBy: { masteryLevel: "asc" },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    const levelInfo = getLevelInfo(user.xp);

    // --- 计算 summary ---
    const totalQuestions = learningRecords.reduce(
      (sum, r) => sum + r.questionsDone, 0
    );
    const totalCorrect = learningRecords.reduce(
      (sum, r) => sum + r.questionsCorrect, 0
    );
    const totalDurationMin = learningRecords.reduce(
      (sum, r) => sum + r.duration, 0
    );
    const xpGained = learningRecords.reduce(
      (sum, r) => sum + r.xpEarned, 0
    );

    const summary = {
      totalStudyHours: Math.round((totalDurationMin / 60) * 10) / 10,
      totalQuestions,
      correctRate: totalQuestions > 0
        ? Math.round((totalCorrect / totalQuestions) * 1000) / 10
        : 0,
      xpGained,
      streakDays: user.streak,
      currentLevel: user.level,
      levelTitle: levelInfo.title,
      xpToNextLevel: levelInfo.xpToNextLevel,
      levelProgress: levelInfo.progress,
    };

    // --- 计算 dailyStats ---
    // 为期间内的每一天构建统计数据
    const dailyMap = new Map<string, DailyStat>();

    // 初始化所有日期
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dateStr = formatDate(d);
      dailyMap.set(dateStr, {
        date: dateStr,
        studyMinutes: 0,
        questionsDone: 0,
        correctRate: 0,
        xpEarned: 0,
      });
    }

    // 聚合学习记录到每日
    for (const record of learningRecords) {
      const dateStr = formatDate(new Date(record.createdAt));
      const existing = dailyMap.get(dateStr);
      if (existing) {
        existing.studyMinutes += record.duration;
        existing.questionsDone += record.questionsDone;
        existing.xpEarned += record.xpEarned;
      }
    }

    // 重新计算每天的 correctRate（需要按天分组计算）
    const dayCorrectMap = new Map<string, { done: number; correct: number }>();
    for (const record of learningRecords) {
      const dateStr = formatDate(new Date(record.createdAt));
      const entry = dayCorrectMap.get(dateStr) || { done: 0, correct: 0 };
      entry.done += record.questionsDone;
      entry.correct += record.questionsCorrect;
      dayCorrectMap.set(dateStr, entry);
    }

    for (const [dateStr, stat] of dailyMap) {
      const correctData = dayCorrectMap.get(dateStr);
      if (correctData && correctData.done > 0) {
        stat.correctRate = Math.round((correctData.correct / correctData.done) * 1000) / 10;
      }
    }

    const dailyStats = Array.from(dailyMap.values());

    // --- 计算 subjectBreakdown ---
    const subjectMap = new Map<string, { done: number; correct: number; duration: number }>();
    for (const record of learningRecords) {
      const subject = record.subject || "其他";
      const entry = subjectMap.get(subject) || { done: 0, correct: 0, duration: 0 };
      entry.done += record.questionsDone;
      entry.correct += record.questionsCorrect;
      entry.duration += record.duration;
      subjectMap.set(subject, entry);
    }

    const subjectBreakdown: SubjectBreakdown[] = Array.from(subjectMap.entries())
      .map(([subject, data]) => ({
        subject,
        questionsDone: data.done,
        correctRate: data.done > 0
          ? Math.round((data.correct / data.done) * 1000) / 10
          : 0,
        studyMinutes: data.duration,
      }))
      .sort((a, b) => b.questionsDone - a.questionsDone);

    // --- 知识点掌握度 ---
    const knowledgeMastery = knowledgeMasteryList.map((m) => ({
      knowledgePointId: m.knowledgePointId,
      name: m.knowledgePoint.name,
      subject: m.knowledgePoint.subject,
      masteryLevel: Math.round(m.masteryLevel * 1000) / 10,
      timesCorrect: m.timesCorrect,
      timesWrong: m.timesWrong,
    }));

    // 薄弱知识点（掌握度最低的5个，只取有练习记录的）
    const practicedKnowledge = knowledgeMasteryList.filter(
      (m) => m.timesCorrect + m.timesWrong > 0
    );
    const sortedByMastery = [...practicedKnowledge].sort(
      (a, b) => a.masteryLevel - b.masteryLevel
    );

    const weakPoints = sortedByMastery.slice(0, 5).map((m) => ({
      knowledgePointId: m.knowledgePointId,
      name: m.knowledgePoint.name,
      subject: m.knowledgePoint.subject,
      masteryLevel: Math.round(m.masteryLevel * 1000) / 10,
      timesCorrect: m.timesCorrect,
      timesWrong: m.timesWrong,
    }));

    // 优势知识点（掌握度最高的5个）
    const strengths = [...practicedKnowledge]
      .sort((a, b) => b.masteryLevel - a.masteryLevel)
      .slice(0, 5)
      .map((m) => ({
        knowledgePointId: m.knowledgePointId,
        name: m.knowledgePoint.name,
        subject: m.knowledgePoint.subject,
        masteryLevel: Math.round(m.masteryLevel * 1000) / 10,
        timesCorrect: m.timesCorrect,
        timesWrong: m.timesWrong,
      }));

    // --- AI 学习建议 ---
    const recommendations: Recommendation[] = [];

    // 基于薄弱知识点生成复习建议
    for (const wp of weakPoints.slice(0, 3)) {
      let priority: "high" | "medium" | "low" = "medium";
      if (wp.masteryLevel < 30) priority = "high";
      else if (wp.masteryLevel < 50) priority = "medium";
      else priority = "low";

      recommendations.push({
        type: "review",
        topic: `${wp.subject} - ${wp.name}`,
        priority,
        reason:
          wp.masteryLevel < 30
            ? `掌握程度仅 ${wp.masteryLevel}%，急需重点复习此知识点`
            : wp.masteryLevel < 50
              ? `掌握程度为 ${wp.masteryLevel}%，建议针对性复习以提升正确率`
              : `掌握程度为 ${wp.masteryLevel}%，适度巩固即可达到优秀水平`,
      });
    }

    // 基于学科分布生成练习建议
    if (subjectBreakdown.length > 0) {
      const weakestSubject = subjectBreakdown
        .filter((s) => s.questionsDone >= 5)
        .sort((a, b) => a.correctRate - b.correctRate)[0];

      if (weakestSubject && weakestSubject.correctRate < 70) {
        recommendations.push({
          type: "practice",
          topic: weakestSubject.subject,
          priority: weakestSubject.correctRate < 50 ? "high" : "medium",
          reason:
            `${weakestSubject.subject} 正确率仅 ${weakestSubject.correctRate}%，` +
            "建议增加该学科的专项练习以提升综合能力",
        });
      }
    }

    // 挑战建议：如果用户学习天数较多且有高掌握度知识点
    const activeDays = dailyStats.filter((d) => d.questionsDone > 0).length;
    if (activeDays >= 5 && strengths.length > 0) {
      recommendations.push({
        type: "challenge",
        topic: strengths[0].subject,
        priority: "low",
        reason: `你在 ${strengths[0].subject} 方面表现优秀，尝试挑战高难度题目来突破瓶颈`,
      });
    }

    // 如果建议不足，补充通用建议
    if (recommendations.length === 0) {
      recommendations.push({
        type: "practice",
        topic: "综合练习",
        priority: "medium",
        reason: "保持每日学习习惯，持续积累知识，建议完成今日的每日挑战",
      });
    }

    return NextResponse.json({
      summary,
      dailyStats,
      subjectBreakdown,
      knowledgeMastery,
      weakPoints,
      strengths,
      recommendations,
      period,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("获取分析报告失败:", error);
    return NextResponse.json({ error: "获取分析报告失败" }, { status: 500 });
  }
}
