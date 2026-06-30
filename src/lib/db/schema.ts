export const DB_NAME = 'polaris_learn';
// Task 15.1: 升级到 v2，新增 currency_transactions store。
// Task 12.1: 升级到 v3，新增 daily_quests store。
// upgrade 回调按 objectStoreNames 兜底创建，对 v1/v2 既有库平滑迁移。
export const DB_VERSION = 3;

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
  CURRENCY_TRANSACTIONS: 'currency_transactions',  // Task 15.1: 双货币流水
  DAILY_QUESTS: 'daily_quests',  // Task 12.1: 每日任务
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
  // Task 15.1: 货币流水，按 userId 索引；自增 id 由调用方拼装时间戳。
  [STORES.CURRENCY_TRANSACTIONS]: {
    keyPath: 'id',
    indexes: [
      { name: 'userId', keyPath: 'userId' },
      { name: 'createdAt', keyPath: 'createdAt' },
      { name: 'currency', keyPath: 'currency' },
    ],
  },
  // Task 12.1: 每日任务。复合键 `${userId}_${date}_${templateId}` 保证唯一。
  // userId 索引按用户查询当日任务；date 索引便于跨用户统计与清理。
  [STORES.DAILY_QUESTS]: {
    keyPath: 'id',
    indexes: [
      { name: 'userId', keyPath: 'userId' },
      { name: 'date', keyPath: 'date' },
      { name: 'templateId', keyPath: 'templateId' },
    ],
  },
};
