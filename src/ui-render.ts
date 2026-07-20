import { PRESETS, escapeAttr, escapeHtml, type MusicraumDraft, type MusicraumOffer, type MusicraumTextItem, type SectionKey, type ThemePresetName } from "./domain.js";
import type { TextListKey } from "./preview-contract.js";
import { EDITOR_FIELD_REGISTRY, type StaticEditableField } from "./editor-registry.js";
import { contentHelpText, type ContentCompleteness } from "./content-policy.js";
import { buildContentOverview } from "./content-overview.js";
import { evaluateReadiness, type ReadinessSeverity } from "./readiness.js";
import type { ExportPreparationState } from "./export-preflight.js";
import type { SaveState } from "./store.js";
import { buildWebsiteHtml } from "./website.js";
import { getAtPath, type UiContext } from "./ui-shared.js";

const SECTION_LABELS: Record<SectionKey, { title: string; description: string }> = {
  intro: { title: "Über Franz", description: "Persönlicher Einstieg und Haltung" },
  why: { title: "Frei spielen", description: "Die zentrale Idee der Klangabende" },
  offers: { title: "Klangabende", description: "Was die Menschen erwartet" },
  story: { title: "Geschichte", description: "Franz’ eigener Weg zur Musik" },
  contact: { title: "Kontakt", description: "Anfrage, Telefon und Adresse" },
};
const COMPLETENESS_LABELS: Record<ContentCompleteness, string> = { complete: "Vollständig", "optional-empty": "Optional leer", incomplete: "Unvollständig", hidden: "Ausgeblendet" };
const SEVERITY_LABELS: Record<ReadinessSeverity, string> = { error: "Blocker", warning: "Hinweis", info: "Information" };

export function bindStaticInputs(context: UiContext): void {
  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("[data-bind]").forEach((input) => {
    const bind = input.dataset.bind ?? ""; const value = getAtPath(context.store.snapshot, bind); if (value === undefined) return;
    if (input instanceof HTMLInputElement && input.type === "checkbox") input.checked = Boolean(value); else input.value = String(value ?? "");
    if (bind in EDITOR_FIELD_REGISTRY) renderFieldHelp(input, bind as StaticEditableField, context);
  });
}

