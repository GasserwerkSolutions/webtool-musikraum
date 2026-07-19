import { ACTIVE_DRAFT_POINTER_KEY, createDefaultDraft, normalizeDraft, type MusicraumDraft } from "./domain.js";

const DB_NAME = "musikraum-website-werkzeug";
const DB_VERSION = 1;
const STORE_DRAFTS = "drafts";
const STORE_META = "meta";

export type MetaKey = "activeDraftId" | "schemaVersion";
export type DraftLoadResult = { draft: MusicraumDraft; recovered: boolean };

export interface DraftRepository {
  getDraft(draftId: string): Promise<MusicraumDraft | null>;
  putDraft(draft: MusicraumDraft): Promise<void>;
  replaceDraft(currentDraftId: string, fresh: MusicraumDraft): Promise<void>;
  getMeta(key: MetaKey): Promise<unknown>;
  clearAll(): Promise<void>;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error ?? new Error("INDEXED_DB_REQUEST_FAILED")); });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => { transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error ?? new Error("INDEXED_DB_TRANSACTION_FAILED")); transaction.onabort = () => reject(transaction.error ?? new Error("INDEXED_DB_TRANSACTION_ABORTED")); });
}

export class IndexedDbDraftRepository implements DraftRepository {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private open(): Promise<IDBDatabase> {
    if (!globalThis.indexedDB) return Promise.reject(new Error("INDEXED_DB_UNAVAILABLE"));
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_DRAFTS)) db.createObjectStore(STORE_DRAFTS, { keyPath: "draftId" });
        if (!db.objectStoreNames.contains(STORE_META)) db.createObjectStore(STORE_META);
      };
      request.onsuccess = () => { const db = request.result; db.onversionchange = () => db.close(); resolve(db); };
      request.onerror = () => reject(request.error ?? new Error("INDEXED_DB_OPEN_FAILED"));
      request.onblocked = () => reject(new Error("INDEXED_DB_UPGRADE_BLOCKED"));
    });
    return this.dbPromise;
  }
  async getDraft(draftId: string): Promise<MusicraumDraft | null> {
    const db = await this.open(); const transaction = db.transaction(STORE_DRAFTS, "readonly"); const value = await requestResult(transaction.objectStore(STORE_DRAFTS).get(draftId)); await transactionDone(transaction); return value == null ? null : normalizeDraft(value);
  }
  async putDraft(draft: MusicraumDraft): Promise<void> {
    const value = normalizeDraft(draft); const db = await this.open(); const transaction = db.transaction([STORE_DRAFTS, STORE_META], "readwrite"); transaction.objectStore(STORE_DRAFTS).put(value); transaction.objectStore(STORE_META).put(value.draftId, "activeDraftId"); transaction.objectStore(STORE_META).put(value.schemaVersion, "schemaVersion"); await transactionDone(transaction);
  }
  async replaceDraft(currentDraftId: string, fresh: MusicraumDraft): Promise<void> {
    const value = normalizeDraft(fresh); const db = await this.open(); const transaction = db.transaction([STORE_DRAFTS, STORE_META], "readwrite"); const drafts = transaction.objectStore(STORE_DRAFTS); drafts.put(value); if (currentDraftId !== value.draftId) drafts.delete(currentDraftId); transaction.objectStore(STORE_META).put(value.draftId, "activeDraftId"); transaction.objectStore(STORE_META).put(value.schemaVersion, "schemaVersion"); await transactionDone(transaction);
  }
  async getMeta(key: MetaKey): Promise<unknown> { const db = await this.open(); const transaction = db.transaction(STORE_META, "readonly"); const value = await requestResult(transaction.objectStore(STORE_META).get(key)); await transactionDone(transaction); return value; }
  async clearAll(): Promise<void> { const db = await this.open(); const transaction = db.transaction([STORE_DRAFTS, STORE_META], "readwrite"); transaction.objectStore(STORE_DRAFTS).clear(); transaction.objectStore(STORE_META).clear(); await transactionDone(transaction); }
}

export class MemoryDraftRepository implements DraftRepository {
  private drafts = new Map<string, MusicraumDraft>();
  private meta = new Map<MetaKey, unknown>();
  async getDraft(draftId: string): Promise<MusicraumDraft | null> { const value = this.drafts.get(draftId); return value ? normalizeDraft(structuredClone(value)) : null; }
  async putDraft(draft: MusicraumDraft): Promise<void> { const value = normalizeDraft(draft); this.drafts.set(value.draftId, structuredClone(value)); this.meta.set("activeDraftId", value.draftId); this.meta.set("schemaVersion", value.schemaVersion); }
  async replaceDraft(currentDraftId: string, fresh: MusicraumDraft): Promise<void> { const value = normalizeDraft(fresh); this.drafts.set(value.draftId, structuredClone(value)); if (currentDraftId !== value.draftId) this.drafts.delete(currentDraftId); this.meta.set("activeDraftId", value.draftId); this.meta.set("schemaVersion", value.schemaVersion); }
  async getMeta(key: MetaKey): Promise<unknown> { return this.meta.get(key); }
  async clearAll(): Promise<void> { this.drafts.clear(); this.meta.clear(); }
}

export async function loadOrCreateDraft(repository: DraftRepository, storage: Storage = localStorage): Promise<DraftLoadResult> {
  const pointer = storage.getItem(ACTIVE_DRAFT_POINTER_KEY) || String(await repository.getMeta("activeDraftId") ?? "");
  if (pointer) {
    try {
      const existing = await repository.getDraft(pointer);
      if (existing) { storage.setItem(ACTIVE_DRAFT_POINTER_KEY, existing.draftId); return { draft: existing, recovered: false }; }
    } catch (error) {
      if (!(error instanceof Error) || !error.message.startsWith("UNSUPPORTED_DRAFT_SCHEMA")) throw error;
    }
  }
  const draft = createDefaultDraft();
  await repository.putDraft(draft);
  storage.setItem(ACTIVE_DRAFT_POINTER_KEY, draft.draftId);
  return { draft, recovered: Boolean(pointer) };
}

export async function replaceWithFreshDraft(repository: DraftRepository, current: MusicraumDraft, storage: Storage = localStorage): Promise<MusicraumDraft> {
  const fresh = createDefaultDraft();
  await repository.replaceDraft(current.draftId, fresh);
  storage.setItem(ACTIVE_DRAFT_POINTER_KEY, fresh.draftId);
  return fresh;
}
