import { ACTIVE_DRAFT_POINTER_KEY, createDefaultDraft, normalizeDraft } from "./domain.js";
const DB_NAME = "musikraum-website-werkzeug";
const DB_VERSION = 1;
const STORE_DRAFTS = "drafts";
const STORE_META = "meta";
function requestResult(request) {
    return new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error ?? new Error("INDEXED_DB_REQUEST_FAILED")); });
}
function transactionDone(transaction) {
    return new Promise((resolve, reject) => { transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error ?? new Error("INDEXED_DB_TRANSACTION_FAILED")); transaction.onabort = () => reject(transaction.error ?? new Error("INDEXED_DB_TRANSACTION_ABORTED")); });
}
export class IndexedDbDraftRepository {
    dbPromise = null;
    open() {
        if (!globalThis.indexedDB)
            return Promise.reject(new Error("INDEXED_DB_UNAVAILABLE"));
        if (this.dbPromise)
            return this.dbPromise;
        this.dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(STORE_DRAFTS))
                    db.createObjectStore(STORE_DRAFTS, { keyPath: "draftId" });
                if (!db.objectStoreNames.contains(STORE_META))
                    db.createObjectStore(STORE_META);
            };
            request.onsuccess = () => { const db = request.result; db.onversionchange = () => db.close(); resolve(db); };
            request.onerror = () => reject(request.error ?? new Error("INDEXED_DB_OPEN_FAILED"));
            request.onblocked = () => reject(new Error("INDEXED_DB_UPGRADE_BLOCKED"));
        });
        return this.dbPromise;
    }
    async getDraft(draftId) {
        const db = await this.open();
        const transaction = db.transaction(STORE_DRAFTS, "readonly");
        const value = await requestResult(transaction.objectStore(STORE_DRAFTS).get(draftId));
        await transactionDone(transaction);
        return value == null ? null : normalizeDraft(value);
    }
    async putDraft(draft) {
        const value = normalizeDraft(draft);
        const db = await this.open();
        const transaction = db.transaction([STORE_DRAFTS, STORE_META], "readwrite");
        transaction.objectStore(STORE_DRAFTS).put(value);
        transaction.objectStore(STORE_META).put(value.draftId, "activeDraftId");
        transaction.objectStore(STORE_META).put(value.schemaVersion, "schemaVersion");
        await transactionDone(transaction);
    }
    async replaceDraft(currentDraftId, fresh) {
        const value = normalizeDraft(fresh);
        const db = await this.open();
        const transaction = db.transaction([STORE_DRAFTS, STORE_META], "readwrite");
        const drafts = transaction.objectStore(STORE_DRAFTS);
        drafts.put(value);
        if (currentDraftId !== value.draftId)
            drafts.delete(currentDraftId);
        transaction.objectStore(STORE_META).put(value.draftId, "activeDraftId");
        transaction.objectStore(STORE_META).put(value.schemaVersion, "schemaVersion");
        await transactionDone(transaction);
    }
    async getMeta(key) { const db = await this.open(); const transaction = db.transaction(STORE_META, "readonly"); const value = await requestResult(transaction.objectStore(STORE_META).get(key)); await transactionDone(transaction); return value; }
    async clearAll() { const db = await this.open(); const transaction = db.transaction([STORE_DRAFTS, STORE_META], "readwrite"); transaction.objectStore(STORE_DRAFTS).clear(); transaction.objectStore(STORE_META).clear(); await transactionDone(transaction); }
}
export class MemoryDraftRepository {
    drafts = new Map();
    meta = new Map();
    async getDraft(draftId) { const value = this.drafts.get(draftId); return value ? normalizeDraft(structuredClone(value)) : null; }
    async putDraft(draft) { const value = normalizeDraft(draft); this.drafts.set(value.draftId, structuredClone(value)); this.meta.set("activeDraftId", value.draftId); this.meta.set("schemaVersion", value.schemaVersion); }
    async replaceDraft(currentDraftId, fresh) { const value = normalizeDraft(fresh); this.drafts.set(value.draftId, structuredClone(value)); if (currentDraftId !== value.draftId)
        this.drafts.delete(currentDraftId); this.meta.set("activeDraftId", value.draftId); this.meta.set("schemaVersion", value.schemaVersion); }
    async getMeta(key) { return this.meta.get(key); }
    async clearAll() { this.drafts.clear(); this.meta.clear(); }
}
export async function loadOrCreateDraft(repository, storage = localStorage) {
    const pointer = storage.getItem(ACTIVE_DRAFT_POINTER_KEY) || String(await repository.getMeta("activeDraftId") ?? "");
    if (pointer) {
        try {
            const existing = await repository.getDraft(pointer);
            if (existing) {
                storage.setItem(ACTIVE_DRAFT_POINTER_KEY, existing.draftId);
                return { draft: existing, recovered: false };
            }
        }
        catch (error) {
            if (!(error instanceof Error) || !error.message.startsWith("UNSUPPORTED_DRAFT_SCHEMA"))
                throw error;
        }
    }
    const draft = createDefaultDraft();
    await repository.putDraft(draft);
    storage.setItem(ACTIVE_DRAFT_POINTER_KEY, draft.draftId);
    return { draft, recovered: Boolean(pointer) };
}
export async function replaceWithFreshDraft(repository, current, storage = localStorage) {
    const fresh = createDefaultDraft();
    await repository.replaceDraft(current.draftId, fresh);
    storage.setItem(ACTIVE_DRAFT_POINTER_KEY, fresh.draftId);
    return fresh;
}
export async function replaceWithImportedDraft(repository, current, imported, storage = localStorage) {
    const restored = normalizeDraft(imported);
    await repository.replaceDraft(current.draftId, restored);
    storage.setItem(ACTIVE_DRAFT_POINTER_KEY, restored.draftId);
    return restored;
}
