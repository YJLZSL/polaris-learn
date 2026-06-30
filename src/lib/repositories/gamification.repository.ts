import { getAll, queryByIndex, put, getByKey } from '@/lib/db/indexeddb';
import { STORES } from '@/lib/db/schema';
import { getUserById } from './user.repository';
import {
  adjustFreezeCards,
  adjustShields,
  addCrystal,
} from './currency.repository';
import {
  STREAK_MILESTONES,
  STREAK_SHIELD_MILESTONES,
} from '@/lib/game';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  requirement: string;
}

export interface UserBadge {
  id: string;
  userId: string;
  badgeId: string;
  awardedAt: string;
}

export interface UserStats {
  userId: string;
  xp: number;
  level: number;
  totalStudyTimeMs: number;
  currentStreak: number;
  /**
   * Task 15.6: 历史最高连胜纪录。展示层别名 maxStreak。
   * 即使断签清零 currentStreak，本字段保留历史峰值用于"超越自己"展示。
   */
  longestStreak: number;
  lastActiveDate: string;
  updatedAt: string;
}

export async function getBadges(): Promise<Badge[]> {
  return getAll<Badge>(STORES.BADGES);
}

export async function getUserBadges(userId: string): Promise<UserBadge[]> {
  return queryByIndex<UserBadge>(STORES.USER_BADGES, 'userId', userId);
}

export async function awardBadge(userId: string, badgeId: string): Promise<void> {
  const userBadge: UserBadge = {
    id: `${userId}_${badgeId}`,
    userId,
    badgeId,
    awardedAt: new Date().toISOString(),
  };
  await put(STORES.USER_BADGES, userBadge);
}

export async function getUserStats(userId: string): Promise<UserStats | undefined> {
  return getByKey<UserStats>(STORES.USER_STATS, userId);
}

export async function updateUserStats(stats: UserStats): Promise<void> {
  stats.updatedAt = new Date().toISOString();
  await put(STORES.USER_STATS, stats);
}

export async function addXP(userId: string, amount: number): Promise<UserStats> {
  let stats = await getUserStats(userId);
  if (!stats) {
    stats = {
      userId,
      xp: 0,
      level: 1,
      totalStudyTimeMs: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  stats.xp += amount;
  stats.level = Math.floor(stats.xp / 100) + 1;
  await updateUserStats(stats);
  return stats;
}

/**
 * Task 15.4 / 15.5 / 15.6: 连胜更新（容错版）
 *
 * 容错规则：
 * - gap = 1 天（昨天学过）：正常 +1
 * - gap > 1 天（断签）：每张冻结卡可覆盖 1 个断签日
 *   - 若冻结卡 >= 断签日数：消耗对应数量，连胜 +1（不断）
 *   - 若冻结卡 < 断签日数：消耗全部冻结卡，但连胜仍清零为 1（今天为新连胜起点）
 * - gap <= 0（同日/时钟回拨）：no-op
 *
 * 里程碑（Task 15.5）：
 * - 命中 7/30/100 天时发放保护盾 + 晶核 + XP 加成
 * - 通过 prevStreak < days <= newStreak 判定，避免重复发放
 *
 * 历史最高（Task 15.6）：
 * - longestStreak 始终取 max(old, new)，断签不清零
 */
export async function updateStreak(userId: string): Promise<UserStats> {
  let stats = await getUserStats(userId);
  if (!stats) {
    stats = {
      userId,
      xp: 0,
      level: 1,
      totalStudyTimeMs: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  const today = new Date().toISOString().slice(0, 10);
  const lastDate = stats.lastActiveDate.slice(0, 10);
  if (today === lastDate) {
    return stats;
  }

  // 计算断签天数（基于日历日，避免夏令时漂移）
  const todayMs = new Date(today + "T00:00:00").getTime();
  const lastMs = new Date(lastDate + "T00:00:00").getTime();
  const gapDays = Math.round((todayMs - lastMs) / 86400000);
  if (gapDays <= 0) {
    return stats;
  }

  const prevStreak = stats.currentStreak;
  let newStreak: number;
  let freezeConsumed = 0;

  if (gapDays === 1) {
    newStreak = prevStreak + 1;
  } else {
    // Task 15.4: 尝试用冻结卡覆盖 (gapDays - 1) 个断签日
    const user = await getUserById(userId);
    const available = user?.freezeCards ?? 0;
    const missedDays = gapDays - 1;
    if (available >= missedDays && missedDays > 0) {
      freezeConsumed = missedDays;
      newStreak = prevStreak + 1;
    } else if (available > 0) {
      // 部分覆盖：仍断签，但消耗掉持有的冻结卡
      freezeConsumed = available;
      newStreak = 1;
    } else {
      newStreak = 1;
    }
  }

  stats.currentStreak = newStreak;
  stats.longestStreak = Math.max(stats.longestStreak, newStreak);
  stats.lastActiveDate = new Date().toISOString();

  // Task 15.5: 同一笔写入中累加里程碑 XP，避免 re-entrancy
  let xpBonus = 0;
  for (const m of STREAK_MILESTONES) {
    if (prevStreak < m.days && newStreak >= m.days) {
      xpBonus += m.xpBonus;
    }
  }
  if (xpBonus > 0) {
    stats.xp += xpBonus;
    stats.level = Math.floor(stats.xp / 100) + 1;
  }
  await updateUserStats(stats);

  // 消耗冻结卡（独立 store 写入，幂等）
  if (freezeConsumed > 0) {
    await adjustFreezeCards(userId, -freezeConsumed);
  }

  // Task 15.5: 发放里程碑保护盾 + 晶核
  for (const m of STREAK_SHIELD_MILESTONES) {
    if (prevStreak < m.days && newStreak >= m.days) {
      await adjustShields(userId, m.shields);
      if (m.crystal > 0) {
        await addCrystal(userId, m.crystal, `连胜 ${m.days} 天里程碑`);
      }
    }
  }

  return stats;
}

/**
 * Task 15.4/15.6 UI 辅助：一次性读取连胜相关展示字段。
 * 返回当前连胜、历史最高、冻结卡、保护盾数量。
 */
export interface StreakSnapshot {
  currentStreak: number;
  longestStreak: number;
  freezeCards: number;
  shieldCount: number;
  lastActiveDate: string;
}

export async function getStreakSnapshot(userId: string): Promise<StreakSnapshot> {
  const [stats, user] = await Promise.all([
    getUserStats(userId),
    getUserById(userId),
  ]);
  return {
    currentStreak: stats?.currentStreak ?? 0,
    longestStreak: stats?.longestStreak ?? 0,
    freezeCards: user?.freezeCards ?? 0,
    shieldCount: user?.shieldCount ?? 0,
    lastActiveDate: stats?.lastActiveDate ?? new Date().toISOString(),
  };
}
