import { getAll, queryByIndex, put, getByKey } from '@/lib/db/indexeddb';
import { STORES } from '@/lib/db/schema';

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
  if (today !== lastDate) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (lastDate === yesterday) {
      stats.currentStreak += 1;
    } else {
      stats.currentStreak = 1;
    }
    stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
    stats.lastActiveDate = new Date().toISOString();
    await updateUserStats(stats);
  }
  return stats;
}
