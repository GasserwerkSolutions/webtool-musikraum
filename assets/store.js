import { cloneDraft, normalizeDraft } from "./domain.js";
export class BuilderStore {
    repository;
    debounceMs;
    draft;
    saveTimer = null;
    listeners = new Set();
    saveListeners = new Set();
    saveChain = Promise.resolve();
    saveGeneration = 0;
    undoStack = [];
    redoStack = [];
    historyListeners = new Set();
    lastHistoryKey = "";
    lastHistoryAt = 0;
    historyLimit = 60;
    constructor(initialDraft, repository, debounceMs = 250) {
        this.repository = repository;
        this.debounceMs = debounceMs;
        this.draft = normalizeDraft(initialDraft);
    }
    get snapshot() { return this.draft; }
    subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
    subscribeSave(listener) { this.saveListeners.add(listener); return () => this.saveListeners.delete(listener); }
    subscribeHistory(listener) { this.historyListeners.add(listener); listener(this.canUndo, this.canRedo); return () => this.historyListeners.delete(listener); }
    get canUndo() { return this.undoStack.length > 0; }
    get canRedo() { return this.redoStack.length > 0; }
    mutate(mutator, historyKey = "") {
        const previous = cloneDraft(this.draft);
        const next = cloneDraft(this.draft);
        mutator(next);
        if (JSON.stringify(next) === JSON.stringify(this.draft))
            return;
        next.updatedAt = new Date().toISOString();
        const normalized = normalizeDraft(next);
        const now = Date.now();
        const mergesWithPrevious = Boolean(historyKey && historyKey === this.lastHistoryKey && now - this.lastHistoryAt < 900);
        if (!mergesWithPrevious) {
            this.undoStack.push(previous);
            if (this.undoStack.length > this.historyLimit)
                this.undoStack.shift();
        }
        this.redoStack = [];
        this.lastHistoryKey = historyKey;
        this.lastHistoryAt = now;
        this.draft = normalized;
        this.emit();
        this.emitHistory();
        this.scheduleSave();
    }
    replace(next, persist = true, remember = true) { if (remember) {
        this.undoStack.push(cloneDraft(this.draft));
        if (this.undoStack.length > this.historyLimit)
            this.undoStack.shift();
    }
    else {
        this.undoStack = [];
        this.saveGeneration += 1;
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
            this.saveTimer = null;
        }
    } this.redoStack = []; this.lastHistoryKey = ""; this.lastHistoryAt = 0; this.draft = normalizeDraft(next); this.emit(); this.emitHistory(); if (persist)
        this.scheduleSave(0);
    else
        this.emitSave("saved"); }
    undo() { const previous = this.undoStack.pop(); if (!previous)
        return false; this.redoStack.push(cloneDraft(this.draft)); this.draft = normalizeDraft(previous); this.lastHistoryKey = ""; this.emit(); this.emitHistory(); this.scheduleSave(0); return true; }
    redo() { const next = this.redoStack.pop(); if (!next)
        return false; this.undoStack.push(cloneDraft(this.draft)); this.draft = normalizeDraft(next); this.lastHistoryKey = ""; this.emit(); this.emitHistory(); this.scheduleSave(0); return true; }
    async flush() { if (this.saveTimer) {
        clearTimeout(this.saveTimer);
        this.saveTimer = null;
    } await this.enqueueSave(); }
    emit() { this.listeners.forEach((listener) => listener(this.draft)); }
    emitSave(state, error) { this.saveListeners.forEach((listener) => listener(state, error)); }
    emitHistory() { this.historyListeners.forEach((listener) => listener(this.canUndo, this.canRedo)); }
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
