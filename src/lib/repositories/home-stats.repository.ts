/**
 * 首页聚合统计 repository
 *
 * 原 /api/user/home-stats 路由的服务端聚合逻辑，v3.0.0 静态化后改为客户端聚合。
 * 从 practice / error-notes / knowledge repository 拉取数据并组装。
 * Polaris V2: 已彻底移除 xp/level/streak/todayXP 等游戏化字段，仅保留学习时长与正确率。
 */

import { getAll } from "@/lib/db/indexeddb";
import { STORES } from "@/lib/db/schema";
import {
  getUserPracticeRecords,
  type PracticeRecord,
} from "./practice.repository";
import { getErrorNotes } from "./error-notes.repository";
import { getUserMastery, type KnowledgePoint } from "./knowledge.repository";
import type { User } from "./user.repository";

export interface RecentRecord {
  id: string;
  subject: string;
  type: string;
  questionsDone: number;
  questionsCorrect: number;
  createdAt: string;
}

export interface HomeStats {
  learningMode?: string;
  todayStudyMinutes: number;
  weekStudyMinutes: number;
  totalStudyMinutes: number;
  todayQuestions: number;
  todayCorrect: number;
  correctRate: number;
  recentRecords: RecentRecord[];
  knowledgeProgress: {
    mastered: number;
    total: number;
    percentage: number;
  };
  errorNoteCount: number;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * 返回以周一为起点的本周零点（本地时区）。
 */
function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 = Sunday
  const diff = (day === 0 ? -6 : 1) - day; // 回到本周一
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * 聚合首页所需的所有统计数据。
 * @param user 当前登录用户（来自 auth-service.getCurrentUser()）
 */
export async function getHomeStats(
  user: User | null
): Promise<HomeStats> {
  // 未登录：返回零值结构，避免页面崩溃
  if (!user) {
    return {
      learningMode: "YOUTH",
      todayStudyMinutes: 0,
      weekStudyMinutes: 0,
      totalStudyMinutes: 0,
      todayQuestions: 0,
      todayCorrect: 0,
      correctRate: 0,
      recentRecords: [],
      knowledgeProgress: { mastered: 0, total: 0, percentage: 0 },
      errorNoteCount: 0,
    };
  }

  const userId = user.id;

  const [records, errorNotes, mastery, allKnowledgePoints] =
    await Promise.all([
      getUserPracticeRecords(userId),
      getErrorNotes(userId),
      getUserMastery(userId),
      getAll<KnowledgePoint>(STORES.KNOWLEDGE_POINTS),
    ]);

  const masteredCount = mastery.filter((m) => m.mastery >= 70).length;
  const knowledgeProgress = {
    mastered: masteredCount,
    total: allKnowledgePoints.length,
    percentage:
      allKnowledgePoints.length > 0
        ? Math.round((masteredCount / allKnowledgePoints.length) * 100)
        : 0,
  };
  const errorNoteCount = errorNotes.length;

  // 今日记录
  const now = new Date();
  const todayRecords = records.filter((r) =>
    isSameDay(new Date(r.createdAt), now)
  );
  const todayQuestions = todayRecords.length;
  const todayCorrect = todayRecords.filter((r) => r.isCorrect).length;
  const correctRate =
    todayQuestions > 0
      ? Math.round((todayCorrect / todayQuestions) * 100)
      : 0;

  // 学习时长（毫秒 → 分钟）
  const todayDurationMs = todayRecords.reduce(
    (sum, r) => sum + (r.timeSpentMs || 0),
    0
  );
  const todayStudyMinutes = Math.floor(todayDurationMs / 60000);

  // 本周学习时长（本周一起算）
  const weekStart = startOfWeek(now);
  const weekDurationMs = records
    .filter((r) => new Date(r.createdAt) >= weekStart)
    .reduce((sum, r) => sum + (r.timeSpentMs || 0), 0);
  const weekStudyMinutes = Math.floor(weekDurationMs / 60000);

  // 累计学习时长（全部记录）
  const totalDurationMs = records.reduce(
    (sum, r) => sum + (r.timeSpentMs || 0),
    0
  );
  const totalStudyMinutes = Math.floor(totalDurationMs / 60000);

  // 最近学习记录：按 createdAt 倒序取前 5 条，每条聚合为一次"练习记录"
  // （IndexedDB practice_records 是按题存储，简化为每条 record 一行）
  const recentRaw = [...records]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 5);

  const recentRecords: RecentRecord[] = recentRaw.map((r) => ({
    id: r.id,
    subject: r.subject,
    type: r.difficulty ? `难度${r.difficulty}` : "练习",
    questionsDone: 1,
    questionsCorrect: r.isCorrect ? 1 : 0,
    createdAt: r.createdAt,
  }));

  return {
    learningMode: user.learningMode,
    todayStudyMinutes,
    weekStudyMinutes,
    totalStudyMinutes,
    todayQuestions,
    todayCorrect,
    correctRate,
    recentRecords,
    knowledgeProgress,
    errorNoteCount,
  };
}

/**
 * 提供给 practice 页面在提交答案后构造 PracticeRecord 的辅助函数。
 * 不直接落库，仅用于类型对齐。
 */
export function buildPracticeRecord(
  userId: string,
  question: {
    id: string;
    subject: string;
    difficulty: number;
    correctAnswer: string;
  },
  userAnswer: string,
  isCorrect: boolean,
  timeSpentMs: number
): PracticeRecord {
  return {
    id: `${userId}_${question.id}_${Date.now()}`,
    userId,
    questionId: question.id,
    subject: question.subject,
    difficulty: question.difficulty,
    isCorrect,
    userAnswer,
    correctAnswer: question.correctAnswer,
    timeSpentMs,
    createdAt: new Date().toISOString(),
  };
}
