import { ensureMobileEditMode } from "./mobile-modes.js";
const WIDTH_KEY = "musikraum-ui-sidebar-width-v1";
const COLLAPSED_KEY = "musikraum-ui-sidebar-collapsed-v1";
const MIN_WIDTH = 420;
const MAX_WIDTH = 720;
const RAIL_WIDTH = 92;
export function initSidebar(context) {
    const storedWidth = Number(readPreference(WIDTH_KEY));
    setSidebarWidth(context, Number.isFinite(storedWidth) && storedWidth > 0 ? storedWidth : 560, false);
    setSidebarCollapsed(context, readPreference(COLLAPSED_KEY) === "true", false);
    context.sidebarToggle.addEventListener("click", () => setSidebarCollapsed(context, !context.controlSurface.classList.contains("is-collapsed")));
    context.sidebarResizer.addEventListener("pointerdown", (event) => beginResize(context, event));
    context.sidebarResizer.addEventListener("keydown", (event) => resizeByKeyboard(context, event));
}
export function ensureEditorOpen(context) { ensureMobileEditMode(context); if (context.controlSurface.classList.contains("is-collapsed"))
    setSidebarCollapsed(context, false); }
function setSidebarCollapsed(context, collapsed, persist = true) {
    context.controlSurface.classList.toggle("is-collapsed", collapsed);
    context.workspace.classList.toggle("is-sidebar-collapsed", collapsed);
    context.sidebarToggle.setAttribute("aria-expanded", String(!collapsed));
    context.sidebarToggle.title = collapsed ? "Bearbeitungsfläche ausklappen" : "Bearbeitungsfläche einklappen";
    const hiddenLabel = context.sidebarToggle.querySelector(".visually-hidden");
    if (hiddenLabel)
        hiddenLabel.textContent = context.sidebarToggle.title;
    const arrow = context.sidebarToggle.querySelector("[aria-hidden]");
    if (arrow)
        arrow.textContent = collapsed ? "›" : "‹";
    context.surfaceStage.setAttribute("aria-hidden", String(collapsed));
    if (collapsed && context.surfaceStage.contains(document.activeElement))
        context.sidebarToggle.focus();
    if (persist)
        writePreference(COLLAPSED_KEY, String(collapsed));
}
function beginResize(context, event) {
    if (!sideBySide(context))
        return;
    event.preventDefault();
    context.sidebarResizer.setPointerCapture(event.pointerId);
    context.controlSurface.classList.add("is-resizing");
    const move = (next) => setSidebarWidth(context, next.clientX, false);
    const end = (next) => { context.sidebarResizer.releasePointerCapture(next.pointerId); context.sidebarResizer.removeEventListener("pointermove", move); context.sidebarResizer.removeEventListener("pointerup", end); context.sidebarResizer.removeEventListener("pointercancel", end); context.controlSurface.classList.remove("is-resizing"); writePreference(WIDTH_KEY, String(currentWidth(context))); };
    context.sidebarResizer.addEventListener("pointermove", move);
    context.sidebarResizer.addEventListener("pointerup", end);
    context.sidebarResizer.addEventListener("pointercancel", end);
}
function resizeByKeyboard(context, event) {
    if (!sideBySide(context))
        return;
    const step = event.shiftKey ? 48 : 16;
    let next = null;
    if (event.key === "ArrowLeft")
        next = currentWidth(context) - step;
    if (event.key === "ArrowRight")
        next = currentWidth(context) + step;
    if (event.key === "Home")
        next = MIN_WIDTH;
    if (event.key === "End")
        next = maximumWidth();
    if (next === null)
        return;
    event.preventDefault();
    setSidebarWidth(context, next);
}
function setSidebarWidth(context, width, persist = true) { const value = Math.round(Math.max(MIN_WIDTH, Math.min(maximumWidth(), width))); context.workspace.style.setProperty("--editor-width", `${value}px`); context.sidebarResizer.setAttribute("aria-valuenow", String(value)); context.sidebarResizer.setAttribute("aria-valuemax", String(maximumWidth())); if (persist)
    writePreference(WIDTH_KEY, String(value)); }
function currentWidth(context) { return Number.parseFloat(getComputedStyle(context.workspace).getPropertyValue("--editor-width")) || 560; }
function maximumWidth() { return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, window.innerWidth - 420)); }
function sideBySide(context) { const preview = document.querySelector(".preview-area"); if (!preview)
    return false; const left = context.controlSurface.getBoundingClientRect(); const right = preview.getBoundingClientRect(); return Math.abs(left.top - right.top) < 80 && left.right <= right.left + 2; }
function readPreference(key) { try {
    return localStorage.getItem(key);
}
catch {
    return null;
} }
function writePreference(key, value) { try {
    localStorage.setItem(key, value);
}
catch { } }
export const SIDEBAR_RAIL_WIDTH = RAIL_WIDTH;
