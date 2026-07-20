import { PRESETS, escapeAttr, escapeHtml } from "./domain.js";
import { EDITOR_FIELD_REGISTRY } from "./editor-registry.js";
import { contentHelpText } from "./content-policy.js";
import { buildContentOverview } from "./content-overview.js";
import { buildWebsiteHtml } from "./website.js";
import { getAtPath } from "./ui-shared.js";
const SECTION_LABELS = {
    intro: { title: "Über Franz", description: "Persönlicher Einstieg und Haltung" },
    why: { title: "Frei spielen", description: "Die zentrale Idee der Klangabende" },
    offers: { title: "Klangabende", description: "Was die Menschen erwartet" },
    story: { title: "Geschichte", description: "Franz’ eigener Weg zur Musik" },
    contact: { title: "Kontakt", description: "Anfrage, Telefon und Adresse" },
};
const COMPLETENESS_LABELS = { complete: "Vollständig", "optional-empty": "Optional leer", incomplete: "Unvollständig", hidden: "Ausgeblendet" };
export function bindStaticInputs(context) {
    document.querySelectorAll("[data-bind]").forEach((input) => {
        const bind = input.dataset.bind ?? "";
        const value = getAtPath(context.store.snapshot, bind);
        if (value === undefined)
            return;
        if (input instanceof HTMLInputElement && input.type === "checkbox")
            input.checked = Boolean(value);
        else
            input.value = String(value ?? "");
        if (bind in EDITOR_FIELD_REGISTRY)
            renderFieldHelp(input, bind, context);
    });
}
export function renderDynamicControls(context) { renderTextItems(context, "heroPoints"); renderTextItems(context, "introPoints"); renderOffers(context); renderPresets(context); renderStructure(context); }
export function renderTextItems(context, list) {
    const listElement = list === "heroPoints" ? context.heroPointList : context.introPointList;
    const items = context.store.snapshot[list];
    listElement.innerHTML = "";
    document.querySelectorAll(`[data-action="add-text-item"][data-list="${list}"]`).forEach((button) => { button.disabled = items.length >= 6; });
    if (!items.length) {
        listElement.innerHTML = '<div class="empty-state">Noch kein Punkt. Du kannst die Liste leer lassen oder einen Punkt hinzufügen.</div>';
        return;
    }
    items.forEach((item, index) => {
        const fragment = context.textItemTemplate.content.cloneNode(true);
        const card = fragment.querySelector("[data-text-item-card]");
        if (!card)
            return;
        card.dataset.textList = list;
        card.dataset.textItemId = item.id;
        const label = `${list === "heroPoints" ? "Punkt im Titelbild" : "Punkt über Franz"} „${item.text.trim() || "Ohne Text"}“`;
        const number = fragment.querySelector("[data-text-item-number]");
        if (number)
            number.textContent = `${index + 1}. ${item.text || "Punkt"}`;
        const input = fragment.querySelector("[data-text-item-field]");
        if (input)
            input.value = String(item.text ?? "");
        configureReorderControls(card, label, index, items.length);
        listElement.appendChild(fragment);
    });
}
export function renderOffers(context) {
    context.offerList.innerHTML = "";
    document.querySelectorAll('[data-action="add-offer"]').forEach((button) => { button.disabled = context.store.snapshot.offers.length >= 12; });
    if (!context.store.snapshot.offers.length) {
        context.offerList.innerHTML = '<div class="empty-state">Noch kein Klangmoment. Füge den ersten hinzu.</div>';
        return;
    }
    context.store.snapshot.offers.forEach((offer, index, offers) => {
        const fragment = context.offerTemplate.content.cloneNode(true);
        const card = fragment.querySelector("[data-offer-card]");
        if (!card)
            return;
        card.dataset.offerId = offer.id;
        const number = fragment.querySelector("[data-offer-number]");
        if (number)
            number.textContent = `${index + 1}. ${offer.title || "Klangmoment"}`;
        fragment.querySelectorAll("[data-offer-field]").forEach((input) => { input.value = String(offer[input.dataset.offerField] ?? ""); });
        configureReorderControls(card, `Klangmoment „${offer.title.trim() || "Ohne Titel"}“`, index, offers.length);
        context.offerList.appendChild(fragment);
    });
}
export function renderStructure(context) {
    const order = context.store.snapshot.layout.order;
    context.structureList.innerHTML = order.map((key) => {
        const meta = SECTION_LABELS[key];
        const visible = context.store.snapshot.layout.visibility[key];
        return `<article class="structure-row" data-section-key="${key}"><div class="structure-row__copy"><strong>${escapeHtml(meta.title)}</strong><span>${escapeHtml(meta.description)}</span></div><label class="visibility-toggle"><input type="checkbox" data-layout-visible ${visible ? "checked" : ""}><span>${visible ? "Sichtbar" : "Ausgeblendet"}</span></label><div class="reorder-actions" role="group" aria-label="Reihenfolge von ${escapeHtml(meta.title)} ändern"><button class="icon-button icon-button--move" type="button" data-reorder-direction="up">↑</button><button class="reorder-handle" type="button" data-reorder-handle aria-hidden="false"><span aria-hidden="true">⠿</span></button><button class="icon-button icon-button--move" type="button" data-reorder-direction="down">↓</button></div></article>`;
    }).join("");
    context.structureList.querySelectorAll("[data-section-key]").forEach((row, index) => { const key = row.dataset.sectionKey; configureReorderControls(row, `Bereich „${SECTION_LABELS[key].title}“`, index, order.length); });
}
export function configureReorderControls(item, label, index, count) {
    item.dataset.reorderIndex = String(index);
    item.setAttribute("aria-label", `${label}, Position ${index + 1} von ${count}`);
    item.querySelectorAll("[data-reorder-direction]").forEach((button) => {
        const direction = button.dataset.reorderDirection;
        const upward = direction === "up";
        button.disabled = count < 2 || (upward ? index === 0 : index === count - 1);
        button.setAttribute("aria-label", `${label} nach ${upward ? "oben" : "unten"}`);
        button.title = `${label} nach ${upward ? "oben" : "unten"}`;
    });
    const handle = item.querySelector("[data-reorder-handle]");
    if (!handle)
        return;
    handle.disabled = count < 2;
    handle.setAttribute("aria-label", `${label} ziehen. Alternativ mit Alt und Pfeil hoch oder runter verschieben.`);
    handle.title = "Ziehen oder Alt + Pfeil hoch/runter";
}
export function renderPresets(context) { document.querySelectorAll("[data-preset]").forEach((button) => { const active = button.dataset.preset === context.store.snapshot.theme.preset; button.classList.toggle("is-active", active); button.setAttribute("aria-checked", String(active)); }); }
export function syncPresetInputs(context, name) { const preset = PRESETS[name]; const primary = document.querySelector('[data-bind="theme.primary"]'); const accent = document.querySelector('[data-bind="theme.accent"]'); if (primary)
    primary.value = preset.primary; if (accent)
    accent.value = preset.accent; renderPresets(context); }
