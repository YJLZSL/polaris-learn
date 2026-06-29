import { getAll } from '@/lib/db/indexeddb';
import { STORES } from '@/lib/db/schema';
import type { UserStats } from './gamification.repository';

export interface LeaderboardEntry {
  userId: string;
  name: string;
  avatar?: string;
  xp: number;
  level: number;
  currentStreak: number;
  rank: number;
}

export async function getTopUsers(limit: number = 50, currentUserId?: string): Promise<{ entries: LeaderboardEntry[]; userRank?: number }> {
  // 注意：IndexedDB 是本地存储，排行榜只能基于本机用户
  // 实际产品中需要后端聚合，这里返回当前用户的虚拟排行
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
    const idx = sorted.findIndex(s => s.userId === currentUserId);
    if (idx >= 0) userRank = idx + 1;
  }
  return { entries, userRank };
}

export async function getUserRank(userId: string): Promise<number | undefined> {
  const { userRank } = await getTopUsers(50, userId);
  return userRank;
}
