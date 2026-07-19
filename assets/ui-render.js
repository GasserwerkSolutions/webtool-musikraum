import { PRESETS, escapeHtml } from "./domain.js";
import { buildWebsiteHtml } from "./website.js";
import { getAtPath } from "./ui-shared.js";
const SECTION_LABELS = {
    intro: { title: "Über Franz", description: "Persönlicher Einstieg und Haltung" },
    why: { title: "Frei spielen", description: "Die zentrale Idee der Klangabende" },
    offers: { title: "Klangabende", description: "Was die Menschen erwartet" },
    story: { title: "Geschichte", description: "Franz’ eigener Weg zur Musik" },
    contact: { title: "Kontakt", description: "Anfrage, Telefon und Adresse" },
};
export function bindStaticInputs(context) {
    document.querySelectorAll("[data-bind]").forEach((input) => { const value = getAtPath(context.store.snapshot, input.dataset.bind ?? ""); if (value === undefined)
        return; if (input instanceof HTMLInputElement && input.type === "checkbox")
        input.checked = Boolean(value);
    else
        input.value = String(value ?? ""); });
}
export function renderDynamicControls(context) { renderOffers(context); renderPresets(context); renderStructure(context); }
export function renderOffers(context) {
    context.offerList.innerHTML = "";
    if (!context.store.snapshot.offers.length) {
        context.offerList.innerHTML = '<div class="empty-state">Noch kein Klangmoment. Füge den ersten hinzu.</div>';
        return;
    }
    context.store.snapshot.offers.forEach((offer, index) => {
        const fragment = context.offerTemplate.content.cloneNode(true);
        const card = fragment.querySelector("[data-offer-card]");
        if (!card)
            return;
        card.dataset.offerId = offer.id;
        const number = fragment.querySelector("[data-offer-number]");
        if (number)
            number.textContent = `${index + 1}. ${offer.title || "Klangmoment"}`;
        fragment.querySelectorAll("[data-offer-field]").forEach((input) => { input.value = String(offer[input.dataset.offerField] ?? ""); });
        context.offerList.appendChild(fragment);
    });
}
export function renderStructure(context) {
    context.structureList.innerHTML = context.store.snapshot.layout.order.map((key, index, order) => {
        const meta = SECTION_LABELS[key];
        const visible = context.store.snapshot.layout.visibility[key];
        return `<article class="structure-row" data-section-key="${key}"><div class="structure-row__copy"><strong>${escapeHtml(meta.title)}</strong><span>${escapeHtml(meta.description)}</span></div><label class="visibility-toggle"><input type="checkbox" data-layout-visible ${visible ? "checked" : ""}><span>${visible ? "Sichtbar" : "Ausgeblendet"}</span></label><div class="structure-row__actions"><button class="icon-button icon-button--move" type="button" data-layout-action="up" aria-label="${escapeHtml(meta.title)} nach oben" ${index === 0 ? "disabled" : ""}>↑</button><button class="icon-button icon-button--move" type="button" data-layout-action="down" aria-label="${escapeHtml(meta.title)} nach unten" ${index === order.length - 1 ? "disabled" : ""}>↓</button></div></article>`;
    }).join("");
}
export function renderPresets(context) { document.querySelectorAll("[data-preset]").forEach((button) => { const active = button.dataset.preset === context.store.snapshot.theme.preset; button.classList.toggle("is-active", active); button.setAttribute("aria-checked", String(active)); }); }
export function syncPresetInputs(context, name) { const preset = PRESETS[name]; const primary = document.querySelector('[data-bind="theme.primary"]'); const accent = document.querySelector('[data-bind="theme.accent"]'); if (primary)
    primary.value = preset.primary; if (accent)
    accent.value = preset.accent; renderPresets(context); }
