import { openDB, type IDBPDatabase } from 'idb';
import { DB_NAME, DB_VERSION, STORE_SCHEMAS } from './schema';

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getDB(): Promise<IDBPDatabase> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB not available in SSR'));
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, _oldVersion, _newVersion, transaction) {
        // Polaris V2: 删除商业游戏化 store（v1-v3 既有库迁移）
        const deprecatedStores = [
          'currency_transactions',  // 双货币流水
          'daily_quests',           // 每日任务
          'badges',                 // 徽章
          'user_badges',            // 用户徽章
          'streak_records',         // 连胜记录
          'leaderboard',            // 排行榜（v1-v3 未实际使用，兜底清理）
        ];
        for (const name of deprecatedStores) {
          if (db.objectStoreNames.contains(name)) {
            db.deleteObjectStore(name);
          }
        }

        // 按 STORE_SCHEMAS 兜底创建缺失的 store 与索引
        for (const [storeName, schema] of Object.entries(STORE_SCHEMAS)) {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: schema.keyPath });
            for (const idx of schema.indexes) {
              store.createIndex(idx.name, idx.keyPath, idx.options);
            }
          }
        }

        // error_notes SM-2 间隔重复字段（ease/interval/repetitions/dueDate）为 schema-less
        // 数据字段，IndexedDB 无需迁移记录结构；仅为既有 error_notes store 补建 dueDate
        // 索引以支持"到期错题"查询（新建库已在上一步随 STORE_SCHEMAS 创建）。
        if (db.objectStoreNames.contains('error_notes')) {
          const store = transaction.objectStore('error_notes');
          if (!store.indexNames.contains('dueDate')) {
            store.createIndex('dueDate', 'dueDate');
          }
        }
      },
    });
  }
  return dbPromise;
}

export async function getAll<T>(store: string): Promise<T[]> {
  const db = await getDB();
  return db.getAll(store);
}

export async function getByKey<T>(store: string, key: IDBValidKey): Promise<T | undefined> {
  const db = await getDB();
  return db.get(store, key);
}

export async function put<T>(store: string, value: T): Promise<IDBValidKey> {
  const db = await getDB();
  return db.put(store, value);
}

export async function putMany<T>(store: string, values: T[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(store, 'readwrite');
  await Promise.all(values.map(v => tx.store.put(v)));
  await tx.done;
}

export async function deleteByKey(store: string, key: IDBValidKey): Promise<void> {
  const db = await getDB();
  await db.delete(store, key);
}

export async function queryByIndex<T>(store: string, index: string, value: IDBValidKey): Promise<T[]> {
  const db = await getDB();
  return db.getAllFromIndex(store, index, value);
}

export async function queryByIndexFirst<T>(store: string, index: string, value: IDBValidKey): Promise<T | undefined> {
  const db = await getDB();
  return db.getFromIndex(store, index, value);
}

export async function clearStore(store: string): Promise<void> {
  const db = await getDB();
  await db.clear(store);
}

export async function count(store: string): Promise<number> {
  const db = await getDB();
  return db.count(store);
}
