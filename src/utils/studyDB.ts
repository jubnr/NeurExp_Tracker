const DB_NAME = 'neurexp-store';
const STORE = 'kv';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { dbPromise = null; reject(req.error); };
  });
  return dbPromise;
}

export async function idbGet(key: string): Promise<string | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function idbSet(key: string, value: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbRemove(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Zustand-compatible async storage adapter backed by IndexedDB.
 * On first getItem call, transparently migrates any existing data
 * from localStorage to IndexedDB and removes the localStorage entry.
 */
export const idbStorage = {
  getItem: async (key: string): Promise<string | null> => {
    const legacy = localStorage.getItem(key);
    if (legacy !== null) {
      await idbSet(key, legacy);
      localStorage.removeItem(key);
      return legacy;
    }
    return idbGet(key);
  },
  setItem: (key: string, value: string): Promise<void> => idbSet(key, value),
  removeItem: (key: string): Promise<void> => idbRemove(key),
};
