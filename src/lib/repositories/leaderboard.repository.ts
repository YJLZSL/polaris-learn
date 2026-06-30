/**
 * Task 15.7 / 15.8 / 15.9: 排行榜去毒性化
 *
 * 设计原则：
 * - 小队列分桶：按等级段 + 学段分桶，每桶 5-15 人，避免头部用户碾压
 * - 个人进步榜为主：默认展示"今日 XP vs 昨日 XP"等自我对比指标
 * - 柔和降级：连续 14 天不学习才降级到下一个桶（非一周）
 * - 无公开排名压力：不显示具体名次数字，改用"前 30%"等模糊分位
 *
 * 注意：IndexedDB 是本地存储，无法提供真实跨用户排行。
 * 本 repository 在用户周围生成稳定的"虚拟同队"虚拟同伴，仅用于自我定位。
 */

import { getAll } from '@/lib/db/indexeddb';
import { STORES } from '@/lib/db/schema';
import type { UserStats } from './gamification.repository';
import type { User } from './user.repository';
import { getUserById } from './user.repository';
import { getUserStats } from './gamification.repository';
import {
  getUserPracticeRecords,
  type PracticeRecord,
} from './practice.repository';
import { getUserMastery } from './knowledge.repository';

/* ============================================================
 * Legacy API（保留向后兼容，未在 UI 中使用）
 * ============================================================ */

export interface LeaderboardEntry {
  userId: string;
  name: string;
  avatar?: string;
  xp: number;
  level: number;
  currentStreak: number;
  rank: number;
}

export async function getTopUsers(
  limit: number = 50,
  currentUserId?: string
): Promise<{ entries: LeaderboardEntry[]; userRank?: number }> {
  const allStats = await getAll<UserStats>(STORES.USER_STATS);
  const sorted = allStats.sort((a, b) => b.xp - a.xp).slice(0, limit);
  const entries: LeaderboardEntry[] = sorted.map((s, i) => ({
    userId: s.userId,
    name: '我',
    xp: s.xp,
    level: s.level,
    currentStreak: s.currentStreak,
    rank: i + 1,
  }));
  let userRank: number | undefined;
  if (currentUserId) {
    const idx = sorted.findIndex((s) => s.userId === currentUserId);
    if (idx >= 0) userRank = idx + 1;
  }
  return { entries, userRank };
}

export async function getUserRank(userId: string): Promise<number | undefined> {
  const { userRank } = await getTopUsers(50, userId);
  return userRank;
}

/* ============================================================
 * Task 15.7: 小队列分桶（5-15 人）
 * ============================================================ */

export interface BucketMember {
  userId: string;
  name: string;
  avatar?: string;
  xp: number;
  level: number;
  currentStreak: number;
  /** 模糊分位 0-1，0.3 表示"位列前 30%"。不暴露具体名次 */
  percentile: number;
  /** 是否为当前登录用户 */
  isMe?: boolean;
}

export interface CohortBucket {
  /** 5-15 名成员，按 XP 倒序 */
  members: BucketMember[];
  size: number;
  /** 当前用户在桶内的模糊分位（0-1），未参与时为 undefined */
  myPercentile?: number;
  /** 桶标签：基于等级段 + 学段，例如"学霸 · 小学" */
  bucketLabel: string;
  /**
   * Task 15.9: 柔和降级提示。
   * true 表示用户连续 14+ 天未学习，建议进入更低强度桶。
   * 不强制降级，仅 UI 提示。
   */
  shouldDowngrade: boolean;
  /** 距离降级剩余天数（14 - 不参与天数），正值表示安全期 */
  daysUntilDowngrade: number;
}

/** Task 15.9: 连续不参与学习的降级阈值（天） */
export const DOWNGRADE_INACTIVE_DAYS = 14;

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function levelBandLabel(level: number): string {
  if (level >= 16) return '大师';
  if (level >= 11) return '学霸';
  if (level >= 6) return '学习达人';
  return '学习新手';
}

function gradeLabel(grade: string): string {
  if (!grade) return '通用';
  // 截断过长学段名，保留可读性
  return grade.length > 6 ? grade.slice(0, 6) : grade;
}

/**
 * 生成稳定的虚拟同伴（基于 userId + level 种子）。
 * 虚拟同伴的 XP 围绕用户 XP ± 35% 抖动，等级 ± 1。
 */
