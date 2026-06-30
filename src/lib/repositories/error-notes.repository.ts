import { queryByIndex, put, deleteByKey, getByKey } from '@/lib/db/indexeddb';
import { STORES } from '@/lib/db/schema';

export interface ErrorNote {
  id: string;
  userId: string;
  questionId: string;
  subject: string;
  userAnswer: string;
  correctAnswer: string;
  status: 'new' | 'reviewing' | 'mastered';
  reviewCount: number;
  lastReviewedAt?: string;
  createdAt: string;
}

export async function addErrorNote(note: ErrorNote): Promise<void> {
  await put(STORES.ERROR_NOTES, note);
}

export async function getErrorNotes(userId: string, filters?: { subject?: string; status?: string }): Promise<ErrorNote[]> {
  let notes = await queryByIndex<ErrorNote>(STORES.ERROR_NOTES, 'userId', userId);
  if (filters?.subject) notes = notes.filter(n => n.subject === filters.subject);
  if (filters?.status) notes = notes.filter(n => n.status === filters.status);
  return notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Task 11.3: 按薄弱度排序取题（用于错题消灭战）
 *
 * 排序规则（越靠前越薄弱）：
 * 1. status='new' 优先于 'reviewing' 优先于 'mastered'
 * 2. reviewCount 越少越薄弱（练习次数少 = 更不熟悉）
 * 3. createdAt 越早越薄弱（长期未消除）
 *
 * @param limit 最多返回的题数（默认 10）
 * @param subject 可选学科过滤
 */
export async function getErrorNotesByWeakness(
  userId: string,
  limit: number = 10,
  subject?: string
): Promise<ErrorNote[]> {
  let notes = await queryByIndex<ErrorNote>(STORES.ERROR_NOTES, 'userId', userId);
  // 仅取未消除的错题（消灭战目标是 active 错题）
  notes = notes.filter(n => n.status !== 'mastered');
  if (subject) notes = notes.filter(n => n.subject === subject);

  const statusWeight: Record<ErrorNote['status'], number> = {
    new: 0,
    reviewing: 1,
    mastered: 2,
  };

  notes.sort((a, b) => {
    // 1. status 权重
    const sw = statusWeight[a.status] - statusWeight[b.status];
    if (sw !== 0) return sw;
    // 2. reviewCount 升序（少 = 薄弱）
    const rc = (a.reviewCount ?? 0) - (b.reviewCount ?? 0);
    if (rc !== 0) return rc;
    // 3. createdAt 升序（早 = 薄弱）
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return notes.slice(0, limit);
}

export async function getErrorNoteById(id: string): Promise<ErrorNote | undefined> {
  return getByKey<ErrorNote>(STORES.ERROR_NOTES, id);
}

export async function removeErrorNote(id: string): Promise<void> {
  await deleteByKey(STORES.ERROR_NOTES, id);
}

export async function markReviewed(id: string, mastered: boolean): Promise<void> {
  const note = await getErrorNoteById(id);
  if (note) {
    note.reviewCount += 1;
    note.lastReviewedAt = new Date().toISOString();
    note.status = mastered ? 'mastered' : 'reviewing';
    await put(STORES.ERROR_NOTES, note);
  }
}
