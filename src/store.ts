import { cloneDraft, normalizeDraft, type MusicraumDraft } from "./domain.js";
import type { DraftRepository } from "./persistence.js";
import {
  createDraftEffect,
  draftsEqualIgnoringUpdatedAt,
  invertDraftEffect,
  sameIntentTarget,
  sourceForReplaceReason,
  type DraftMutation,
  type DraftMutationDescriptor,
  type DraftMutationEvent,
  type DraftMutationIntent,
  type HistoryDescriptor,
  type HistoryRecord,
} from "./draft-mutations.js";

export type SaveState = "idle" | "saving" | "saved" | "error";
export type StoreListener = (event: DraftMutationEvent) => void;
export type SaveListener = (state: SaveState, error?: unknown) => void;
export type HistoryState = {
  canUndo: boolean;
  canRedo: boolean;
  undoAction: HistoryDescriptor | null;
  redoAction: HistoryDescriptor | null;
  recentActions: readonly HistoryDescriptor[];
};
export type HistoryListener = (state: HistoryState) => void;

type InternalHistoryRecord = HistoryRecord & { intent: DraftMutationIntent };
type RedoRecord = { after: MusicraumDraft; intent: DraftMutationIntent; history: HistoryDescriptor; createdAt: number };

export class BuilderStore {
  private draft: MusicraumDraft;
  private revisionValue = 0;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<StoreListener>();
  private saveListeners = new Set<SaveListener>();
  private saveChain: Promise<void> = Promise.resolve();
  private saveGeneration = 0;
  private undoStack: InternalHistoryRecord[] = [];
  private redoStack: RedoRecord[] = [];
  private historyListeners = new Set<HistoryListener>();
  private lastHistoryIntent: DraftMutationIntent | null = null;
  private lastHistoryKey = "";
  private lastHistoryAt = 0;
  private readonly historyLimit = 60;

  constructor(initialDraft: MusicraumDraft, private readonly repository: DraftRepository, private readonly debounceMs = 250) { this.draft = normalizeDraft(initialDraft); }

  get snapshot(): Readonly<MusicraumDraft> { return this.draft; }
  get revision(): number { return this.revisionValue; }
  get canUndo(): boolean { return this.undoStack.length > 0; }
  get canRedo(): boolean { return this.redoStack.length > 0; }
  get nextUndoAction(): HistoryDescriptor | null { return this.undoStack.at(-1)?.history ?? null; }
  get nextRedoAction(): HistoryDescriptor | null { return this.redoStack.at(-1)?.history ?? null; }

  subscribe(listener: StoreListener): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  subscribeSave(listener: SaveListener): () => void { this.saveListeners.add(listener); return () => this.saveListeners.delete(listener); }
  subscribeHistory(listener: HistoryListener): () => void { this.historyListeners.add(listener); listener(this.historyState()); return () => this.historyListeners.delete(listener); }

