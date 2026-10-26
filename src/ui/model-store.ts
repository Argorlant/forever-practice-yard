// A player's own models, kept in this browser only (IndexedDB): a character
// per class, the druid's forms, the dummy and the yard. Nothing is uploaded.
// Every call fails soft (private windows, blocked storage): the yard then
// keeps its own models.
export interface StoredModel {
  /** The files as loaded: a .glb, a .gltf with its .bin and textures, or what a map export's zone uses (paths kept). */
  files: { name: string; type?: string; data: Blob }[];
  label: string;
  /** Quarter turns to face the way the yard expects. */
  rotation: number;
  enabled: boolean;
  /** A place: the spot of it where the dummies stand, in the model's own units. */
  anchor?: number[];
}

const DB = 'fpy-own-models';
const STORE = 'models';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function getModel(key: string): Promise<StoredModel | null> {
  try { return (await run<StoredModel | undefined>('readonly', (s) => s.get(key))) ?? null; } catch { return null; }
}

export async function putModel(key: string, model: StoredModel): Promise<boolean> {
  try { await run('readwrite', (s) => s.put(model, key)); return true; } catch { return false; }
}

export async function deleteModel(key: string): Promise<void> {
  try { await run('readwrite', (s) => s.delete(key)); } catch { /* nothing kept */ }
}
