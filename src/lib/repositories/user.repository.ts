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
  createdAt: string;
  updatedAt: string;
}

export async function createUser(user: User): Promise<void> {
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
