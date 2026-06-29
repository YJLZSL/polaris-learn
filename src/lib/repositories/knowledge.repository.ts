import { getAll, queryByIndex, put, getByKey } from '@/lib/db/indexeddb';
import { STORES } from '@/lib/db/schema';

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
  await put(STORES.USER_STATS, { ...mastery, id: `${mastery.userId}_${mastery.knowledgePointId}` });
  // 实际上 mastery 应该存到单独的 store，简化处理：用 USER_STATS store 复合 key
}

export async function getUserMastery(userId: string): Promise<KnowledgeMastery[]> {
  // 简化：返回空数组，Phase 5 实现
  return [];
}
