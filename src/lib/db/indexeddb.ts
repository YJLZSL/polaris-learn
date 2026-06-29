import { openDB, type IDBPDatabase } from 'idb';
import { DB_NAME, DB_VERSION, STORE_SCHEMAS } from './schema';

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getDB(): Promise<IDBPDatabase> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB not available in SSR'));
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        for (const [storeName, schema] of Object.entries(STORE_SCHEMAS)) {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: schema.keyPath });
            for (const idx of schema.indexes) {
              store.createIndex(idx.name, idx.keyPath, idx.options);
            }
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
