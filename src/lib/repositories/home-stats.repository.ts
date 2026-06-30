/**
 * 首页聚合统计 repository
 *
 * 原 /api/user/home-stats 路由的服务端聚合逻辑，v3.0.0 静态化后改为客户端聚合。
 * 从 gamification / practice / error-notes / knowledge repository 拉取数据并组装。
 */

import { getUserStats } from "./gamification.repository";
import {
  getUserPracticeRecords,
  type PracticeRecord,
} from "./practice.repository";
import { getErrorNotes } from "./error-notes.repository";
import { getUserBadges } from "./gamification.repository";
import { getUserMastery } from "./knowledge.repository";
import type { User } from "./user.repository";

export interface RecentRecord {
  id: string;
  subject: string;
  type: string;
  questionsDone: number;
  questionsCorrect: number;
  xpEarned: number;
  createdAt: string;
}

export interface HomeStats {
  xp: number;
  level: number;
  streak: number;
  maxStreak: number;
  learningMode?: string;
  todayDuration: number;
  todayQuestions: number;
  todayCorrect: number;
  correctRate: number;
  todayXP: number;
  totalXP: number;
  recentRecords: RecentRecord[];
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
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
      xp: 0,
      level: 1,
      streak: 0,
      maxStreak: 0,
      learningMode: "ELEMENTARY",
      todayDuration: 0,
      todayQuestions: 0,
      todayCorrect: 0,
      correctRate: 0,
      todayXP: 0,
      totalXP: 0,
      recentRecords: [],
    };
  }

  const userId = user.id;

  const [stats, records, errorNotes, badges, mastery] = await Promise.all([
    getUserStats(userId),
    getUserPracticeRecords(userId),
    getErrorNotes(userId),
    getUserBadges(userId),
    getUserMastery(userId),
  ]);

  const xp = stats?.xp ?? 0;
  const level = stats?.level ?? 1;
  const streak = stats?.currentStreak ?? 0;
  const maxStreak = stats?.longestStreak ?? 0;

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
  // 简化：今日 XP 等于今日答对题数 * 10（粗略估计）
  const todayXP = todayCorrect * 10;

  // 今日学习时长（毫秒 → 分钟）
  const todayDurationMs = todayRecords.reduce(
    (sum, r) => sum + (r.timeSpentMs || 0),
    0
  );
  const todayDuration = Math.floor(todayDurationMs / 60000);

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
    xpEarned: r.isCorrect ? 10 : 0,
    createdAt: r.createdAt,
  }));

  // 引用 errorNotes/badges/mastery 仅用于触发潜在 side-effect（实际未消费）
  // 避免被 tree-shake 后期变化破坏；当前 home 页只需要上述字段
  void errorNotes;
  void badges;
  void mastery;

  return {
    xp,
    level,
    streak,
    maxStreak,
    learningMode: user.learningMode,
    todayDuration,
    todayQuestions,
    todayCorrect,
    correctRate,
    todayXP,
    totalXP: xp,
    recentRecords,
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
