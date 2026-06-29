import { createUser, getUserByEmail, updateUser, getUserById, type User } from '@/lib/repositories/user.repository';
import { createSession, getSession, deleteSession, deleteAllUserSessions } from '@/lib/repositories/auth.repository';
import { getLearningModeConfig } from '@/lib/learning-modes';

const SESSION_TOKEN_KEY = 'polaris_session_token';
const PBKDF2_ITERATIONS = 100000;

// Web Crypto API 工具
async function generateSalt(): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const saltBytes = encoder.encode(salt);
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  return Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// 注册
export async function register(email: string, password: string, learningMode: string, name: string): Promise<User> {
  const existing = await getUserByEmail(email);
  if (existing) {
    throw new Error('该邮箱已被注册');
  }
  // 验证 learningMode 合法性
  const modeConfig = getLearningModeConfig(learningMode);
  if (!modeConfig) {
    throw new Error('无效的学习模式');
  }
  const salt = await generateSalt();
  const passwordHash = await hashPassword(password, salt);
  const now = new Date().toISOString();
  const user: User = {
    id: crypto.randomUUID(),
    email,
    passwordHash,
    salt,
    name,
    learningMode,
    grade: modeConfig.defaultGrade,
    createdAt: now,
    updatedAt: now,
  };
  await createUser(user);
  // 创建 session
  const session = await createSession(user.id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_TOKEN_KEY, session.token);
  }
  return user;
}

// 登录
export async function login(email: string, password: string): Promise<User> {
  const user = await getUserByEmail(email);
  if (!user) {
    throw new Error('邮箱或密码错误');
  }
  const hash = await hashPassword(password, user.salt);
  if (hash !== user.passwordHash) {
    throw new Error('邮箱或密码错误');
  }
  const session = await createSession(user.id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_TOKEN_KEY, session.token);
  }
  return user;
}

// 退出登录
export async function logout(): Promise<void> {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(SESSION_TOKEN_KEY);
    if (token) {
      await deleteSession(token);
      localStorage.removeItem(SESSION_TOKEN_KEY);
    }
  }
}

// 修改密码
export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('未登录');
  }
  const oldHash = await hashPassword(oldPassword, user.salt);
  if (oldHash !== user.passwordHash) {
    throw new Error('旧密码错误');
  }
  const newSalt = await generateSalt();
  const newHash = await hashPassword(newPassword, newSalt);
  user.salt = newSalt;
  user.passwordHash = newHash;
  await updateUser(user);
  // 删除所有旧 session，创建新 session
  await deleteAllUserSessions(user.id);
  const session = await createSession(user.id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_TOKEN_KEY, session.token);
  }
}

// 获取当前用户
export async function getCurrentUser(): Promise<User | null> {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem(SESSION_TOKEN_KEY);
  if (!token) return null;
  const session = await getSession(token);
  if (!session) {
    localStorage.removeItem(SESSION_TOKEN_KEY);
    return null;
  }
  const user = await getUserById(session.userId);
  return user || null;
}

// 检查是否登录
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}