export function renderPreview(context) { if (context.previewTimer) {
    clearTimeout(context.previewTimer);
    context.previewTimer = null;
} const instanceId = crypto.randomUUID(); context.previewInstanceId = instanceId; context.previewFrame.srcdoc = buildWebsiteHtml(context.store.snapshot, { preview: true, previewInstanceId: instanceId, parentOrigin: location.origin === "null" ? "*" : location.origin, previewScroll: context.previewScroll }); }
export function schedulePreview(context) { if (context.previewTimer)
    clearTimeout(context.previewTimer); context.previewTimer = setTimeout(() => renderPreview(context), 80); }
export function updateReadiness(context) {
    const draft = context.store.snapshot;
    const checks = [
        { label: "Musikraum ist benannt", ready: Boolean(draft.site.name.trim()) },
        { label: "E-Mail oder Telefon ist vorhanden", ready: Boolean(draft.site.phone.trim() || draft.site.email.trim()) },
        { label: "Der Einstieg erzählt, worum es geht", ready: Boolean(draft.copy.heroTitle.trim() && draft.copy.heroSubtitle.trim()) },
        { label: "Mindestens ein Inhaltsbereich ist sichtbar", ready: draft.layout.order.some((key) => draft.layout.visibility[key]) },
        { label: "Mindestens ein Klangmoment ist beschrieben", ready: draft.offers.some((offer) => offer.title.trim()) },
    ];
    context.readinessList.innerHTML = checks.map((check) => `<div class="readiness-item${check.ready ? " is-ready" : ""}">${escapeHtml(check.label)}</div>`).join("");
}
export function renderSaveState(context, state, error) {
    if (context.volatileStorage) {
        context.saveStatus.textContent = "Nur für diese Sitzung";
        context.saveStatus.className = "status-pill is-error";
        return;
    }
    const labels = { idle: "Auf diesem Gerät gespeichert", saving: "Speichert …", saved: "Auf diesem Gerät gespeichert", error: "Speichern fehlgeschlagen" };
    context.saveStatus.textContent = labels[state];
    context.saveStatus.className = `status-pill ${state === "saving" ? "is-saving" : state === "saved" ? "is-saved" : state === "error" ? "is-error" : ""}`.trim();
    if (state === "error")
        context.saveStatus.title = error instanceof Error ? error.message : "Der lokale Entwurf konnte nicht gespeichert werden.";
}
export function showPanel(context, panelName) {
    const buttons = [...document.querySelectorAll("[data-panel-target]")];
    buttons.forEach((button) => { const active = button.dataset.panelTarget === panelName; button.classList.toggle("is-active", active); if (active)
        button.setAttribute("aria-current", "step");
    else
        button.removeAttribute("aria-current"); });
    document.querySelectorAll("[data-panel]").forEach((panel) => { const active = panel.dataset.panel === panelName; panel.hidden = !active; panel.classList.toggle("is-active", active); });
    const index = Math.max(0, buttons.findIndex((button) => button.dataset.panelTarget === panelName));
    context.panelStatus.textContent = `Schritt ${index + 1} von ${buttons.length}: ${buttons[index]?.textContent?.trim() ?? "Bearbeiten"}`;
    context.surfaceCard.classList.remove("is-turning");
    void context.surfaceCard.offsetWidth;
    context.surfaceCard.classList.add("is-turning");
    if (panelName === "publish")
        updateReadiness(context);
}
export function setViewport(context, viewport) { const labels = { desktop: "Desktop", tablet: "Tablet", mobile: "Mobile" }; context.previewFrame.dataset.viewport = viewport; context.previewHint.textContent = labels[viewport] ?? "Desktop"; document.querySelectorAll("[data-viewport]").forEach((button) => { const active = button.dataset.viewport === viewport; button.classList.toggle("is-active", active); button.setAttribute("aria-pressed", String(active)); }); }
export function showToast(message) { document.querySelector(".toast")?.remove(); const toast = document.createElement("div"); toast.className = "toast"; toast.setAttribute("role", "status"); toast.textContent = message; document.body.appendChild(toast); setTimeout(() => toast.remove(), 4200); }
