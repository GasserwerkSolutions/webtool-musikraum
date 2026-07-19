import { cloneDraft, normalizeDraft, type MusicraumDraft } from "./domain.js";
import type { DraftRepository } from "./persistence.js";

export type SaveState = "idle" | "saving" | "saved" | "error";
export type StoreListener = (draft: Readonly<MusicraumDraft>) => void;
export type SaveListener = (state: SaveState, error?: unknown) => void;
export type HistoryListener = (canUndo: boolean, canRedo: boolean) => void;

export class BuilderStore {
  private draft: MusicraumDraft;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<StoreListener>();
  private saveListeners = new Set<SaveListener>();
  private saveChain: Promise<void> = Promise.resolve();
  private saveGeneration = 0;
  private undoStack: MusicraumDraft[] = [];
  private redoStack: MusicraumDraft[] = [];
  private historyListeners = new Set<HistoryListener>();
  private lastHistoryKey = "";
  private lastHistoryAt = 0;
  private readonly historyLimit = 60;
  constructor(initialDraft: MusicraumDraft, private readonly repository: DraftRepository, private readonly debounceMs = 250) { this.draft = normalizeDraft(initialDraft); }
  get snapshot(): Readonly<MusicraumDraft> { return this.draft; }
  subscribe(listener: StoreListener): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  subscribeSave(listener: SaveListener): () => void { this.saveListeners.add(listener); return () => this.saveListeners.delete(listener); }
  subscribeHistory(listener: HistoryListener): () => void { this.historyListeners.add(listener); listener(this.canUndo, this.canRedo); return () => this.historyListeners.delete(listener); }
  get canUndo(): boolean { return this.undoStack.length > 0; }
  get canRedo(): boolean { return this.redoStack.length > 0; }
  mutate(mutator: (draft: MusicraumDraft) => void, historyKey = ""): void {
    const previous = cloneDraft(this.draft); const next = cloneDraft(this.draft); mutator(next); if (JSON.stringify(next) === JSON.stringify(this.draft)) return; next.updatedAt = new Date().toISOString();
    const normalized = normalizeDraft(next);
    const now = Date.now(); const mergesWithPrevious = Boolean(historyKey && historyKey === this.lastHistoryKey && now - this.lastHistoryAt < 900);
    if (!mergesWithPrevious) { this.undoStack.push(previous); if (this.undoStack.length > this.historyLimit) this.undoStack.shift(); }
    this.redoStack = []; this.lastHistoryKey = historyKey; this.lastHistoryAt = now; this.draft = normalized; this.emit(); this.emitHistory(); this.scheduleSave();
  }
  replace(next: MusicraumDraft, persist = true, remember = true): void { if (remember) { this.undoStack.push(cloneDraft(this.draft)); if (this.undoStack.length > this.historyLimit) this.undoStack.shift(); } else { this.undoStack = []; this.saveGeneration += 1; if (this.saveTimer) { clearTimeout(this.saveTimer); this.saveTimer = null; } } this.redoStack = []; this.lastHistoryKey = ""; this.lastHistoryAt = 0; this.draft = normalizeDraft(next); this.emit(); this.emitHistory(); if (persist) this.scheduleSave(0); else this.emitSave("saved"); }
  undo(): boolean { const previous = this.undoStack.pop(); if (!previous) return false; this.redoStack.push(cloneDraft(this.draft)); this.draft = normalizeDraft(previous); this.lastHistoryKey = ""; this.emit(); this.emitHistory(); this.scheduleSave(0); return true; }
  redo(): boolean { const next = this.redoStack.pop(); if (!next) return false; this.undoStack.push(cloneDraft(this.draft)); this.draft = normalizeDraft(next); this.lastHistoryKey = ""; this.emit(); this.emitHistory(); this.scheduleSave(0); return true; }
  async flush(): Promise<void> { if (this.saveTimer) { clearTimeout(this.saveTimer); this.saveTimer = null; } await this.enqueueSave(); }
  private emit(): void { this.listeners.forEach((listener) => listener(this.draft)); }
  private emitSave(state: SaveState, error?: unknown): void { this.saveListeners.forEach((listener) => listener(state, error)); }
  private emitHistory(): void { this.historyListeners.forEach((listener) => listener(this.canUndo, this.canRedo)); }
  private scheduleSave(delay = this.debounceMs): void { this.emitSave("saving"); if (this.saveTimer) clearTimeout(this.saveTimer); this.saveTimer = setTimeout(() => { this.saveTimer = null; void this.enqueueSave().catch((error) => console.error("Draft save failed.", error)); }, delay); }
  private enqueueSave(): Promise<void> {
    const snapshot = cloneDraft(this.draft);
    const generation = this.saveGeneration;
    const operation = this.saveChain.then(async () => { if (generation !== this.saveGeneration) return; this.emitSave("saving"); try { await this.repository.putDraft(snapshot); this.emitSave("saved"); } catch (error) { this.emitSave("error", error); throw error; } });
    this.saveChain = operation.catch(() => undefined);
    return operation;
  }
}
