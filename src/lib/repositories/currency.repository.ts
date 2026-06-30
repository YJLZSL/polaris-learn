/**
 * Task 15.1: 双货币 repository
 *
 * 设计原则（避免反模式）：
 * - 星光（starlight）：日常学习产出的常见货币，锚定 mastery 进步与每日任务
 * - 晶核（crystal）：成就/里程碑产出的稀有货币，避免高频变动奖励
 * - 货币产出场景：每日任务完成、知识节点掌握、错题消灭、专注时长达成
 * - 货币消耗场景：购买冻结卡、解锁特殊内容、个性化装扮（仅占位接口）
 *
 * 余额存在 User 表（starlight/crystal 字段），流水存 currency_transactions store。
 */

import { getByKey, put, queryByIndex } from '@/lib/db/indexeddb';
import { STORES } from '@/lib/db/schema';
import { getUserById, updateUser, type User } from './user.repository';

export type CurrencyType = 'starlight' | 'crystal';
export type TransactionKind = 'earn' | 'spend';

export interface CurrencyBalance {
  starlight: number;
  crystal: number;
}

export interface Transaction {
  id: string;
  userId: string;
  currency: CurrencyType;
  kind: TransactionKind;
  /** 正数：产出或消耗的绝对量 */
  amount: number;
  reason: string;
  /** 该币种本次流水后的余额，便于审计与回放 */
  balanceAfter: number;
  createdAt: string;
}

const ZERO_BALANCE: CurrencyBalance = { starlight: 0, crystal: 0 };

function balanceFromUser(user: User | undefined): CurrencyBalance {
  if (!user) return { ...ZERO_BALANCE };
  return {
    starlight: Math.max(0, user.starlight ?? 0),
    crystal: Math.max(0, user.crystal ?? 0),
  };
}

async function writeTransaction(
  userId: string,
  currency: CurrencyType,
  kind: TransactionKind,
  amount: number,
  reason: string,
  balanceAfter: number
): Promise<void> {
  const tx: Transaction = {
    id: `${userId}_${currency}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId,
    currency,
    kind,
    amount,
    reason,
    balanceAfter,
    createdAt: new Date().toISOString(),
  };
  await put(STORES.CURRENCY_TRANSACTIONS, tx);
}

/**
 * 读取当前用户的双货币余额。用户不存在时返回 0/0。
 */
export async function getBalance(userId: string): Promise<CurrencyBalance> {
  const user = await getUserById(userId);
  return balanceFromUser(user);
}

/**
 * 增加星光（产出）。amount 必须为正数。
 */
export async function addStarlight(
  userId: string,
  amount: number,
  reason: string
): Promise<void> {
  if (!Number.isFinite(amount) || amount <= 0) return;
  const user = await getUserById(userId);
  if (!user) return;
  const next = Math.max(0, (user.starlight ?? 0) + amount);
  user.starlight = next;
  await updateUser(user);
  await writeTransaction(userId, 'starlight', 'earn', amount, reason, next);
}

/**
 * 增加晶核（产出，稀有）。amount 必须为正数。
 */
export async function addCrystal(
  userId: string,
  amount: number,
  reason: string
): Promise<void> {
  if (!Number.isFinite(amount) || amount <= 0) return;
  const user = await getUserById(userId);
  if (!user) return;
  const next = Math.max(0, (user.crystal ?? 0) + amount);
  user.crystal = next;
  await updateUser(user);
  await writeTransaction(userId, 'crystal', 'earn', amount, reason, next);
}

/**
 * 消耗星光。余额不足返回 false，不扣减不写流水。
 */
export async function spendStarlight(
  userId: string,
  amount: number,
  reason: string
): Promise<boolean> {
  if (!Number.isFinite(amount) || amount <= 0) return false;
  const user = await getUserById(userId);
  if (!user) return false;
  const current = user.starlight ?? 0;
  if (current < amount) return false;
  const next = current - amount;
  user.starlight = next;
  await updateUser(user);
  await writeTransaction(userId, 'starlight', 'spend', amount, reason, next);
  return true;
}

/**
 * 消耗晶核。余额不足返回 false。
 */
export async function spendCrystal(
  userId: string,
  amount: number,
  reason: string
): Promise<boolean> {
  if (!Number.isFinite(amount) || amount <= 0) return false;
  const user = await getUserById(userId);
  if (!user) return false;
  const current = user.crystal ?? 0;
  if (current < amount) return false;
  const next = current - amount;
  user.crystal = next;
  await updateUser(user);
  await writeTransaction(userId, 'crystal', 'spend', amount, reason, next);
  return true;
}

/**
 * 拉取用户最近 N 条货币流水（默认 50），按时间倒序。
 */
export async function getTransactions(
  userId: string,
  limit: number = 50
): Promise<Transaction[]> {
  const all = await queryByIndex<Transaction>(
    STORES.CURRENCY_TRANSACTIONS,
    'userId',
    userId
  );
  return all
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, Math.max(0, limit));
}

/**
 * Task 15.4/15.5 内部辅助：调整冻结卡数量（可正可负）。
 * 不写货币流水（冻结卡不是货币，是容错道具）。
 */
export async function adjustFreezeCards(
  userId: string,
  delta: number
): Promise<number> {
  if (!Number.isFinite(delta) || delta === 0) {
    const user = await getUserById(userId);
    return user?.freezeCards ?? 0;
  }
  const user = await getUserById(userId);
  if (!user) return 0;
  const next = Math.max(0, (user.freezeCards ?? 0) + delta);
  user.freezeCards = next;
  await updateUser(user);
  return next;
}

/**
 * Task 15.5 内部辅助：调整保护盾数量。
 */
export async function adjustShields(
  userId: string,
  delta: number
): Promise<number> {
  if (!Number.isFinite(delta) || delta === 0) {
    const user = await getUserById(userId);
    return user?.shieldCount ?? 0;
  }
  const user = await getUserById(userId);
  if (!user) return 0;
  const next = Math.max(0, (user.shieldCount ?? 0) + delta);
  user.shieldCount = next;
  await updateUser(user);
  return next;
}

/**
 * 直接读取用户表中的道具数量（避免多次调用 getUserById）。
 */
export async function getItems(
  userId: string
): Promise<{ freezeCards: number; shieldCount: number }> {
  const user = await getByKey<User>(STORES.USERS, userId);
  return {
    freezeCards: user?.freezeCards ?? 0,
    shieldCount: user?.shieldCount ?? 0,
  };
}
