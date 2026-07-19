import type { UiContext } from "./ui-shared.js";

const WIDTH_KEY = "musikraum-ui-sidebar-width-v1";
const COLLAPSED_KEY = "musikraum-ui-sidebar-collapsed-v1";
const MIN_WIDTH = 420;
const MAX_WIDTH = 720;
const RAIL_WIDTH = 92;

export function initSidebar(context: UiContext): void {
  const storedWidth = Number(readPreference(WIDTH_KEY)); setSidebarWidth(context, Number.isFinite(storedWidth) && storedWidth > 0 ? storedWidth : 560, false);
  setSidebarCollapsed(context, readPreference(COLLAPSED_KEY) === "true", false);
  context.sidebarToggle.addEventListener("click", () => setSidebarCollapsed(context, !context.controlSurface.classList.contains("is-collapsed")));
  context.sidebarResizer.addEventListener("pointerdown", (event) => beginResize(context, event));
  context.sidebarResizer.addEventListener("keydown", (event) => resizeByKeyboard(context, event));
}

export function ensureEditorOpen(context: UiContext): void { if (context.controlSurface.classList.contains("is-collapsed")) setSidebarCollapsed(context, false); }

function setSidebarCollapsed(context: UiContext, collapsed: boolean, persist = true): void {
  context.controlSurface.classList.toggle("is-collapsed", collapsed); context.workspace.classList.toggle("is-sidebar-collapsed", collapsed);
  context.sidebarToggle.setAttribute("aria-expanded", String(!collapsed)); context.sidebarToggle.title = collapsed ? "Bearbeitungsfläche ausklappen" : "Bearbeitungsfläche einklappen";
  const hiddenLabel = context.sidebarToggle.querySelector<HTMLElement>(".visually-hidden"); if (hiddenLabel) hiddenLabel.textContent = context.sidebarToggle.title;
  const arrow = context.sidebarToggle.querySelector<HTMLElement>("[aria-hidden]"); if (arrow) arrow.textContent = collapsed ? "›" : "‹";
  context.surfaceStage.setAttribute("aria-hidden", String(collapsed)); if (collapsed && context.surfaceStage.contains(document.activeElement)) context.sidebarToggle.focus();
  if (persist) writePreference(COLLAPSED_KEY, String(collapsed));
}

function beginResize(context: UiContext, event: PointerEvent): void {
  if (!sideBySide(context)) return; event.preventDefault(); context.sidebarResizer.setPointerCapture(event.pointerId); context.controlSurface.classList.add("is-resizing");
  const move = (next: PointerEvent) => setSidebarWidth(context, next.clientX, false);
  const end = (next: PointerEvent) => { context.sidebarResizer.releasePointerCapture(next.pointerId); context.sidebarResizer.removeEventListener("pointermove", move); context.sidebarResizer.removeEventListener("pointerup", end); context.sidebarResizer.removeEventListener("pointercancel", end); context.controlSurface.classList.remove("is-resizing"); writePreference(WIDTH_KEY, String(currentWidth(context))); };
  context.sidebarResizer.addEventListener("pointermove", move); context.sidebarResizer.addEventListener("pointerup", end); context.sidebarResizer.addEventListener("pointercancel", end);
}

function resizeByKeyboard(context: UiContext, event: KeyboardEvent): void {
  if (!sideBySide(context)) return; const step = event.shiftKey ? 48 : 16; let next: number | null = null;
  if (event.key === "ArrowLeft") next = currentWidth(context) - step; if (event.key === "ArrowRight") next = currentWidth(context) + step; if (event.key === "Home") next = MIN_WIDTH; if (event.key === "End") next = maximumWidth();
  if (next === null) return; event.preventDefault(); setSidebarWidth(context, next);
}

function setSidebarWidth(context: UiContext, width: number, persist = true): void { const value = Math.round(Math.max(MIN_WIDTH, Math.min(maximumWidth(), width))); context.workspace.style.setProperty("--editor-width", `${value}px`); context.sidebarResizer.setAttribute("aria-valuenow", String(value)); context.sidebarResizer.setAttribute("aria-valuemax", String(maximumWidth())); if (persist) writePreference(WIDTH_KEY, String(value)); }
function currentWidth(context: UiContext): number { return Number.parseFloat(getComputedStyle(context.workspace).getPropertyValue("--editor-width")) || 560; }
function maximumWidth(): number { return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, window.innerWidth - 420)); }
function sideBySide(context: UiContext): boolean { const preview = document.querySelector<HTMLElement>(".preview-area"); if (!preview) return false; const left = context.controlSurface.getBoundingClientRect(); const right = preview.getBoundingClientRect(); return Math.abs(left.top - right.top) < 80 && left.right <= right.left + 2; }
function readPreference(key: string): string | null { try { return localStorage.getItem(key); } catch { return null; } }
function writePreference(key: string, value: string): void { try { localStorage.setItem(key, value); } catch {} }
export const SIDEBAR_RAIL_WIDTH = RAIL_WIDTH;
