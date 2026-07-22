import { handleClick, handleInput } from "./ui-actions.js";
import { bindStaticInputs, renderContentOverview, renderDynamicControls, renderExportState, renderPreview, renderSaveState, showToast, updateReadiness, } from "./ui-render.js";
import { createUiContext } from "./ui-shared.js";
import { parseNavigateMessage, parseScrollMessage } from "./preview-contract.js";
import { PreviewRuntime } from "./preview-runtime.js";
import { ExportPreflightController } from "./export-preflight.js";
import { navigateToEditorTarget } from "./preview-navigation.js";
import { ensureEditorOpen, initSidebar } from "./sidebar.js";
import { initMobileModes, isMobileModeActive, markPreviewReturnAvailable } from "./mobile-modes.js";
import { handleReorderKeydown, handleReorderPointerDown, handleReorderPointerEnd, handleReorderPointerMove } from "./reorder-actions.js";
export class BuilderUi {
    context;
    constructor(store, repository) {
        this.context = createUiContext(store, repository);
        this.context.previewRuntime = new PreviewRuntime({
            frame: this.context.previewFrame,
            readDraft: () => this.context.store.snapshot,
            readRevision: () => this.context.store.revision,
            readScroll: () => this.context.previewScroll,
            writeInstanceId: (instanceId) => { this.context.previewInstanceId = instanceId; },
        });
        this.context.exportController = new ExportPreflightController({
            readDraft: () => this.context.store.snapshot,
            readRevision: () => this.context.store.revision,
            onState: (state) => renderExportState(this.context, state),
        });
    }
    init(options) {
        this.context.volatileStorage = Boolean(options.volatileStorage);
        initSidebar(this.context);
        initMobileModes(this.context);
        if (isMobileModeActive())
            ensureEditorOpen(this.context);
        bindStaticInputs(this.context);
        renderDynamicControls(this.context);
        renderContentOverview(this.context);
        renderPreview(this.context);
        updateReadiness(this.context);
        this.context.store.subscribe((event) => {
            if (!this.context.suppressPreview)
                this.context.previewRuntime?.enqueue(event);
            this.context.exportController?.notifyMutation(event.mutation.revision);
            renderContentOverview(this.context);
            updateReadiness(this.context);
        });
        this.context.store.subscribeSave((state, error) => renderSaveState(this.context, state, error));
        this.context.store.subscribeHistory((state) => renderHistoryState(this.context, state));
        document.addEventListener("click", (event) => handleClick(this.context, event));
        document.addEventListener("input", (event) => handleInput(this.context, event));
        document.addEventListener("change", (event) => { handleInput(this.context, event); this.context.store.flushHistoryGroup(); });
        document.addEventListener("focusin", (event) => { const target = event.target; if (target instanceof Element && target.matches("[data-bind], [data-text-item-field], [data-offer-field]"))
            this.context.store.flushHistoryGroup(); });
        document.addEventListener("pointerdown", (event) => handleReorderPointerDown(this.context, event));
        document.addEventListener("pointermove", (event) => handleReorderPointerMove(this.context, event));
        document.addEventListener("pointerup", (event) => handleReorderPointerEnd(this.context, event));
        document.addEventListener("pointercancel", (event) => handleReorderPointerEnd(this.context, event, true));
        window.addEventListener("message", (event) => this.handlePreviewMessage(event));
        document.addEventListener("keydown", (event) => {
            if (handleReorderKeydown(this.context, event))
                return;
            if (!(event.ctrlKey || event.metaKey) || event.altKey || event.key.toLowerCase() !== "z")
                return;
            event.preventDefault();
            const action = event.shiftKey ? "redo" : "undo";
            document.querySelector(`[data-action="${action}"]`)?.click();
        });
        const flushBeforeLeave = () => { void this.context.store.flush().catch((error) => console.error("Final draft flush failed.", error)); };
        document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden")
            flushBeforeLeave(); });
        window.addEventListener("pagehide", () => { flushBeforeLeave(); this.context.exportController?.destroy(); });
        if (options.recovered)
            showToast("Der frühere Entwurf passte nicht mehr zum Musikraum-Werkzeug. Ein frischer Entwurf wurde angelegt.");
    }
    handlePreviewMessage(event) {
        if (this.context.previewRuntime?.handleMessage(event))
            return;
        if (event.source !== this.context.previewFrame.contentWindow || event.origin !== "null")
            return;
        const runtime = this.context.previewRuntime;
        if (!runtime)
            return;
        const scroll = parseScrollMessage(event.data, runtime.instanceId, runtime.renderGeneration);
        if (scroll && scroll.revision === runtime.appliedRevision) {
            this.context.previewScroll = scroll.position;
            return;
        }
        const navigate = parseNavigateMessage(event.data, runtime.instanceId, this.context.store.snapshot, runtime.renderGeneration);
        if (navigate && navigate.revision === runtime.appliedRevision) {
            const fromMobilePreview = isMobileModeActive() && (this.context.mobileMode ?? "edit") === "preview";
            navigateToEditorTarget(this.context, navigate.target);
            if (fromMobilePreview)
                markPreviewReturnAvailable();
        }
    }
}
function renderHistoryState(context, state) {
    context.undoButton.disabled = !state.canUndo;
    context.redoButton.disabled = !state.canRedo;
    describeHistoryButton(context.undoButton, "Rückgängig", state.undoAction?.label ?? null, "Strg oder Cmd + Z");
    describeHistoryButton(context.redoButton, "Wiederholen", state.redoAction?.label ?? null, "Umschalt + Strg oder Cmd + Z");
}
function describeHistoryButton(button, direction, label, shortcut) {
    const description = label ? `${direction}: ${label}` : direction;
    const visible = button.querySelector("span");
    if (visible)
        visible.textContent = direction;
    button.setAttribute("aria-label", `${description} (${shortcut})`);
    button.title = `${description} (${shortcut})`;
}
