import { cloneDraft, normalizeDraft, type MusicraumDraft } from "./domain.js";
import type { DraftRepository } from "./persistence.js";

export type SaveState = "idle" | "saving" | "saved" | "error";
export type StoreListener = (draft: Readonly<MusicraumDraft>) => void;
export type SaveListener = (state: SaveState, error?: unknown) => void;

export class BuilderStore {
  private draft: MusicraumDraft;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<StoreListener>();
  private saveListeners = new Set<SaveListener>();
  private saveChain: Promise<void> = Promise.resolve();
  constructor(initialDraft: MusicraumDraft, private readonly repository: DraftRepository, private readonly debounceMs = 250) { this.draft = normalizeDraft(initialDraft); }
  get snapshot(): Readonly<MusicraumDraft> { return this.draft; }
  subscribe(listener: StoreListener): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  subscribeSave(listener: SaveListener): () => void { this.saveListeners.add(listener); return () => this.saveListeners.delete(listener); }
  mutate(mutator: (draft: MusicraumDraft) => void): void { const next = cloneDraft(this.draft); mutator(next); next.updatedAt = new Date().toISOString(); this.draft = normalizeDraft(next); this.emit(); this.scheduleSave(); }
  replace(next: MusicraumDraft, persist = true): void { this.draft = normalizeDraft(next); this.emit(); if (persist) this.scheduleSave(0); }
  async flush(): Promise<void> { if (this.saveTimer) { clearTimeout(this.saveTimer); this.saveTimer = null; } await this.enqueueSave(); }
  private emit(): void { this.listeners.forEach((listener) => listener(this.draft)); }
  private emitSave(state: SaveState, error?: unknown): void { this.saveListeners.forEach((listener) => listener(state, error)); }
  private scheduleSave(delay = this.debounceMs): void { this.emitSave("saving"); if (this.saveTimer) clearTimeout(this.saveTimer); this.saveTimer = setTimeout(() => { this.saveTimer = null; void this.enqueueSave().catch((error) => console.error("Draft save failed.", error)); }, delay); }
  private enqueueSave(): Promise<void> {
    const snapshot = cloneDraft(this.draft);
    const operation = this.saveChain.then(async () => { this.emitSave("saving"); try { await this.repository.putDraft(snapshot); this.emitSave("saved"); } catch (error) { this.emitSave("error", error); throw error; } });
    this.saveChain = operation.catch(() => undefined);
    return operation;
  }
}
