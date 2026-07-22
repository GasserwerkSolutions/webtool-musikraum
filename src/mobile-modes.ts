import type { UiContext } from "./ui-shared.js";
import { showToast } from "./ui-render.js";

export type MobileMode = "edit" | "preview";
export const MOBILE_MODE_MEDIA = "(max-width: 700px)";

const MOBILE_HINT_KEY = "musikraum-ui-mobile-hint-v1";
const KEYBOARD_VIEWPORT_RATIO = 0.85;
const KEYBOARD_CHECK_FALLBACK_MS = 350;

let baselineInnerHeight = 0;

export function initMobileModes(context: UiContext): void {
  const media = window.matchMedia(MOBILE_MODE_MEDIA);
  const onChange = () => applyMobileMode(context);
  if (typeof media.addEventListener === "function") media.addEventListener("change", onChange);
  else if (typeof media.addListener === "function") media.addListener(onChange);
  baselineInnerHeight = window.innerHeight;
  window.addEventListener("resize", () => {
    if (!isEditableControl(document.activeElement)) baselineInnerHeight = window.innerHeight;
    if (isMobileModeActive()) { updateMobileChrome(); refreshModeBarForKeyboard(); }
  });
  document.addEventListener("focusin", (event) => { if (isEditableControl(event.target)) scheduleKeyboardCheck(); });
  document.addEventListener("focusout", () => scheduleKeyboardCheck());
  window.visualViewport?.addEventListener("resize", () => refreshModeBarForKeyboard());
  applyMobileMode(context);
  maybeShowMobileHint();
}

export function isMobileModeActive(): boolean { return typeof window.matchMedia === "function" && window.matchMedia(MOBILE_MODE_MEDIA).matches; }

export function setMobileMode(context: UiContext, mode: MobileMode, announce = true): void {
  const current = context.mobileMode ?? "edit";
  if (current === mode) { applyMobileMode(context); return; }
  if (current === "edit") context.mobileEditorScroll = window.scrollY;
  context.mobileMode = mode;
  applyMobileMode(context);
  if (isMobileModeActive()) window.scrollTo(0, mode === "edit" ? context.mobileEditorScroll ?? 0 : 0);
  if (announce && context.announcer) context.announcer.textContent = mode === "edit" ? "Der Bearbeitungsmodus ist aktiv." : "Die Vorschau ist aktiv. Tippe auf einen Inhalt, um ihn zu bearbeiten.";
}

export function ensureMobileEditMode(context: UiContext): void {
  if (isMobileModeActive() && (context.mobileMode ?? "edit") !== "edit") setMobileMode(context, "edit", false);
}

export function applyMobileMode(context: UiContext): void {
  const mobile = isMobileModeActive();
  const mode = context.mobileMode ?? "edit";
  const previewArea = document.querySelector<HTMLElement>(".preview-area");
  context.workspace?.classList.toggle("is-mode-edit", mobile && mode === "edit");
  context.workspace?.classList.toggle("is-mode-preview", mobile && mode === "preview");
  document.querySelectorAll<HTMLElement>("[data-mode]").forEach((button) => {
    const active = button.dataset.mode === mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  setInactive(context.controlSurface ?? null, mobile && mode === "preview");
  setInactive(previewArea, mobile && mode === "edit");
  if (mobile) updateMobileChrome();
}

function setInactive(element: HTMLElement | null, inactive: boolean): void {
  if (!element) return;
  element.toggleAttribute("inert", inactive);
  if (inactive) element.setAttribute("aria-hidden", "true");
  else element.removeAttribute("aria-hidden");
}

export function refreshModeBarForKeyboard(): void {
  const bar = document.querySelector<HTMLElement>(".mode-switch");
  if (!bar) return;
  bar.classList.toggle("is-keyboard-hidden", isMobileModeActive() && keyboardLikelyOpen());
}

function scheduleKeyboardCheck(): void {
  refreshModeBarForKeyboard();
  requestAnimationFrame(() => requestAnimationFrame(refreshModeBarForKeyboard));
  window.setTimeout(refreshModeBarForKeyboard, KEYBOARD_CHECK_FALLBACK_MS);
}

function keyboardLikelyOpen(): boolean {
  if (!isEditableControl(document.activeElement)) return false;
  const viewport = window.visualViewport;
  if (viewport && viewport.height < window.innerHeight * KEYBOARD_VIEWPORT_RATIO) return true;
  if (baselineInnerHeight > 0 && window.innerHeight < baselineInnerHeight * KEYBOARD_VIEWPORT_RATIO) return true;
  return !viewport && baselineInnerHeight === 0;
}

function isEditableControl(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.matches("input, textarea, select");
}

function maybeShowMobileHint(): void {
  if (!isMobileModeActive()) return;
  try {
    if (localStorage.getItem(MOBILE_HINT_KEY)) return;
    localStorage.setItem(MOBILE_HINT_KEY, "1");
  } catch { return; }
  showToast("Neu: Unten wechselst du zwischen Bearbeiten und Vorschau.");
}

function updateMobileChrome(): void {
  const root = document.documentElement;
  const topbar = document.querySelector<HTMLElement>(".topbar");
  const modeBar = document.querySelector<HTMLElement>(".mode-switch");
  if (topbar) root.style.setProperty("--mobile-topbar-height", `${Math.round(topbar.getBoundingClientRect().height)}px`);
  if (modeBar) root.style.setProperty("--mobile-modebar-height", `${Math.round(modeBar.getBoundingClientRect().height)}px`);
}
