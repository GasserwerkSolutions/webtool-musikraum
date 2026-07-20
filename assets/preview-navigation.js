import { isPreviewTarget, panelForTarget } from "./preview-contract.js";
import { showPanel } from "./ui-render.js";
import { ensureEditorOpen } from "./sidebar.js";
import { correctMobileEditorFocus, enterMobileEditMode } from "./mobile-modes.js";
const highlightTimers = new WeakMap();
export function navigateToEditorTarget(context, target) {
    const valid = isPreviewTarget(target, context.store.snapshot);
    const panel = target.kind === "offer" || target.kind === "text-item" ? panelForTarget(target) : valid ? panelForTarget(target) : null;
    if (!panel)
        return;
    enterMobileEditMode(context);
    ensureEditorOpen(context);
    showPanel(context, panel);
    requestAnimationFrame(() => requestAnimationFrame(() => {
        const element = valid ? resolveEditorTarget(target) : null;
        const destination = element ?? document.querySelector(`[data-panel="${panel}"] h1, [data-panel="${panel}"] h2`);
        if (!destination)
            return;
        if (destination.matches("h1, h2"))
            destination.tabIndex = -1;
        destination.focus({ preventScroll: true });
        revealTarget(context, destination);
        const activeTimer = highlightTimers.get(destination);
        if (activeTimer)
            window.clearTimeout(activeTimer);
        destination.classList.remove("is-preview-target");
        void destination.offsetWidth;
        destination.classList.add("is-preview-target");
        highlightTimers.set(destination, window.setTimeout(() => { destination.classList.remove("is-preview-target"); highlightTimers.delete(destination); }, 1800));
        const missing = (target.kind === "offer" || target.kind === "text-item") && !valid;
        context.announcer.textContent = missing ? "Der gewählte Eintrag ist nicht mehr vorhanden. Der passende Bereich wurde geöffnet." : "Das passende Bearbeitungsfeld ist geöffnet.";
    }));
}
export const navigateToPreviewTarget = navigateToEditorTarget;
export function resolveEditorTarget(target) {
    if (target.kind === "field")
        return document.querySelector(`[data-bind="${target.field}"]`);
    if (target.kind === "offer")
        return document.querySelector(`[data-offer-card][data-offer-id="${CSS.escape(target.offerId)}"] [data-offer-field="${target.field}"]`);
    if (target.kind === "text-item")
        return document.querySelector(`[data-text-list="${target.list}"][data-text-item-id="${CSS.escape(target.itemId)}"] [data-text-item-field]`);
    if (target.kind === "section")
        return document.querySelector(`[data-section-key="${CSS.escape(target.section)}"] [data-layout-visible]`);
    return document.querySelector(`[data-panel="${target.panel}"] h1, [data-panel="${target.panel}"] h2`);
}
function revealTarget(context, target) {
    if (correctMobileEditorFocus(context, target))
        return;
    const control = document.querySelector(".control-surface");
    const preview = document.querySelector(".preview-area");
    const stage = document.querySelector(".surface-stage");
    if (!control || !preview || !stage) {
        target.scrollIntoView({ block: "center", behavior: reducedMotion() ? "auto" : "smooth" });
        return;
    }
    const controlRect = control.getBoundingClientRect();
    const previewRect = preview.getBoundingClientRect();
    const sideBySide = Math.abs(controlRect.top - previewRect.top) < 80 && controlRect.right <= previewRect.left + 2;
    if (sideBySide) {
        const stageRect = stage.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        stage.scrollTo({ top: Math.max(0, stage.scrollTop + targetRect.top - stageRect.top - stageRect.height / 2 + targetRect.height / 2), behavior: reducedMotion() ? "auto" : "smooth" });
        return;
    }
    target.scrollIntoView({ block: "center", behavior: reducedMotion() ? "auto" : "smooth" });
    const viewport = window.visualViewport;
    if (viewport) {
        const reposition = () => { target.scrollIntoView({ block: "center", behavior: "auto" }); viewport.removeEventListener("resize", reposition); };
        viewport.addEventListener("resize", reposition, { once: true });
        setTimeout(() => viewport.removeEventListener("resize", reposition), 1200);
    }
}
function reducedMotion() { return matchMedia("(prefers-reduced-motion: reduce)").matches; }
