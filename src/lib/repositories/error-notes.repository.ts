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
