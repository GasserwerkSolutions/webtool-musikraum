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

export class BuilderUi {
  private readonly context: UiContext;

  constructor(store: BuilderStore, repository: DraftRepository) {
    this.context = createUiContext(store, repository);
  }

  init(options: DraftLoadResult & { volatileStorage?: boolean }): void {
    this.context.volatileStorage = Boolean(options.volatileStorage);
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
    document.addEventListener("keydown", (event) => { if (!(event.ctrlKey || event.metaKey) || event.altKey || event.key.toLowerCase() !== "z") return; event.preventDefault(); const action = event.shiftKey ? "redo" : "undo"; document.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)?.click(); });
    window.addEventListener("pagehide", () => {
      void this.context.store.flush().catch((error) => console.error("Final draft flush failed.", error));
    });
    if (options.recovered) showToast("Der frühere Entwurf passte nicht mehr zum Musikraum-Werkzeug. Ein frischer Entwurf wurde angelegt.");
  }
}
