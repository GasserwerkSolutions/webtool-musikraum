import { showToast } from "./ui-render.js";
export const MOBILE_MODE_MEDIA = "(max-width: 700px)";
const MOBILE_HINT_KEY = "musikraum-ui-mobile-hint-v1";
const KEYBOARD_VIEWPORT_RATIO = 0.85;
const KEYBOARD_CHECK_FALLBACK_MS = 350;
let baselineInnerHeight = 0;
export function initMobileModes(context) {
    const media = window.matchMedia(MOBILE_MODE_MEDIA);
    const onChange = () => { applyMobileMode(context); if (!isMobileModeActive())
        closeSectionSheet(context); };
    if (typeof media.addEventListener === "function")
        media.addEventListener("change", onChange);
    else if (typeof media.addListener === "function")
        media.addListener(onChange);
    baselineInnerHeight = window.innerHeight;
    window.addEventListener("resize", () => {
        if (!isEditableControl(document.activeElement))
            baselineInnerHeight = window.innerHeight;
        if (isMobileModeActive()) {
            updateMobileChrome();
            refreshModeBarForKeyboard();
        }
        fitMobilePreview(context);
    });
    document.addEventListener("focusin", (event) => { if (isEditableControl(event.target))
        scheduleKeyboardCheck(); });
    document.addEventListener("focusout", () => scheduleKeyboardCheck());
    window.visualViewport?.addEventListener("resize", () => refreshModeBarForKeyboard());
    document.addEventListener("keydown", (event) => { if (event.key === "Escape" && isSectionSheetOpen()) {
        event.preventDefault();
        closeSectionSheet(context);
    } });
    applyMobileMode(context);
    maybeShowMobileHint();
}
export function isSectionSheetOpen() { const sheet = document.getElementById("sectionSheet"); return Boolean(sheet && !sheet.hidden); }
export function openSectionSheet(context) {
    const sheet = document.getElementById("sectionSheet");
    if (!sheet || !sheet.hidden)
        return;
    renderSectionSheet();
    sheet.hidden = false;
    toggleSheetBackground(context, true);
    document.querySelector("[data-sheet-open]")?.setAttribute("aria-expanded", "true");
    const preferred = sheet.querySelector("[data-panel-target][aria-current]") ?? sheet.querySelector("[data-panel-target]");
    preferred?.focus();
}
export function closeSectionSheet(context, focusPanel = false) {
    const sheet = document.getElementById("sectionSheet");
    if (!sheet || sheet.hidden)
        return;
    sheet.hidden = true;
    toggleSheetBackground(context, false);
    const trigger = document.querySelector("[data-sheet-open]");
    trigger?.setAttribute("aria-expanded", "false");
    if (focusPanel) {
        const heading = document.querySelector(".panel.is-active h1, .panel.is-active h2");
        if (heading) {
            heading.tabIndex = -1;
            heading.focus();
            return;
        }
    }
    trigger?.focus();
}
function renderSectionSheet() {
    const list = document.getElementById("sectionSheetList");
    if (!list)
        return;
    const navButtons = [...document.querySelectorAll(".surface-nav [data-panel-target]")];
    list.textContent = "";
    navButtons.forEach((navButton, index) => {
        const active = navButton.classList.contains("is-active");
        const entry = document.createElement("button");
        entry.type = "button";
        entry.className = `section-sheet__entry${active ? " is-active" : ""}`;
        entry.dataset.panelTarget = navButton.dataset.panelTarget ?? "site";
        if (active)
            entry.setAttribute("aria-current", "step");
        const number = document.createElement("span");
        number.className = "section-sheet__number";
        number.setAttribute("aria-hidden", "true");
        number.textContent = String(index + 1);
        const label = document.createElement("span");
        label.textContent = navButton.textContent?.trim() ?? "";
        entry.append(number, label);
        list.appendChild(entry);
    });
}
function toggleSheetBackground(context, on) {
    const elements = [document.querySelector(".topbar"), context.workspace ?? null, document.querySelector(".mode-switch")];
    for (const element of elements) {
        if (!element)
            continue;
        element.toggleAttribute("inert", on);
        if (on)
            element.setAttribute("aria-hidden", "true");
        else
            element.removeAttribute("aria-hidden");
    }
}
export function isMobileModeActive() { return typeof window.matchMedia === "function" && window.matchMedia(MOBILE_MODE_MEDIA).matches; }
export function setMobileMode(context, mode, announce = true) {
    const current = context.mobileMode ?? "edit";
    if (current === mode) {
        applyMobileMode(context);
        return;
    }
    if (current === "edit")
        context.mobileEditorScroll = window.scrollY;
    context.mobileMode = mode;
    if (mode === "preview")
        setPreviewReturnVisible(false);
    applyMobileMode(context);
    if (isMobileModeActive())
        window.scrollTo(0, mode === "edit" ? context.mobileEditorScroll ?? 0 : 0);
    if (announce && context.announcer)
        context.announcer.textContent = mode === "edit" ? "Der Bearbeitungsmodus ist aktiv." : "Die Vorschau ist aktiv. Tippe auf einen Inhalt, um ihn zu bearbeiten.";
}
export function markPreviewReturnAvailable() { setPreviewReturnVisible(true); }
function setPreviewReturnVisible(visible) {
    const button = document.querySelector("[data-return-preview]");
    if (button)
        button.hidden = !visible;
}
export function ensureMobileEditMode(context) {
    if (isMobileModeActive() && (context.mobileMode ?? "edit") !== "edit")
        setMobileMode(context, "edit", false);
}
export function applyMobileMode(context) {
    const mobile = isMobileModeActive();
    const mode = context.mobileMode ?? "edit";
    const previewArea = document.querySelector(".preview-area");
    context.workspace?.classList.toggle("is-mode-edit", mobile && mode === "edit");
    context.workspace?.classList.toggle("is-mode-preview", mobile && mode === "preview");
    document.querySelectorAll("[data-mode]").forEach((button) => {
        const active = button.dataset.mode === mode;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
    });
    setInactive(context.controlSurface ?? null, mobile && mode === "preview");
    setInactive(previewArea, mobile && mode === "edit");
    if (!mobile)
        setPreviewReturnVisible(false);
    if (mobile)
        updateMobileChrome();
    fitMobilePreview(context);
}
const PREVIEW_LAYOUT_WIDTH = 320;
function fitMobilePreview(context) {
    const frame = context.previewFrame ?? document.querySelector("#previewFrame");
    const desk = document.querySelector(".preview-desk");
    if (!frame || !desk)
        return;
    if (!isMobileModeActive() || (context.mobileMode ?? "edit") !== "preview") {
        clearPreviewFit(frame);
        return;
    }
    const deskStyles = getComputedStyle(desk);
    const available = desk.clientWidth - (Number.parseFloat(deskStyles.paddingLeft) || 0) - (Number.parseFloat(deskStyles.paddingRight) || 0);
    if (!Number.isFinite(available) || available <= 0 || available >= PREVIEW_LAYOUT_WIDTH) {
        clearPreviewFit(frame);
        return;
    }
    const availableHeight = desk.clientHeight - (Number.parseFloat(deskStyles.paddingTop) || 0) - (Number.parseFloat(deskStyles.paddingBottom) || 0);
    const scale = available / PREVIEW_LAYOUT_WIDTH;
    frame.style.transition = "none";
    frame.style.maxWidth = "none";
    frame.style.width = `${PREVIEW_LAYOUT_WIDTH}px`;
    frame.style.height = `${Math.max(0, Math.floor(availableHeight / scale))}px`;
    frame.style.transform = `scale(${scale})`;
    frame.style.transformOrigin = "top left";
}
function clearPreviewFit(frame) {
    frame.style.removeProperty("transition");
    frame.style.removeProperty("max-width");
    frame.style.removeProperty("width");
    frame.style.removeProperty("height");
    frame.style.removeProperty("transform");
    frame.style.removeProperty("transform-origin");
}
function setInactive(element, inactive) {
    if (!element)
        return;
    element.toggleAttribute("inert", inactive);
    if (inactive)
        element.setAttribute("aria-hidden", "true");
    else
        element.removeAttribute("aria-hidden");
}
export function refreshModeBarForKeyboard() {
    const bar = document.querySelector(".mode-switch");
    if (!bar)
        return;
    bar.classList.toggle("is-keyboard-hidden", isMobileModeActive() && keyboardLikelyOpen());
}
function scheduleKeyboardCheck() {
    refreshModeBarForKeyboard();
    requestAnimationFrame(() => requestAnimationFrame(refreshModeBarForKeyboard));
    window.setTimeout(refreshModeBarForKeyboard, KEYBOARD_CHECK_FALLBACK_MS);
}
function keyboardLikelyOpen() {
    if (!isEditableControl(document.activeElement))
        return false;
    const viewport = window.visualViewport;
    if (viewport && viewport.height < window.innerHeight * KEYBOARD_VIEWPORT_RATIO)
        return true;
    if (baselineInnerHeight > 0 && window.innerHeight < baselineInnerHeight * KEYBOARD_VIEWPORT_RATIO)
        return true;
    return !viewport && baselineInnerHeight === 0;
}
function isEditableControl(target) {
    return target instanceof HTMLElement && target.matches("input, textarea, select");
}
function maybeShowMobileHint() {
    if (!isMobileModeActive())
        return;
    try {
        if (localStorage.getItem(MOBILE_HINT_KEY))
            return;
        localStorage.setItem(MOBILE_HINT_KEY, "1");
    }
    catch {
        return;
    }
    showToast("Neu: Unten wechselst du zwischen Bearbeiten und Vorschau.");
}
function updateMobileChrome() {
    const root = document.documentElement;
    const topbar = document.querySelector(".topbar");
    const modeBar = document.querySelector(".mode-switch");
    if (topbar)
        root.style.setProperty("--mobile-topbar-height", `${Math.round(topbar.getBoundingClientRect().height)}px`);
    if (modeBar)
        root.style.setProperty("--mobile-modebar-height", `${Math.round(modeBar.getBoundingClientRect().height)}px`);
}