export function renderDynamicControls(context: UiContext): void { renderTextItems(context, "heroPoints"); renderTextItems(context, "introPoints"); renderOffers(context); renderPresets(context); renderStructure(context); }
export function renderTextItems(context: UiContext, list: TextListKey): void {
  const listElement = list === "heroPoints" ? context.heroPointList : context.introPointList; const items = context.store.snapshot[list]; listElement.innerHTML = "";
  document.querySelectorAll<HTMLButtonElement>(`[data-action="add-text-item"][data-list="${list}"]`).forEach((button) => { button.disabled = items.length >= 6; });
  if (!items.length) { listElement.innerHTML = '<div class="empty-state">Noch kein Punkt. Du kannst die Liste leer lassen oder einen Punkt hinzufügen.</div>'; return; }
  items.forEach((item, index) => {
    const fragment = context.textItemTemplate.content.cloneNode(true) as DocumentFragment; const card = fragment.querySelector<HTMLElement>("[data-text-item-card]"); if (!card) return;
    card.dataset.textList = list; card.dataset.textItemId = item.id; const label = `${list === "heroPoints" ? "Punkt im Titelbild" : "Punkt über Franz"} „${item.text.trim() || "Ohne Text"}“`;
    const number = fragment.querySelector<HTMLElement>("[data-text-item-number]"); if (number) number.textContent = `${index + 1}. ${item.text || "Punkt"}`;
    const input = fragment.querySelector<HTMLInputElement>("[data-text-item-field]"); if (input) input.value = String(item.text ?? ""); configureReorderControls(card, label, index, items.length); listElement.appendChild(fragment);
  });
}
export function renderOffers(context: UiContext): void {
  context.offerList.innerHTML = ""; document.querySelectorAll<HTMLButtonElement>('[data-action="add-offer"]').forEach((button) => { button.disabled = context.store.snapshot.offers.length >= 12; });
  if (!context.store.snapshot.offers.length) { context.offerList.innerHTML = '<div class="empty-state">Noch kein Klangmoment. Füge den ersten hinzu.</div>'; return; }
  context.store.snapshot.offers.forEach((offer, index, offers) => {
    const fragment = context.offerTemplate.content.cloneNode(true) as DocumentFragment; const card = fragment.querySelector<HTMLElement>("[data-offer-card]"); if (!card) return; card.dataset.offerId = offer.id;
    const number = fragment.querySelector<HTMLElement>("[data-offer-number]"); if (number) number.textContent = `${index + 1}. ${offer.title || "Klangmoment"}`;
    fragment.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("[data-offer-field]").forEach((input) => { input.value = String(offer[input.dataset.offerField as keyof MusicraumOffer] ?? ""); });
    configureReorderControls(card, `Klangmoment „${offer.title.trim() || "Ohne Titel"}“`, index, offers.length); context.offerList.appendChild(fragment);
  });
}
export function renderStructure(context: UiContext): void {
  const order = context.store.snapshot.layout.order;
  context.structureList.innerHTML = order.map((key) => {
    const meta = SECTION_LABELS[key]; const visible = context.store.snapshot.layout.visibility[key];
    return `<article class="structure-row" data-section-key="${key}"><div class="structure-row__copy"><strong>${escapeHtml(meta.title)}</strong><span>${escapeHtml(meta.description)}</span></div><label class="visibility-toggle"><input type="checkbox" data-layout-visible ${visible ? "checked" : ""}><span>${visible ? "Sichtbar" : "Ausgeblendet"}</span></label><div class="reorder-actions" role="group" aria-label="Reihenfolge von ${escapeHtml(meta.title)} ändern"><button class="icon-button icon-button--move" type="button" data-reorder-direction="up">↑</button><button class="reorder-handle" type="button" data-reorder-handle aria-hidden="false"><span aria-hidden="true">⠿</span></button><button class="icon-button icon-button--move" type="button" data-reorder-direction="down">↓</button></div></article>`;
  }).join("");
  context.structureList.querySelectorAll<HTMLElement>("[data-section-key]").forEach((row, index) => { const key = row.dataset.sectionKey as SectionKey; configureReorderControls(row, `Bereich „${SECTION_LABELS[key].title}“`, index, order.length); });
}
export function configureReorderControls(item: HTMLElement, label: string, index: number, count: number): void {
  item.dataset.reorderIndex = String(index); item.setAttribute("aria-label", `${label}, Position ${index + 1} von ${count}`);
  item.querySelectorAll<HTMLButtonElement>("[data-reorder-direction]").forEach((button) => {
    const direction = button.dataset.reorderDirection; const upward = direction === "up"; button.disabled = count < 2 || (upward ? index === 0 : index === count - 1);
    button.setAttribute("aria-label", `${label} nach ${upward ? "oben" : "unten"}`); button.title = `${label} nach ${upward ? "oben" : "unten"}`;
  });
  const handle = item.querySelector<HTMLButtonElement>("[data-reorder-handle]"); if (!handle) return;
  handle.disabled = count < 2; handle.setAttribute("aria-label", `${label} ziehen. Alternativ mit Alt und Pfeil hoch oder runter verschieben.`); handle.title = "Ziehen oder Alt + Pfeil hoch/runter";
}
export function renderPresets(context: UiContext): void { document.querySelectorAll<HTMLElement>("[data-preset]").forEach((button) => { const active = button.dataset.preset === context.store.snapshot.theme.preset; button.classList.toggle("is-active", active); button.setAttribute("aria-checked", String(active)); }); }
export function syncPresetInputs(context: UiContext, name: ThemePresetName): void { const preset = PRESETS[name]; const primary = document.querySelector<HTMLInputElement>('[data-bind="theme.primary"]'); const accent = document.querySelector<HTMLInputElement>('[data-bind="theme.accent"]'); if (primary) primary.value = preset.primary; if (accent) accent.value = preset.accent; renderPresets(context); }
export function renderPreview(context: UiContext): void {
  if (context.previewTimer) { clearTimeout(context.previewTimer); context.previewTimer = null; }
  if (context.previewRuntime) { context.previewRuntime.renderFull(); return; }
  const instanceId = crypto.randomUUID(); context.previewInstanceId = instanceId;
  context.previewFrame.srcdoc = buildWebsiteHtml(context.store.snapshot as MusicraumDraft, { preview: true, previewInstanceId: instanceId, parentOrigin: location.origin === "null" ? "*" : location.origin, previewScroll: context.previewScroll, previewRevision: context.store.revision, renderGeneration: 1 });
}
export function schedulePreview(context: UiContext): void { if (context.previewTimer) clearTimeout(context.previewTimer); context.previewTimer = setTimeout(() => renderPreview(context), 40); }
export function renderContentOverview(context: UiContext): void {
  context.contentOverviewList.innerHTML = buildContentOverview(context.store.snapshot).map((group) => `<section class="content-overview__group" aria-labelledby="overview-${group.id}"><h3 id="overview-${group.id}">${escapeHtml(group.label)}</h3><div class="content-overview__entries">${group.entries.map((entry) => {
    const target = escapeAttr(JSON.stringify(entry.target)); const status = COMPLETENESS_LABELS[entry.status];
    return `<button class="content-overview__entry is-${entry.status}" type="button" data-editor-target="${target}" aria-label="${escapeAttr(`${entry.label} bearbeiten, ${status}`)}"><span class="content-overview__copy"><strong>${escapeHtml(entry.label)}</strong><small>${escapeHtml(entry.detail)}</small></span><span class="content-overview__status">${escapeHtml(status)}</span></button>`;
  }).join("")}</div></section>`).join("");
}
export function updateReadiness(context: UiContext): void {
  const summary = evaluateReadiness(context.store.snapshot);
  const summaryTitle = summary.ready ? summary.clean ? "Bereit und ohne Hinweise" : "Bereit mit Hinweisen" : `${summary.errorCount} Blocker offen`;
  const summaryDetail = summary.ready
    ? summary.clean ? "Die Website kann vorbereitet und heruntergeladen werden." : `${summary.warningCount} ${summary.warningCount === 1 ? "Hinweis verhindert" : "Hinweise verhindern"} den Export nicht.`
    : "Behebe die Blocker. Jeder Eintrag führt direkt zum betroffenen Bearbeitungsfeld.";
  context.readinessSummary.className = `readiness-summary ${summary.ready ? "is-ready" : "is-blocked"}${summary.clean ? " is-clean" : ""}`;
  context.readinessSummary.innerHTML = `<strong>${escapeHtml(summaryTitle)}</strong><span>${escapeHtml(summaryDetail)}</span><div class="readiness-counts"><span>${summary.errorCount} Blocker</span><span>${summary.warningCount} Hinweise</span></div>`;
  context.readinessList.innerHTML = summary.results.length ? summary.results.map((item) => {
    const target = item.target ? ` data-editor-target="${escapeAttr(JSON.stringify(item.target))}"` : "";
    const tag = item.target ? "button" : "div";
    const type = item.target ? ' type="button"' : "";
    const action = item.target ? '<span class="readiness-result__arrow" aria-hidden="true">→</span><span class="visually-hidden"> bearbeiten</span>' : "";
    return `<${tag} class="readiness-result is-${item.severity}"${type}${target}><span class="readiness-result__severity">${escapeHtml(SEVERITY_LABELS[item.severity])}</span><span class="readiness-result__copy"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.detail)}</small></span>${action}</${tag}>`;
  }).join("") : '<div class="readiness-empty"><strong>Keine offenen Punkte</strong><span>Alle aktiven Regeln sind erfüllt.</span></div>';
  renderExportState(context, context.exportState);
}
export function renderExportState(context: UiContext, state: ExportPreparationState): void {
  context.exportState = state;
  const summary = evaluateReadiness(context.store.snapshot);
  let message = summary.ready ? "Der Export ist noch nicht vorbereitet." : "Der Export ist blockiert, bis die roten Punkte behoben sind.";
  let visual = summary.ready ? "idle" : "blocked";
  if (state.status === "preparing") { message = "Titelbild und HTML-Datei werden sicher vorbereitet …"; visual = "preparing"; }
  else if (state.status === "stale") { message = "Der Entwurf wurde geändert. Die vorbereitete Datei ist nicht mehr gültig."; visual = "stale"; }
  else if (state.status === "failed") { message = state.message; visual = "failed"; }
  else if (state.status === "ready") { message = state.result.imageEmbedded ? `Bereit: ${formatBytes(state.result.byteSize)}, Titelbild eingebettet.` : `Bereit: ${formatBytes(state.result.byteSize)}. Das Titelbild benötigt beim Öffnen Internet.`; visual = "ready"; }
  context.exportStatus.className = `export-status is-${visual}`;
  context.exportStatus.textContent = message;
  context.exportStatus.setAttribute("aria-label", message);
  document.querySelectorAll<HTMLButtonElement>('[data-action="export"]').forEach((button) => {
    const inTopbar = Boolean(button.closest(".topbar"));
    const preparing = state.status === "preparing";
    button.disabled = preparing || (!inTopbar && !summary.ready);
    button.setAttribute("aria-busy", String(preparing));
    const label = button.querySelector<HTMLElement>("[data-export-label]");
    if (label && !inTopbar) label.textContent = state.status === "ready" && state.revision === context.store.revision ? "HTML-Datei herunterladen" : preparing ? "Export wird vorbereitet …" : summary.ready ? "Export vorbereiten" : "Blocker zuerst beheben";
    button.title = !summary.ready ? "Öffnet den Bereich Fertig mit den noch offenen Blockern." : state.status === "ready" ? "Vorbereitete HTML-Datei herunterladen" : "Export sicher vorbereiten";
  });
}
export function renderSaveState(context: UiContext, state: SaveState, error?: unknown): void {
  const sessionOnly = context.volatileStorage;
  const label = sessionOnly ? "Nur für diese Sitzung gespeichert" : state === "saving" ? "Speichert auf diesem Gerät" : state === "error" ? "Speichern fehlgeschlagen" : "Auf diesem Gerät gespeichert";
  const visualState = sessionOnly ? "session" : state;
  context.saveStatus.textContent = label;
  context.saveStatus.dataset.state = visualState;
  context.saveStatus.className = `status-pill is-${visualState}`;
  context.saveStatus.setAttribute("aria-label", label);
  context.saveStatus.title = state === "error" && error instanceof Error ? `${label}: ${error.message}` : label;
}
export function showPanel(context: UiContext, panelName: string): void {
  const buttons = [...document.querySelectorAll<HTMLElement>("[data-panel-target]")]; buttons.forEach((button) => { const active = button.dataset.panelTarget === panelName; button.classList.toggle("is-active", active); if (active) button.setAttribute("aria-current", "step"); else button.removeAttribute("aria-current"); });
  document.querySelectorAll<HTMLElement>("[data-panel]").forEach((panel) => { const active = panel.dataset.panel === panelName; panel.hidden = !active; panel.classList.toggle("is-active", active); });
  const index = Math.max(0, buttons.findIndex((button) => button.dataset.panelTarget === panelName)); context.panelStatus.textContent = `Schritt ${index + 1} von ${buttons.length}: ${buttons[index]?.textContent?.trim() ?? "Bearbeiten"}`;
  context.surfaceCard.classList.remove("is-turning"); void context.surfaceCard.offsetWidth; context.surfaceCard.classList.add("is-turning"); if (panelName === "site") renderContentOverview(context); if (panelName === "publish") updateReadiness(context);
  context.exportController?.setPanelVisible(panelName === "publish");
}
export function setViewport(context: UiContext, viewport: string): void { const labels: Record<string, string> = { desktop: "Desktop", tablet: "Tablet", mobile: "Mobile" }; context.previewFrame.dataset.viewport = viewport; context.previewHint.textContent = labels[viewport] ?? "Desktop"; document.querySelectorAll<HTMLElement>("[data-viewport]").forEach((button) => { const active = button.dataset.viewport === viewport; button.classList.toggle("is-active", active); button.setAttribute("aria-pressed", String(active)); }); }
export function showToast(message: string): void { document.querySelector(".toast")?.remove(); const toast = document.createElement("div"); toast.className = "toast"; toast.setAttribute("role", "status"); toast.textContent = message; document.body.appendChild(toast); setTimeout(() => toast.remove(), 4200); }
function renderFieldHelp(input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, field: StaticEditableField, context: UiContext): void {
  const label = input.closest<HTMLElement>("label.field"); if (!label) return; const existing = label.querySelector<HTMLElement>("[data-policy-help]"); const help = contentHelpText({ kind: "field", field }, context.store.snapshot);
  if (!help) { existing?.remove(); return; }
  const element = existing ?? document.createElement("small"); element.dataset.policyHelp = ""; element.className = "field-help"; element.textContent = help; if (!existing) label.appendChild(element);
}
function formatBytes(bytes: number): string { return bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KiB` : `${(bytes / 1024 / 1024).toFixed(2)} MiB`; }
export function normalizeTextItemForRender(value: MusicraumTextItem): MusicraumTextItem { return { id: value.id, text: value.text }; }