  mutate(mutator: (draft: MusicraumDraft) => void, descriptor: DraftMutationDescriptor): DraftMutation | null {
    const before = cloneDraft(this.draft);
    const working = cloneDraft(this.draft);
    mutator(working);
    const normalized = normalizeDraft(working);
    if (draftsEqualIgnoringUpdatedAt(before, normalized)) return null;
    const effect = createDraftEffect(before, normalized, descriptor.intent);
    const now = Date.now();
    const eventEffect = effect;
    normalized.updatedAt = new Date(now).toISOString();
    const mergesWithPrevious = Boolean(
      descriptor.history.key
      && descriptor.history.key === this.lastHistoryKey
      && this.lastHistoryIntent
      && sameIntentTarget(descriptor.intent, this.lastHistoryIntent)
      && now - this.lastHistoryAt < 900,
    );
    if (mergesWithPrevious) {
      const record = this.undoStack.at(-1);
      if (!record) throw new Error("MISSING_GROUPED_HISTORY_RECORD");
      if (draftsEqualIgnoringUpdatedAt(record.before, normalized)) this.undoStack.pop();
      else {
        record.effect = createDraftEffect(record.before, normalized, record.intent);
        record.history = descriptor.history;
        record.createdAt = now;
      }
    } else {
      this.undoStack.push({ before, effect, history: descriptor.history, intent: descriptor.intent, createdAt: now });
      if (this.undoStack.length > this.historyLimit) this.undoStack.shift();
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

  replace(next: MusicraumDraft, persist = true, reason: "import" | "reset" | "recovery" = "recovery"): DraftMutation | null {
    const before = cloneDraft(this.draft);
    const normalized = normalizeDraft(next);
    this.clearHistory();
    this.cancelPendingSaves();
    if (draftsEqualIgnoringUpdatedAt(before, normalized)) {
      this.draft = normalized;
      this.emitHistory();
      if (persist) this.scheduleSave(0); else this.emitSave("saved");
      return null;
    }
    const now = Date.now();
    normalized.updatedAt = new Date(now).toISOString();
    this.draft = normalized;
    const history: HistoryDescriptor = { label: reason === "import" ? "Sicherung wiederhergestellt" : reason === "reset" ? "Editor zurückgesetzt" : "Entwurf wiederhergestellt" };
    const mutation = this.createMutation(sourceForReplaceReason(reason), { type: "draft-replace", reason }, history, now);
    this.emit(mutation);
    this.emitHistory();
    if (persist) this.scheduleSave(0); else this.emitSave("saved");
    return mutation;
  }

  undo(): DraftMutation | null {
    this.flushHistoryGroup();
    const record = this.undoStack.pop();
    if (!record) return null;
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

  redo(): DraftMutation | null {
    this.flushHistoryGroup();
    const record = this.redoStack.pop();
    if (!record) return null;
    const before = cloneDraft(this.draft);
    const next = normalizeDraft(record.after);
    const effect = createDraftEffect(before, next, record.intent);
    const now = Date.now();
    next.updatedAt = new Date(now).toISOString();
    this.undoStack.push({ before, effect, history: record.history, intent: record.intent, createdAt: now });
    if (this.undoStack.length > this.historyLimit) this.undoStack.shift();
    this.draft = next;
    const mutation = this.createMutation("redo", effect, record.history, now);
    this.emit(mutation);
    this.emitHistory();
    this.scheduleSave(0);
    return mutation;
  }

  flushHistoryGroup(): void { this.lastHistoryKey = ""; this.lastHistoryIntent = null; this.lastHistoryAt = 0; }
  async flush(): Promise<void> { if (this.saveTimer) { clearTimeout(this.saveTimer); this.saveTimer = null; } await this.enqueueSave(); }

  private createMutation(source: DraftMutation["source"], effect: DraftMutation["effect"], history: HistoryDescriptor, occurredAt: number): DraftMutation {
    this.revisionValue += 1;
    return { revision: this.revisionValue, source, effect, history, occurredAt };
  }
  private emit(mutation: DraftMutation): void { const event: DraftMutationEvent = { draft: this.draft, mutation }; this.listeners.forEach((listener) => listener(event)); }
  private emitSave(state: SaveState, error?: unknown): void { this.saveListeners.forEach((listener) => listener(state, error)); }
  private emitHistory(): void { const state = this.historyState(); this.historyListeners.forEach((listener) => listener(state)); }
  private historyState(): HistoryState { return { canUndo: this.canUndo, canRedo: this.canRedo, undoAction: this.nextUndoAction, redoAction: this.nextRedoAction, recentActions: this.undoStack.slice(-5).map((record) => record.history) }; }
  private clearHistory(): void { this.undoStack = []; this.redoStack = []; this.flushHistoryGroup(); }
  private cancelPendingSaves(): void { this.saveGeneration += 1; if (this.saveTimer) { clearTimeout(this.saveTimer); this.saveTimer = null; } }
  private scheduleSave(delay = this.debounceMs): void { this.emitSave("saving"); if (this.saveTimer) clearTimeout(this.saveTimer); this.saveTimer = setTimeout(() => { this.saveTimer = null; void this.enqueueSave().catch((error) => console.error("Draft save failed.", error)); }, delay); }
  private enqueueSave(): Promise<void> {
    const snapshot = cloneDraft(this.draft);
    const generation = this.saveGeneration;
    const operation = this.saveChain.then(async () => { if (generation !== this.saveGeneration) return; this.emitSave("saving"); try { await this.repository.putDraft(snapshot); this.emitSave("saved"); } catch (error) { this.emitSave("error", error); throw error; } });
    this.saveChain = operation.catch(() => undefined);
    return operation;
  }
}
