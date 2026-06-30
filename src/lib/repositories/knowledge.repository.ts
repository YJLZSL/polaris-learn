import { getAll, queryByIndex, put, getByKey } from '@/lib/db/indexeddb';
import { STORES } from '@/lib/db/schema';
import { addStarlight } from './currency.repository';
import { updateQuestProgress } from './quest.repository';

export interface KnowledgePoint {
  id: string;
  subject: string;
  gradeLevel: string;
  title: string;
  description: string;
  parentId?: string;
  order: number;
}

export interface KnowledgeMastery {
  userId: string;
  knowledgePointId: string;
  mastery: number; // 0-100
  lastPracticedAt?: string;
  updatedAt: string;
  /** Task 19.7: 首次达到满掌握(100)时已发放星光奖励的幂等标志 */
  masteryRewardClaimed?: boolean;
  /** Task 19.4: 首次达到掌握阈值(70)时已上报 complete_node 任务的幂等标志 */
  completeNodeReported?: boolean;
}

/**
 * Task 10.6/10.7: 衰减相关常量
 * - DECAY_THRESHOLD_DAYS: 超过此天数未复习视为衰减
 * - DECAYED_MASTERY_LEVEL: 衰减后回退到的掌握度
 * - MASTERY_THRESHOLD: 已掌握节点阈值
 */
const DECAY_THRESHOLD_DAYS = 7;
const DECAYED_MASTERY_LEVEL = 80;
const MASTERY_THRESHOLD = 70;

/**
 * USER_STATS store 的 keyPath 是 `userId`，与 gamification.repository 的 UserStats 共享。
 * 为避免掌握度记录与用户统计记录主键冲突，使用复合 key 作为 `userId` 字段值，
 * 真实 userId 保存在 `ownerUserId` 字段中。
 */
const MASTERY_KEY_PREFIX = 'mastery::';

interface StoredMasteryRecord extends KnowledgeMastery {
  /** 复合主键（写入 USER_STATS 的 keyPath 字段） */
  userId: string;
  /** 真实 userId（用于查询过滤） */
  ownerUserId: string;
}

function makeMasteryStorageKey(userId: string, knowledgePointId: string): string {
  return `${MASTERY_KEY_PREFIX}${userId}::${knowledgePointId}`;
}

export async function getKnowledgePoints(filters?: { subject?: string; gradeLevel?: string }): Promise<KnowledgePoint[]> {
  let points = await getAll<KnowledgePoint>(STORES.KNOWLEDGE_POINTS);
  if (filters?.subject) points = points.filter(p => p.subject === filters.subject);
  if (filters?.gradeLevel) points = points.filter(p => p.gradeLevel === filters.gradeLevel);
  return points.sort((a, b) => a.order - b.order);
}

export async function getKnowledgePointById(id: string): Promise<KnowledgePoint | undefined> {
  return getByKey<KnowledgePoint>(STORES.KNOWLEDGE_POINTS, id);
}

export async function updateMastery(mastery: KnowledgeMastery): Promise<void> {
  mastery.updatedAt = new Date().toISOString();
  const storageKey = makeMasteryStorageKey(mastery.userId, mastery.knowledgePointId);

  // Task 19.4/19.7: 读取旧记录以检测阈值跨越并保留幂等标志
  const existing = await getByKey<StoredMasteryRecord>(STORES.USER_STATS, storageKey);
  const prevMastery = existing?.mastery ?? 0;
  const prevRewardClaimed = existing?.masteryRewardClaimed ?? false;
  const prevNodeReported = existing?.completeNodeReported ?? false;

  // 合并旧标志，避免调用方未传时丢失
  if (prevRewardClaimed) mastery.masteryRewardClaimed = true;
  if (prevNodeReported) mastery.completeNodeReported = true;

  // Task 19.4: 首次达到掌握阈值(70) → 上报 complete_node 任务（幂等）
  if (
    prevMastery < MASTERY_THRESHOLD &&
    mastery.mastery >= MASTERY_THRESHOLD &&
    !mastery.completeNodeReported
  ) {
    mastery.completeNodeReported = true;
    try {
      await updateQuestProgress(mastery.userId, 'complete_node', 1);
    } catch {
      /* 静默失败：不阻塞掌握度写入 */
    }
  }

  // Task 19.7: 首次达到满掌握(100) → 发放 10 星光（幂等）
  if (
    prevMastery < 100 &&
    mastery.mastery >= 100 &&
    !mastery.masteryRewardClaimed
  ) {
    mastery.masteryRewardClaimed = true;
    try {
      await addStarlight(mastery.userId, 10, '知识节点掌握');
    } catch {
      /* 静默失败：不阻塞掌握度写入 */
    }
  }

  const stored: StoredMasteryRecord = {
    ...mastery,
    userId: storageKey,
    ownerUserId: mastery.userId,
  };
  await put(STORES.USER_STATS, stored);
}

