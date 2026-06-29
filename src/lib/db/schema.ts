export const DB_NAME = 'polaris_learn';
export const DB_VERSION = 1;

export const STORES = {
  USERS: 'users',
  SESSIONS: 'sessions',
  PRACTICE_RECORDS: 'practice_records',
  ERROR_NOTES: 'error_notes',
  KNOWLEDGE_POINTS: 'knowledge_points',
  BADGES: 'badges',
  USER_BADGES: 'user_badges',
  STREAK_RECORDS: 'streak_records',
  AI_CONVERSATIONS: 'ai_conversations',
  SUBJECTS: 'subjects',
  QUESTIONS: 'questions',
  USER_STATS: 'user_stats',  // XP, level, total study time etc
} as const;

export type StoreName = typeof STORES[keyof typeof STORES];

export interface IndexDef {
  name: string;
  keyPath: string;
  options?: IDBIndexParameters;
}

export interface StoreSchema {
  keyPath: string;
  indexes: IndexDef[];
}

// 每个 store 的 schema 定义
export const STORE_SCHEMAS: Record<StoreName, StoreSchema> = {
  [STORES.USERS]: {
    keyPath: 'id',
    indexes: [
      { name: 'email', keyPath: 'email', options: { unique: true } },
      { name: 'learningMode', keyPath: 'learningMode' },
    ],
  },
  [STORES.SESSIONS]: {
    keyPath: 'token',
    indexes: [
      { name: 'userId', keyPath: 'userId' },
      { name: 'expiresAt', keyPath: 'expiresAt' },
    ],
  },
  [STORES.PRACTICE_RECORDS]: {
    keyPath: 'id',
    indexes: [
      { name: 'userId', keyPath: 'userId' },
      { name: 'subject', keyPath: 'subject' },
      { name: 'questionId', keyPath: 'questionId' },
      { name: 'createdAt', keyPath: 'createdAt' },
    ],
  },
  [STORES.ERROR_NOTES]: {
    keyPath: 'id',
    indexes: [
      { name: 'userId', keyPath: 'userId' },
      { name: 'subject', keyPath: 'subject' },
      { name: 'status', keyPath: 'status' },  // 'new' | 'reviewing' | 'mastered'
    ],
  },
  [STORES.KNOWLEDGE_POINTS]: {
    keyPath: 'id',
    indexes: [
      { name: 'subject', keyPath: 'subject' },
      { name: 'gradeLevel', keyPath: 'gradeLevel' },
    ],
  },
  [STORES.BADGES]: {
    keyPath: 'id',
    indexes: [{ name: 'category', keyPath: 'category' }],
  },
  [STORES.USER_BADGES]: {
    keyPath: 'id',
    indexes: [
      { name: 'userId', keyPath: 'userId' },
      { name: 'badgeId', keyPath: 'badgeId' },
    ],
  },
  [STORES.STREAK_RECORDS]: {
    keyPath: 'userId',
    indexes: [],
  },
  [STORES.AI_CONVERSATIONS]: {
    keyPath: 'id',
    indexes: [
      { name: 'userId', keyPath: 'userId' },
      { name: 'createdAt', keyPath: 'createdAt' },
    ],
  },
  [STORES.SUBJECTS]: {
    keyPath: 'id',
    indexes: [{ name: 'mode', keyPath: 'mode' }],
  },
  [STORES.QUESTIONS]: {
    keyPath: 'id',
    indexes: [
      { name: 'subject', keyPath: 'subject' },
      { name: 'difficulty', keyPath: 'difficulty' },
      { name: 'gradeLevel', keyPath: 'gradeLevel' },
    ],
  },
  [STORES.USER_STATS]: {
    keyPath: 'userId',
    indexes: [],
  },
};
