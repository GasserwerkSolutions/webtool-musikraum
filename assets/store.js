import { cloneDraft, normalizeDraft } from "./domain.js";
import { createDraftEffect, draftsEqualIgnoringUpdatedAt, invertDraftEffect, sameIntentTarget, sourceForReplaceReason, } from "./draft-mutations.js";
export class BuilderStore {
    repository;
    debounceMs;
    draft;
    revisionValue = 0;
    saveTimer = null;
    listeners = new Set();
    saveListeners = new Set();
    saveChain = Promise.resolve();
    saveGeneration = 0;
    undoStack = [];
    redoStack = [];
    historyListeners = new Set();
    lastHistoryIntent = null;
    lastHistoryKey = "";
    lastHistoryAt = 0;
    historyLimit = 60;
    constructor(initialDraft, repository, debounceMs = 250) {
        this.repository = repository;
        this.debounceMs = debounceMs;
        this.draft = normalizeDraft(initialDraft);
    }
    get snapshot() { return this.draft; }
    get revision() { return this.revisionValue; }
    get canUndo() { return this.undoStack.length > 0; }
    get canRedo() { return this.redoStack.length > 0; }
    get nextUndoAction() { return this.undoStack.at(-1)?.history ?? null; }
    get nextRedoAction() { return this.redoStack.at(-1)?.history ?? null; }
    subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
    subscribeSave(listener) { this.saveListeners.add(listener); return () => this.saveListeners.delete(listener); }
    subscribeHistory(listener) { this.historyListeners.add(listener); listener(this.historyState()); return () => this.historyListeners.delete(listener); }
    mutate(mutator, descriptor) {
        const before = cloneDraft(this.draft);
        const working = cloneDraft(this.draft);
        mutator(working);
        const normalized = normalizeDraft(working);
        if (draftsEqualIgnoringUpdatedAt(before, normalized))
            return null;
        const effect = createDraftEffect(before, normalized, descriptor.intent);
        const now = Date.now();
        const eventEffect = effect;
        normalized.updatedAt = new Date(now).toISOString();
        const mergesWithPrevious = Boolean(descriptor.history.key
            && descriptor.history.key === this.lastHistoryKey
            && this.lastHistoryIntent
            && sameIntentTarget(descriptor.intent, this.lastHistoryIntent)
            && now - this.lastHistoryAt < 900);
        if (mergesWithPrevious) {
            const record = this.undoStack.at(-1);
            if (!record)
                throw new Error("MISSING_GROUPED_HISTORY_RECORD");
            if (draftsEqualIgnoringUpdatedAt(record.before, normalized))
                this.undoStack.pop();
            else {
                record.effect = createDraftEffect(record.before, normalized, record.intent);
                record.history = descriptor.history;
                record.createdAt = now;
            }
        }
        else {
            this.undoStack.push({ before, effect, history: descriptor.history, intent: descriptor.intent, createdAt: now });
            if (this.undoStack.length > this.historyLimit)
                this.undoStack.shift();
        }
        this.redoStack = [];
        this.lastHistoryKey = descriptor.history.key ?? "";
        this.lastHistoryIntent = descriptor.intent;
        this.lastHistoryAt = now;
        this.draft = normalized;
        const mutation = this.createMutation("user", eventEffect, descriptor.history, now);
        this.emit(mutation);
        this.emitHistory();
        this.scheduleSave();
        return mutation;
    }
    replace(next, persist = true, reason = "recovery") {
        const before = cloneDraft(this.draft);
        const normalized = normalizeDraft(next);
        this.clearHistory();
        this.cancelPendingSaves();
        if (draftsEqualIgnoringUpdatedAt(before, normalized)) {
            this.draft = normalized;
            this.emitHistory();
            if (persist)
                this.scheduleSave(0);
            else
                this.emitSave("saved");
            return null;
        }
        const now = Date.now();
        normalized.updatedAt = new Date(now).toISOString();
        this.draft = normalized;
        const history = { label: reason === "import" ? "Sicherung wiederhergestellt" : reason === "reset" ? "Editor zurückgesetzt" : "Entwurf wiederhergestellt" };
        const mutation = this.createMutation(sourceForReplaceReason(reason), { type: "draft-replace", reason }, history, now);
        this.emit(mutation);
        this.emitHistory();
        if (persist)
            this.scheduleSave(0);
        else
            this.emitSave("saved");
        return mutation;
    }
    undo() {
        this.flushHistoryGroup();
        const record = this.undoStack.pop();
        if (!record)
            return null;
        const current = cloneDraft(this.draft);
        this.redoStack.push({ after: current, intent: record.intent, history: record.history, createdAt: Date.now() });
        const next = normalizeDraft(record.before);
        const now = Date.now();
        next.updatedAt = new Date(now).toISOString();
        this.draft = next;
        const mutation = this.createMutation("undo", invertDraftEffect(record.effect), record.history, now);
        this.emit(mutation);
        this.emitHistory();
        this.scheduleSave(0);
        return mutation;
    }
    redo() {
        this.flushHistoryGroup();
        const record = this.redoStack.pop();
        if (!record)
            return null;
        const before = cloneDraft(this.draft);
        const next = normalizeDraft(record.after);
        const effect = createDraftEffect(before, next, record.intent);
        const now = Date.now();
        next.updatedAt = new Date(now).toISOString();
        this.undoStack.push({ before, effect, history: record.history, intent: record.intent, createdAt: now });
        if (this.undoStack.length > this.historyLimit)
            this.undoStack.shift();
        this.draft = next;
        const mutation = this.createMutation("redo", effect, record.history, now);
        this.emit(mutation);
        this.emitHistory();
        this.scheduleSave(0);
        return mutation;
    }
    flushHistoryGroup() { this.lastHistoryKey = ""; this.lastHistoryIntent = null; this.lastHistoryAt = 0; }
    async flush() { if (this.saveTimer) {
        clearTimeout(this.saveTimer);
        this.saveTimer = null;
    } await this.enqueueSave(); }
    createMutation(source, effect, history, occurredAt) {
        this.revisionValue += 1;
        return { revision: this.revisionValue, source, effect, history, occurredAt };
    }
    emit(mutation) { const event = { draft: this.draft, mutation }; this.listeners.forEach((listener) => listener(event)); }
    emitSave(state, error) { this.saveListeners.forEach((listener) => listener(state, error)); }
    emitHistory() { const state = this.historyState(); this.historyListeners.forEach((listener) => listener(state)); }
    historyState() { return { canUndo: this.canUndo, canRedo: this.canRedo, undoAction: this.nextUndoAction, redoAction: this.nextRedoAction, recentActions: this.undoStack.slice(-5).map((record) => record.history) }; }
    clearHistory() { this.undoStack = []; this.redoStack = []; this.flushHistoryGroup(); }
    cancelPendingSaves() { this.saveGeneration += 1; if (this.saveTimer) {
        clearTimeout(this.saveTimer);
        this.saveTimer = null;
    } }
    scheduleSave(delay = this.debounceMs) { this.emitSave("saving"); if (this.saveTimer)
        clearTimeout(this.saveTimer); this.saveTimer = setTimeout(() => { this.saveTimer = null; void this.enqueueSave().catch((error) => console.error("Draft save failed.", error)); }, delay); }
    enqueueSave() {
        const snapshot = cloneDraft(this.draft);
        const generation = this.saveGeneration;
        const operation = this.saveChain.then(async () => { if (generation !== this.saveGeneration)
            return; this.emitSave("saving"); try {
            await this.repository.putDraft(snapshot);
            this.emitSave("saved");
        }
        catch (error) {
            this.emitSave("error", error);
            throw error;
        } });
        this.saveChain = operation.catch(() => undefined);
        return operation;
    }
}