function generateVirtualPeers(
  user: { userId: string; xp: number; level: number; currentStreak: number },
  count: number
): BucketMember[] {
  const seed = hashSeed(`${user.userId}|${user.level}`);
  const rng = mulberry32(seed);
  const peers: BucketMember[] = [];
  const namePool = [
    '星轨学徒', '晨光', '小柯', '阿岚', '南风', '知夏',
    '北辰', '拾光', '远舟', '青柠', '小鹿', '云汐',
    '听涛', '半夏', '洛川', '清辞', '墨白', '拾月',
  ];
  for (let i = 0; i < count; i++) {
    const xpJitter = 0.65 + rng() * 0.7; // 0.65 - 1.35
    const peerXp = Math.max(0, Math.round(user.xp * xpJitter));
    const peerLevel = Math.max(1, user.level + (rng() < 0.5 ? -1 : 1) * Math.floor(rng() * 2));
    const peerStreak = Math.floor(rng() * 30);
    const nameIdx = Math.floor(rng() * namePool.length);
    peers.push({
      userId: `virtual_${i}_${user.userId}`,
      name: namePool[nameIdx],
      xp: peerXp,
      level: peerLevel,
      currentStreak: peerStreak,
      percentile: 0,
    });
  }
  return peers;
}

function dayDiff(a: string, b: string): number {
  const aMs = new Date(a.slice(0, 10) + 'T00:00:00').getTime();
  const bMs = new Date(b.slice(0, 10) + 'T00:00:00').getTime();
  if (Number.isNaN(aMs) || Number.isNaN(bMs)) return 0;
  return Math.round((bMs - aMs) / 86400000);
}

/**
 * Task 15.7: 获取当前用户所在的小队列分桶。
 * 桶大小 5-15，按等级段 + 学段标签化。
 */
export async function getCohortBucket(userId: string): Promise<CohortBucket> {
  const [stats, user] = await Promise.all([
    getUserStats(userId),
    getUserById(userId),
  ]);

  const xp = stats?.xp ?? 0;
  const level = stats?.level ?? 1;
  const currentStreak = stats?.currentStreak ?? 0;
  const grade = user?.grade ?? '';

  // 桶大小：5-15，基于 userId+level 稳定哈希
  const sizeSeed = hashSeed(`${userId}|${level}`) % 11;
  const bucketSize = 5 + sizeSeed; // 5-15
  const virtualCount = Math.max(0, bucketSize - 1);

  const me: BucketMember = {
    userId,
    name: user?.name ?? '我',
    avatar: user?.avatar,
    xp,
    level,
    currentStreak,
    percentile: 0,
    isMe: true,
  };

  const peers = generateVirtualPeers(
    { userId, xp, level, currentStreak },
    virtualCount
  );

  const members = [...peers, me].sort((a, b) => b.xp - a.xp);
  const size = members.length;

  // 计算每个成员的模糊分位（rank/size，rank 1-indexed）
  members.forEach((m, idx) => {
    const rank = idx + 1;
    m.percentile = size > 0 ? rank / size : 0;
  });

  const myIdx = members.findIndex((m) => m.isMe);
  const myPercentile = myIdx >= 0 ? members[myIdx].percentile : undefined;

  // Task 15.9: 柔和降级判定
  const lastActive = stats?.lastActiveDate ?? new Date().toISOString();
  const inactiveDays = Math.max(0, dayDiff(lastActive, new Date().toISOString()));
  const shouldDowngrade = inactiveDays >= DOWNGRADE_INACTIVE_DAYS;
  const daysUntilDowngrade = Math.max(0, DOWNGRADE_INACTIVE_DAYS - inactiveDays);

  return {
    members,
    size,
    myPercentile,
    bucketLabel: `${levelBandLabel(level)} · ${gradeLabel(grade)}`,
    shouldDowngrade,
    daysUntilDowngrade,
  };
}

/* ============================================================
 * Task 15.8: 个人进步榜（主榜）
 * ============================================================ */

