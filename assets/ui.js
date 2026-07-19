import { handleClick, handleInput } from "./ui-actions.js";
import { bindStaticInputs, renderDynamicControls, renderPreview, renderSaveState, schedulePreview, showToast, updateReadiness, } from "./ui-render.js";
import { createUiContext } from "./ui-shared.js";
import { parseNavigateMessage } from "./preview-contract.js";
import { navigateToPreviewTarget } from "./preview-navigation.js";
export class BuilderUi {
    context;
    constructor(store, repository) {
        this.context = createUiContext(store, repository);
    }
    init(options) {
        this.context.volatileStorage = Boolean(options.volatileStorage);
        bindStaticInputs(this.context);
        renderDynamicControls(this.context);
        renderPreview(this.context);
        updateReadiness(this.context);
        this.context.store.subscribe(() => {
            if (!this.context.suppressPreview)
                schedulePreview(this.context);
            updateReadiness(this.context);
        });
        this.context.store.subscribeSave((state, error) => renderSaveState(this.context, state, error));
        this.context.store.subscribeHistory((canUndo, canRedo) => { this.context.undoButton.disabled = !canUndo; this.context.redoButton.disabled = !canRedo; });
        document.addEventListener("click", (event) => handleClick(this.context, event));
        document.addEventListener("input", (event) => handleInput(this.context, event));
        document.addEventListener("change", (event) => handleInput(this.context, event));
        window.addEventListener("message", (event) => this.handlePreviewMessage(event));
        document.addEventListener("keydown", (event) => { if (!(event.ctrlKey || event.metaKey) || event.altKey || event.key.toLowerCase() !== "z")
            return; event.preventDefault(); const action = event.shiftKey ? "redo" : "undo"; document.querySelector(`[data-action="${action}"]`)?.click(); });
        window.addEventListener("pagehide", () => {
            void this.context.store.flush().catch((error) => console.error("Final draft flush failed.", error));
        });
        if (options.recovered)
            showToast("Der frühere Entwurf passte nicht mehr zum Musikraum-Werkzeug. Ein frischer Entwurf wurde angelegt.");
    }
    handlePreviewMessage(event) {
        if (event.source !== this.context.previewFrame.contentWindow || event.origin !== "null")
            return;
        const message = event.data;
        if (!message || message.channel !== "musikraum-preview" || message.version !== 1 || message.instanceId !== this.context.previewInstanceId)
            return;
        if (message.action === "preview-scroll") {
            const position = parseScrollPosition(message.position);
            if (position)
                this.context.previewScroll = position;
            return;
        }
        const parsed = parseNavigateMessage(message, this.context.previewInstanceId, this.context.store.snapshot);
        if (parsed)
            navigateToPreviewTarget(this.context, parsed.target);
    }
}
function parseScrollPosition(value) { if (!value || typeof value !== "object")
    return null; const row = value; return typeof row.section === "string" && Number.isFinite(row.offsetWithinSection) && Number.isFinite(row.fallbackScrollY) ? { section: row.section, offsetWithinSection: Math.max(0, Number(row.offsetWithinSection)), fallbackScrollY: Math.max(0, Number(row.fallbackScrollY)) } : null; }
