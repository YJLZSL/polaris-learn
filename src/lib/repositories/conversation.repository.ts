import { queryByIndex, put, deleteByKey, getAll } from '@/lib/db/indexeddb';
import { STORES } from '@/lib/db/schema';

export interface AIConversation {
  id: string;
  userId: string;
  subject: string;
  title: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }>;
  createdAt: string;
  updatedAt: string;
}

export async function saveConversation(conv: AIConversation): Promise<void> {
  conv.updatedAt = new Date().toISOString();
  await put(STORES.AI_CONVERSATIONS, conv);
}

export async function getConversations(userId: string): Promise<AIConversation[]> {
  const convs = await queryByIndex<AIConversation>(STORES.AI_CONVERSATIONS, 'userId', userId);
  return convs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function getConversationById(id: string): Promise<AIConversation | undefined> {
  const all = await getAll<AIConversation>(STORES.AI_CONVERSATIONS);
  return all.find(c => c.id === id);
}

export async function deleteConversation(id: string): Promise<void> {
  await deleteByKey(STORES.AI_CONVERSATIONS, id);
}