/**
 * Task 19.3: 提升指定学科根知识点（无 parentId 的首个节点）的掌握度。
 *
 * 用于 AI 老师对话达到 reflection 阶段时，给该 subject 根节点 mastery +delta（封顶 100）。
 * 若该学科无根节点，回退到按 order 排序的首个节点。
 *
 * @param delta 0-100 刻度下的增量（如 5 表示 +5%）
 */
export async function bumpSubjectRootMastery(
  userId: string,
  subject: string,
  delta: number
): Promise<void> {
  if (!Number.isFinite(delta) || delta <= 0) return;
  const points = await getKnowledgePoints({ subject });
  if (points.length === 0) return;
  const root = points.find((p) => !p.parentId) ?? points[0];

  const all = await getUserMastery(userId);
  const prev = all.find((m) => m.knowledgePointId === root.id);
  const prevMastery = prev?.mastery ?? 0;
  const nextMastery = Math.min(100, Math.max(0, prevMastery + delta));
  if (nextMastery === prevMastery) return;

  await updateMastery({
    userId,
    knowledgePointId: root.id,
    mastery: nextMastery,
    lastPracticedAt: prev?.lastPracticedAt,
    updatedAt: new Date().toISOString(),
    masteryRewardClaimed: prev?.masteryRewardClaimed,
    completeNodeReported: prev?.completeNodeReported,
  });
}

/**
 * 读取用户全部知识点掌握度。
 * 实现：扫描 USER_STATS 中所有以 `mastery::<userId>::` 为前缀的记录。
 */
export async function getUserMastery(userId: string): Promise<KnowledgeMastery[]> {
  const all = await getAll<StoredMasteryRecord & { ownerUserId?: string; knowledgePointId?: string }>(STORES.USER_STATS);
  return all
    .filter((rec) => rec.ownerUserId === userId && Boolean(rec.knowledgePointId))
    .map((rec) => ({
      userId: rec.ownerUserId,
      knowledgePointId: rec.knowledgePointId as string,
      mastery: rec.mastery ?? 0,
      lastPracticedAt: rec.lastPracticedAt,
      updatedAt: rec.updatedAt,
      masteryRewardClaimed: rec.masteryRewardClaimed,
      completeNodeReported: rec.completeNodeReported,
    }));
}

/**
 * Task 10.7: 查询超期未复习的已掌握节点
 *
 * 规则：
 * - mastery >= 70（已掌握）
 * - lastPracticedAt 早于 daysThreshold 天前（或缺失但 mastery>=70 视为异常数据，也返回）
 *
 * @param daysThreshold 默认 7 天
 */
export async function getDecayedNodes(
  userId: string,
  daysThreshold: number = DECAY_THRESHOLD_DAYS
): Promise<KnowledgeMastery[]> {
  const all = await getUserMastery(userId);
  const now = Date.now();
  const thresholdMs = daysThreshold * 24 * 60 * 60 * 1000;
  return all.filter((m) => {
    if (m.mastery < MASTERY_THRESHOLD) return false;
    if (!m.lastPracticedAt) return true;
    const lastTs = new Date(m.lastPracticedAt).getTime();
    if (Number.isNaN(lastTs)) return true;
    return now - lastTs > thresholdMs;
  });
}

/**
 * Task 10.6: 对超期已掌握节点应用进度衰减
 *
 * 仅当 mastery > DECAYED_MASTERY_LEVEL 时才回退到 80%，
 * 避免对已处于 70-80% 的节点意外"提升"掌握度。
 * lastPracticedAt 保持不变（用户重新练习后由调用方刷新）。
 *
 * @returns 被衰减的节点数量
 */
export async function applyMasteryDecay(
  userId: string,
  daysThreshold: number = DECAY_THRESHOLD_DAYS
): Promise<number> {
  const decayed = await getDecayedNodes(userId, daysThreshold);
  let count = 0;
  for (const m of decayed) {
    if (m.mastery > DECAYED_MASTERY_LEVEL) {
      await updateMastery({
        ...m,
        mastery: DECAYED_MASTERY_LEVEL,
      });
      count++;
    }
  }
  return count;
}

/** 导出衰减常量供 UI 层判断使用 */
export const DECAY_CONFIG = {
  thresholdDays: DECAY_THRESHOLD_DAYS,
  decayedMasteryLevel: DECAYED_MASTERY_LEVEL,
  masteryThreshold: MASTERY_THRESHOLD,
} as const;

// 保持向后兼容（旧调用方仍可使用 queryByIndex 导入）
export { queryByIndex };