export interface PersonalProgress {
  /** 今日 XP（粗略：今日答对题数 × 10） */
  todayXP: number;
  /** 昨日 XP */
  yesterdayXP: number;
  /** 今日 vs 昨日变化，正数为进步 */
  xpDelta: number;
  /** 本周新掌握节点数（mastery >= 70 且本周内更新） */
  weekMasteredNodes: number;
  /** 上周新掌握节点数（用于进步对比） */
  lastWeekMasteredNodes: number;
  /** 当前连胜 */
  currentStreak: number;
  /** Task 15.6: 历史最高连胜 */
  longestStreak: number;
  /** 进步趋势：up=今日胜昨日，flat=持平，down=退步 */
  trend: 'up' | 'flat' | 'down';
  /** 鼓励文案（基于 trend 生成，避免毒性化） */
  encouragement: string;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isSameWeek(d: Date, ref: Date): boolean {
  // 以 ref 为锚点，过去 7 天内视为本周
  const diffMs = ref.getTime() - d.getTime();
  return diffMs >= 0 && diffMs <= 7 * 86400000;
}

function isPrevWeek(d: Date, ref: Date): boolean {
  const diffMs = ref.getTime() - d.getTime();
  return diffMs > 7 * 86400000 && diffMs <= 14 * 86400000;
}

function roughXP(records: PracticeRecord[]): number {
  // 与 home-stats 保持一致：答对题数 × 10
  return records.filter((r) => r.isCorrect).length * 10;
}

function buildEncouragement(trend: 'up' | 'flat' | 'down', delta: number): string {
  if (trend === 'up') {
    return delta >= 30
      ? '今天状态很棒，比昨天进步明显，继续保持！'
      : '今天比昨天进步了一点点，点滴积累终成星河。';
  }
  if (trend === 'down') {
    return '今天状态一般也没关系，学习是长跑，明天再来就好。';
  }
  return '保持节奏，稳定输出本身就是一种力量。';
}

/**
 * Task 15.8: 拉取"超越昨日自己"个人进步榜数据。
 */
export async function getPersonalProgress(
  userId: string
): Promise<PersonalProgress> {
  const [stats, records, mastery] = await Promise.all([
    getUserStats(userId),
    getUserPracticeRecords(userId),
    getUserMastery(userId),
  ]);

  const now = new Date();
  const todayRecords = records.filter((r) =>
    isSameDay(new Date(r.createdAt), now)
  );
  const yesterday = new Date(now.getTime() - 86400000);
  const yesterdayRecords = records.filter((r) =>
    isSameDay(new Date(r.createdAt), yesterday)
  );

  const todayXP = roughXP(todayRecords);
  const yesterdayXP = roughXP(yesterdayRecords);
  const xpDelta = todayXP - yesterdayXP;

  // 本周新掌握节点（mastery >= 70 且本周内 updatedAt）
  const weekMasteredNodes = mastery.filter((m) => {
    const d = new Date(m.updatedAt);
    return m.mastery >= 70 && isSameWeek(d, now);
  }).length;
  const lastWeekMasteredNodes = mastery.filter((m) => {
    const d = new Date(m.updatedAt);
    return m.mastery >= 70 && isPrevWeek(d, now);
  }).length;

  const currentStreak = stats?.currentStreak ?? 0;
  const longestStreak = stats?.longestStreak ?? 0;

  let trend: 'up' | 'flat' | 'down' = 'flat';
  if (xpDelta > 0) trend = 'up';
  else if (xpDelta < 0) trend = 'down';

  return {
    todayXP,
    yesterdayXP,
    xpDelta,
    weekMasteredNodes,
    lastWeekMasteredNodes,
    currentStreak,
    longestStreak,
    trend,
    encouragement: buildEncouragement(trend, xpDelta),
  };
}

/**
 * Task 15.9: 柔和降级辅助 - 读取降级状态（不修改数据，仅判定）。
 * 供 UI 在 LeaderboardPage 顶部展示温和提示。
 */
export interface DowngradeStatus {
  inactiveDays: number;
  shouldDowngrade: boolean;
  daysUntilDowngrade: number;
  /** 温和提示文案 */
  hint: string;
}

export async function getDowngradeStatus(userId: string): Promise<DowngradeStatus> {
  const stats = await getUserStats(userId);
  const lastActive = stats?.lastActiveDate ?? new Date().toISOString();
  const inactiveDays = Math.max(0, dayDiff(lastActive, new Date().toISOString()));
  const shouldDowngrade = inactiveDays >= DOWNGRADE_INACTIVE_DAYS;
  const daysUntilDowngrade = Math.max(0, DOWNGRADE_INACTIVE_DAYS - inactiveDays);

  let hint: string;
  if (shouldDowngrade) {
    hint = '你已经休息了一段时间，下次学习时会进入更轻松的节奏，不用有压力。';
  } else if (daysUntilDowngrade <= 3) {
    hint = `保持节奏，还有 ${daysUntilDowngrade} 天会进入休整节奏。`;
  } else {
    hint = '节奏稳定，继续按自己的步调前行。';
  }

  return { inactiveDays, shouldDowngrade, daysUntilDowngrade, hint };
}
