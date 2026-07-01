import { getByKey, put, queryByIndexFirst } from '@/lib/db/indexeddb';
import { STORES } from '@/lib/db/schema';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  name: string;
  learningMode: string;
  grade: string;
  avatar?: string;
  birthDate?: string;
  /**
   * Task 13.3: 累计学习时长（小时）。
   * 可选字段以兼容旧 IndexedDB 记录（schema 未变更，无索引）。
   * 默认 0，由 createUser 兜底；形态进化逻辑据此字段计算。
   */
  totalStudyHours?: number;
  /**
   * Polaris V2 已废弃：双货币余额（星光 / 晶核）。
   * 字段保留以兼容旧 IndexedDB 记录，createUser 仍兜底为 0；不再有 repository 维护流水。
   */
  starlight?: number;
  crystal?: number;
  /**
   * Task 15.3: 连胜容错道具。
   * - freezeCards: 冻结卡，断签日自动消耗 1 张以维持连胜
   * - shieldCount: 保护盾，7/30/100 天里程碑奖励发放
   */
  freezeCards?: number;
  shieldCount?: number;
  /**
   * Task 12.7: 徽章碎片（每日任务宝箱掉落）。
   * 收集到一定数量后可合成稀有徽章（合成逻辑见后续任务）。
   * type 与稀有度对应，例如：'common_ore' / 'rare_gem' / 'epic_crystal'。
   */
  badgeFragments?: { type: string; count: number }[];
  /**
   * Task 12.7: 当日宝箱是否已领取（YYYY-MM-DD）。
   * 用于幂等控制，避免重复领取每日任务全部完成后的宝箱奖励。
   */
  chestClaimedDate?: string;
  createdAt: string;
  updatedAt: string;
}

export async function createUser(user: User): Promise<void> {
  if (user.totalStudyHours === undefined) {
    user.totalStudyHours = 0;
  }
  // Task 15.3: 双货币与道具字段兜底，避免下游 ?? 0 散落
  if (user.starlight === undefined) user.starlight = 0;
  if (user.crystal === undefined) user.crystal = 0;
  if (user.freezeCards === undefined) user.freezeCards = 0;
  if (user.shieldCount === undefined) user.shieldCount = 0;
  // Task 12.7: 徽章碎片兜底为空数组
  if (user.badgeFragments === undefined) user.badgeFragments = [];
  await put(STORES.USERS, user);
}

export async function getUserById(id: string): Promise<User | undefined> {
  return getByKey<User>(STORES.USERS, id);
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  return queryByIndexFirst<User>(STORES.USERS, 'email', email);
}

export async function updateUser(user: User): Promise<void> {
  user.updatedAt = new Date().toISOString();
  await put(STORES.USERS, user);
}

export async function updateUserLearningMode(userId: string, learningMode: string): Promise<void> {
  const user = await getUserById(userId);
  if (user) {
    user.learningMode = learningMode;
    await updateUser(user);
  }
}

/**
 * Task 13.3: 更新累计学习时长。
 * 传入新的累计小时数（非增量），落库后返回更新后的 User。
 */
export async function updateStudyHours(userId: string, hours: number): Promise<void> {
  const user = await getUserById(userId);
  if (user) {
    user.totalStudyHours = Math.max(0, hours);
    await updateUser(user);
  }
}
