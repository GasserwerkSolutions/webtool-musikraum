export const MOBILE_MODE_MEDIA = "(max-width: 700px)";
export function initMobileModes(context) {
    const media = window.matchMedia(MOBILE_MODE_MEDIA);
    const onChange = () => applyMobileMode(context);
    if (typeof media.addEventListener === "function")
        media.addEventListener("change", onChange);
    else if (typeof media.addListener === "function")
        media.addListener(onChange);
    window.addEventListener("resize", () => { if (isMobileModeActive())
        updateMobileChrome(); });
    applyMobileMode(context);
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
    applyMobileMode(context);
    if (isMobileModeActive())
        window.scrollTo(0, mode === "edit" ? context.mobileEditorScroll ?? 0 : 0);
    if (announce && context.announcer)
        context.announcer.textContent = mode === "edit" ? "Der Bearbeitungsmodus ist aktiv." : "Die Vorschau ist aktiv. Tippe auf einen Inhalt, um ihn zu bearbeiten.";
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
    if (mobile)
        updateMobileChrome();
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
function updateMobileChrome() {
    const root = document.documentElement;
    const topbar = document.querySelector(".topbar");
    const modeBar = document.querySelector(".mode-switch");
    if (topbar)
        root.style.setProperty("--mobile-topbar-height", `${Math.round(topbar.getBoundingClientRect().height)}px`);
    if (modeBar)
        root.style.setProperty("--mobile-modebar-height", `${Math.round(modeBar.getBoundingClientRect().height)}px`);
}
