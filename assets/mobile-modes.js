const MOBILE_QUERY = "(max-width: 700px)";
const FOCUS_FALLBACK_MS = 350;
const FOCUS_MARGIN = 16;
export function initMobileModes(context) {
    ensureMobileStylesheet();
    const media = matchMedia(MOBILE_QUERY);
    const sync = () => syncMobileModeAvailability(context, media.matches);
    context.mobileModeButtons.forEach((button) => button.addEventListener("click", () => setMobileMode(context, button.dataset.mobileMode === "preview" ? "preview" : "edit")));
    context.surfaceStage.addEventListener("scroll", () => {
        if (context.mobileModesActive && context.mobileMode === "edit")
            context.mobileEditorScroll = context.surfaceStage.scrollTop;
    }, { passive: true });
    document.addEventListener("click", (event) => {
        const target = event.target;
        if (target instanceof Element && target.closest(".topbar [data-action=\"export\"]"))
            setMobileMode(context, "edit", { focus: false, announce: false });
    }, true);
    media.addEventListener("change", sync);
    sync();
}
export function setMobileMode(context, mode, options = {}) {
    if (!context.mobileModesActive)
        return;
    const previous = context.mobileMode;
    if (previous === "edit")
        context.mobileEditorScroll = context.surfaceStage.scrollTop;
    context.mobileMode = mode;
    applyMobileMode(context);
    if (mode === "edit") {
        requestAnimationFrame(() => {
            context.surfaceStage.scrollTop = context.mobileEditorScroll;
            if (options.focus !== false && previous !== mode)
                activePanelHeading()?.focus({ preventScroll: true });
        });
    }
    else if (options.focus !== false && previous !== mode) {
        requestAnimationFrame(() => context.previewFrame.focus({ preventScroll: true }));
    }
    if (options.announce !== false && previous !== mode)
        context.announcer.textContent = mode === "edit" ? "Modus Bearbeiten geöffnet." : "Modus Vorschau geöffnet. Die bisherige Vorschauposition bleibt erhalten.";
}
export function enterMobileEditMode(context, focus = false) {
    if (context.mobileModesActive)
        setMobileMode(context, "edit", { focus, announce: false });
}
export function correctMobileEditorFocus(context, target) {
    if (!context.mobileModesActive)
        return false;
    let active = true;
    const correct = () => {
        if (!active || context.mobileMode !== "edit" || !target.isConnected)
            return;
        const stageRect = context.surfaceStage.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const viewport = window.visualViewport;
        const viewportTop = viewport?.offsetTop ?? 0;
        const viewportBottom = viewportTop + (viewport?.height ?? window.innerHeight);
        const visibleTop = Math.max(stageRect.top, viewportTop) + FOCUS_MARGIN;
        const visibleBottom = Math.min(stageRect.bottom, viewportBottom) - FOCUS_MARGIN;
        if (targetRect.top < visibleTop)
            context.surfaceStage.scrollTop = Math.max(0, context.surfaceStage.scrollTop + targetRect.top - visibleTop);
        else if (targetRect.bottom > visibleBottom)
            context.surfaceStage.scrollTop = Math.max(0, context.surfaceStage.scrollTop + targetRect.bottom - visibleBottom);
    };
    requestAnimationFrame(() => requestAnimationFrame(correct));
    const fallback = window.setTimeout(correct, FOCUS_FALLBACK_MS);
    const viewport = window.visualViewport;
    const onResize = () => requestAnimationFrame(correct);
    viewport?.addEventListener("resize", onResize, { once: true });
    window.setTimeout(() => {
        active = false;
        window.clearTimeout(fallback);
        viewport?.removeEventListener("resize", onResize);
    }, 700);
    return true;
}
function syncMobileModeAvailability(context, enabled) {
    context.mobileModesActive = enabled;
    context.mobileModeSwitch.hidden = !enabled;
    context.workspace.classList.toggle("has-mobile-modes", enabled);
    if (!enabled) {
        context.workspace.classList.remove("is-mobile-edit", "is-mobile-preview");
        setSurfaceAvailability(context.controlSurface, true);
        setSurfaceAvailability(context.previewArea, true);
        context.mobileModeButtons.forEach((button) => { button.classList.remove("is-active"); button.setAttribute("aria-pressed", "false"); });
        return;
    }
    applyMobileMode(context);
    requestAnimationFrame(() => { if (context.mobileMode === "edit")
        context.surfaceStage.scrollTop = context.mobileEditorScroll; });
}
function applyMobileMode(context) {
    const editing = context.mobileMode === "edit";
    context.workspace.classList.toggle("is-mobile-edit", editing);
    context.workspace.classList.toggle("is-mobile-preview", !editing);
    setSurfaceAvailability(context.controlSurface, editing);
    setSurfaceAvailability(context.previewArea, !editing);
    context.mobileModeButtons.forEach((button) => {
        const active = button.dataset.mobileMode === context.mobileMode;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
    });
}
function setSurfaceAvailability(surface, available) {
    surface.inert = !available;
    if (available)
        surface.removeAttribute("aria-hidden");
    else
        surface.setAttribute("aria-hidden", "true");
}
function activePanelHeading() {
    const panel = document.querySelector("[data-panel].is-active:not([hidden])");
    const heading = panel?.querySelector("h1, h2") ?? null;
    if (heading)
        heading.tabIndex = -1;
    return heading;
}
function ensureMobileStylesheet() {
    if (document.querySelector('link[data-mobile-modes-style]'))
        return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "mobile-modes.css";
    link.dataset.mobileModesStyle = "";
    document.head.appendChild(link);
}
