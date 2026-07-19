import type { DraftRepository, DraftLoadResult } from "./persistence.js";
import type { BuilderStore } from "./store.js";
import { handleClick, handleInput } from "./ui-actions.js";
import {
  bindStaticInputs,
  renderDynamicControls,
  renderPreview,
  renderSaveState,
  schedulePreview,
  showToast,
  updateReadiness,
} from "./ui-render.js";
import { createUiContext, type UiContext } from "./ui-shared.js";
import { parseNavigateMessage, type PreviewScrollState } from "./preview-contract.js";
import { navigateToPreviewTarget } from "./preview-navigation.js";
import { initSidebar } from "./sidebar.js";

export class BuilderUi {
  private readonly context: UiContext;

  constructor(store: BuilderStore, repository: DraftRepository) {
    this.context = createUiContext(store, repository);
  }

  init(options: DraftLoadResult & { volatileStorage?: boolean }): void {
    this.context.volatileStorage = Boolean(options.volatileStorage);
    initSidebar(this.context);
    bindStaticInputs(this.context);
    renderDynamicControls(this.context);
    renderPreview(this.context);
    updateReadiness(this.context);
    this.context.store.subscribe(() => {
      if (!this.context.suppressPreview) schedulePreview(this.context);
      updateReadiness(this.context);
    });
    this.context.store.subscribeSave((state, error) => renderSaveState(this.context, state, error));
    this.context.store.subscribeHistory((canUndo, canRedo) => { this.context.undoButton.disabled = !canUndo; this.context.redoButton.disabled = !canRedo; });
    document.addEventListener("click", (event) => handleClick(this.context, event));
    document.addEventListener("input", (event) => handleInput(this.context, event));
    document.addEventListener("change", (event) => handleInput(this.context, event));
    window.addEventListener("message", (event) => this.handlePreviewMessage(event));
    document.addEventListener("keydown", (event) => { if (!(event.ctrlKey || event.metaKey) || event.altKey || event.key.toLowerCase() !== "z") return; event.preventDefault(); const action = event.shiftKey ? "redo" : "undo"; document.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)?.click(); });
    const flushBeforeLeave = () => { void this.context.store.flush().catch((error) => console.error("Final draft flush failed.", error)); };
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flushBeforeLeave(); });
    window.addEventListener("pagehide", flushBeforeLeave);
    if (options.recovered) showToast("Der frühere Entwurf passte nicht mehr zum Musikraum-Werkzeug. Ein frischer Entwurf wurde angelegt.");
  }

  private handlePreviewMessage(event: MessageEvent): void {
    if (event.source !== this.context.previewFrame.contentWindow || event.origin !== "null") return;
    const message = event.data as Record<string, unknown> | null; if (!message || message.channel !== "musikraum-preview" || message.version !== 1 || message.instanceId !== this.context.previewInstanceId) return;
    if (message.action === "preview-scroll") { const position = parseScrollPosition(message.position); if (position) this.context.previewScroll = position; return; }
    const parsed = parseNavigateMessage(message, this.context.previewInstanceId, this.context.store.snapshot); if (parsed) navigateToPreviewTarget(this.context, parsed.target);
  }
}

function parseScrollPosition(value: unknown): PreviewScrollState | null { if (!value || typeof value !== "object") return null; const row = value as Record<string, unknown>; return typeof row.section === "string" && Number.isFinite(row.offsetWithinSection) && Number.isFinite(row.fallbackScrollY) ? { section: row.section, offsetWithinSection: Math.max(0, Number(row.offsetWithinSection)), fallbackScrollY: Math.max(0, Number(row.fallbackScrollY)) } : null; }