export function renderPreview(context) {
    if (context.previewTimer) {
        clearTimeout(context.previewTimer);
        context.previewTimer = null;
    }
    if (context.previewRuntime) {
        context.previewRuntime.renderFull();
        return;
    }
    const instanceId = crypto.randomUUID();
    context.previewInstanceId = instanceId;
    context.previewFrame.srcdoc = buildWebsiteHtml(context.store.snapshot, { preview: true, previewInstanceId: instanceId, parentOrigin: location.origin === "null" ? "*" : location.origin, previewScroll: context.previewScroll, previewRevision: context.store.revision, renderGeneration: 1 });
}
export function schedulePreview(context) { if (context.previewTimer)
    clearTimeout(context.previewTimer); context.previewTimer = setTimeout(() => renderPreview(context), 40); }
export function renderContentOverview(context) {
    context.contentOverviewList.innerHTML = buildContentOverview(context.store.snapshot).map((group) => `<section class="content-overview__group" aria-labelledby="overview-${group.id}"><h3 id="overview-${group.id}">${escapeHtml(group.label)}</h3><div class="content-overview__entries">${group.entries.map((entry) => {
        const target = escapeAttr(JSON.stringify(entry.target));
        const status = COMPLETENESS_LABELS[entry.status];
        return `<button class="content-overview__entry is-${entry.status}" type="button" data-editor-target="${target}" aria-label="${escapeAttr(`${entry.label} bearbeiten, ${status}`)}"><span class="content-overview__copy"><strong>${escapeHtml(entry.label)}</strong><small>${escapeHtml(entry.detail)}</small></span><span class="content-overview__status">${escapeHtml(status)}</span></button>`;
    }).join("")}</div></section>`).join("");
}
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
    const sessionOnly = context.volatileStorage;
    const label = sessionOnly ? "Nur für diese Sitzung gespeichert" : state === "saving" ? "Speichert auf diesem Gerät" : state === "error" ? "Speichern fehlgeschlagen" : "Auf diesem Gerät gespeichert";
    const visualState = sessionOnly ? "session" : state;
    context.saveStatus.textContent = "";
    context.saveStatus.dataset.state = visualState;
    context.saveStatus.className = `status-pill is-${visualState}`;
    context.saveStatus.setAttribute("aria-label", label);
    context.saveStatus.title = state === "error" && error instanceof Error ? `${label}: ${error.message}` : label;
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
    if (panelName === "site")
        renderContentOverview(context);
    if (panelName === "publish")
        updateReadiness(context);
}
export function setViewport(context, viewport) { const labels = { desktop: "Desktop", tablet: "Tablet", mobile: "Mobile" }; context.previewFrame.dataset.viewport = viewport; context.previewHint.textContent = labels[viewport] ?? "Desktop"; document.querySelectorAll("[data-viewport]").forEach((button) => { const active = button.dataset.viewport === viewport; button.classList.toggle("is-active", active); button.setAttribute("aria-pressed", String(active)); }); }
export function showToast(message) { document.querySelector(".toast")?.remove(); const toast = document.createElement("div"); toast.className = "toast"; toast.setAttribute("role", "status"); toast.textContent = message; document.body.appendChild(toast); setTimeout(() => toast.remove(), 4200); }
function renderFieldHelp(input, field, context) {
    const label = input.closest("label.field");
    if (!label)
        return;
    const existing = label.querySelector("[data-policy-help]");
    const help = contentHelpText({ kind: "field", field }, context.store.snapshot);
    if (!help) {
        existing?.remove();
        return;
    }
    const element = existing ?? document.createElement("small");
    element.dataset.policyHelp = "";
    element.className = "field-help";
    element.textContent = help;
    if (!existing)
        label.appendChild(element);
}
export function normalizeTextItemForRender(value) { return { id: value.id, text: value.text }; }
