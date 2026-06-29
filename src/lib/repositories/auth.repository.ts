import { getByKey, put, deleteByKey, queryByIndex } from '@/lib/db/indexeddb';
import { STORES } from '@/lib/db/schema';

export interface Session {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

const SESSION_TTL_DAYS = 30;

export async function createSession(userId: string): Promise<Session> {
  const token = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  const session: Session = {
    token,
    userId,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
  await put(STORES.SESSIONS, session);
  return session;
}

export async function getSession(token: string): Promise<Session | undefined> {
  const session = await getByKey<Session>(STORES.SESSIONS, token);
  if (session && new Date(session.expiresAt) > new Date()) {
    return session;
  }
  if (session) {
    await deleteByKey(STORES.SESSIONS, token);
  }
  return undefined;
}

export async function deleteSession(token: string): Promise<void> {
  await deleteByKey(STORES.SESSIONS, token);
}

export async function deleteAllUserSessions(userId: string): Promise<void> {
  const sessions = await queryByIndex<Session>(STORES.SESSIONS, 'userId', userId);
  await Promise.all(sessions.map(s => deleteByKey(STORES.SESSIONS, s.token)));
}
