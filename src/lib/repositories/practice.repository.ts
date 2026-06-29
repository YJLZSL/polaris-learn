import { getAll, queryByIndex, put, getByKey } from '@/lib/db/indexeddb';
import { STORES } from '@/lib/db/schema';

export interface PracticeRecord {
  id: string;
  userId: string;
  questionId: string;
  subject: string;
  difficulty: number;
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer: string;
  timeSpentMs: number;
  createdAt: string;
}

export interface Question {
  id: string;
  subject: string;
  difficulty: number;
  gradeLevel: string;
  type: 'single_choice' | 'multiple_choice' | 'true_false';
  content: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  knowledgePointId?: string;
}

export async function getQuestions(filters?: { subject?: string; difficulty?: number; gradeLevel?: string; limit?: number }): Promise<Question[]> {
  let questions = await getAll<Question>(STORES.QUESTIONS);
  if (filters?.subject) questions = questions.filter(q => q.subject === filters.subject);
  if (filters?.difficulty) questions = questions.filter(q => q.difficulty === filters.difficulty);
  if (filters?.gradeLevel) questions = questions.filter(q => q.gradeLevel === filters.gradeLevel);
  if (filters?.limit) questions = questions.slice(0, filters.limit);
  return questions;
}

export async function getQuestionById(id: string): Promise<Question | undefined> {
  return getByKey<Question>(STORES.QUESTIONS, id);
}

export async function savePracticeRecord(record: PracticeRecord): Promise<void> {
  await put(STORES.PRACTICE_RECORDS, record);
}

export async function getUserPracticeRecords(userId: string): Promise<PracticeRecord[]> {
  return queryByIndex<PracticeRecord>(STORES.PRACTICE_RECORDS, 'userId', userId);
}

export async function getPracticeStats(userId: string): Promise<{ total: number; correct: number; accuracy: number }> {
  const records = await getUserPracticeRecords(userId);
  const total = records.length;
  const correct = records.filter(r => r.isCorrect).length;
  const accuracy = total > 0 ? correct / total : 0;
  return { total, correct, accuracy };
}
