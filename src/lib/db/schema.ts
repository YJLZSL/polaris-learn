export const DB_NAME = 'polaris_learn';
// Polaris V2: 升级到 v4，移除商业游戏化 store（currency_transactions/daily_quests/
// badges/user_badges/streak_records）。USER_STATS 保留以存储知识掌握度记录。
// upgrade 回调按 objectStoreNames 兜底创建/删除，对 v1-v3 既有库平滑迁移。
export const DB_VERSION = 4;

export const STORES = {
  USERS: 'users',
  SESSIONS: 'sessions',
  PRACTICE_RECORDS: 'practice_records',
  ERROR_NOTES: 'error_notes',
  KNOWLEDGE_POINTS: 'knowledge_points',
  AI_CONVERSATIONS: 'ai_conversations',
  SUBJECTS: 'subjects',
  QUESTIONS: 'questions',
  // Polaris V2: USER_STATS 仅保留知识掌握度记录（key 前缀 mastery::），
  // XP/level/streak 字段随 gamification.repository 一并废弃。
  USER_STATS: 'user_stats',
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
  // Polaris V2: error_notes 增加 SM-2 间隔重复字段（IndexedDB schema-less，
  // 字段直接写入记录，无需在此声明；仅 dueDate 建索引以支持"到期错题"查询）：
  //   ease (默认 2.5)、interval (默认 0)、repetitions (默认 0)、dueDate (默认当前时间)
  [STORES.ERROR_NOTES]: {
    keyPath: 'id',
    indexes: [
      { name: 'userId', keyPath: 'userId' },
      { name: 'subject', keyPath: 'subject' },
      { name: 'status', keyPath: 'status' },  // 'new' | 'reviewing' | 'mastered'
      { name: 'dueDate', keyPath: 'dueDate' },  // SM-2 到期日
    ],
  },
  [STORES.KNOWLEDGE_POINTS]: {
    keyPath: 'id',
    indexes: [
      { name: 'subject', keyPath: 'subject' },
      { name: 'gradeLevel', keyPath: 'gradeLevel' },
    ],
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
  // Polaris V2: USER_STATS 仅保留知识掌握度记录（复合 key 前缀 mastery::）。
  [STORES.USER_STATS]: {
    keyPath: 'userId',
    indexes: [],
  },
};
