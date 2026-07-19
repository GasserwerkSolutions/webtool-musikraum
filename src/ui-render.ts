import {
  PRESETS,
  escapeHtml,
  type BuilderDraftV2,
  type BuilderService,
  type SectionKey,
  type ThemePresetName,
} from "./domain.js";
import type { SaveState } from "./store.js";
import { buildWebsiteHtml } from "./website.js";
import { getAtPath, type UiContext } from "./ui-shared.js";

const SECTION_LABELS: Record<SectionKey, { title: string; description: string }> = {
  intro: { title: "Über Franz", description: "Persönlicher Einstieg und Haltung" },
  why: { title: "Frei spielen", description: "Die zentrale Idee des Angebots" },
  offers: { title: "Klangabende", description: "Die bearbeitbaren Angebotskarten" },
  story: { title: "Geschichte", description: "Franz' eigener Weg zur Musik" },
  contact: { title: "Kontakt", description: "Anfrage, Telefon und Adresse" },
};

export function bindStaticInputs(context: UiContext): void {
  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("[data-bind]").forEach((input) => {
    const value = getAtPath(context.store.snapshot, input.dataset.bind ?? "");
    if (value === undefined) return;
    if (input instanceof HTMLInputElement && input.type === "checkbox") input.checked = Boolean(value);
    else input.value = String(value ?? "");
  });
}

export function renderDynamicControls(context: UiContext): void {
  renderServices(context);
  renderPresets(context);
  renderStructure(context);
}

export function renderServices(context: UiContext): void {
  context.serviceList.innerHTML = "";
  if (!context.store.snapshot.services.length) {
    context.serviceList.innerHTML = '<div class="empty-state">Noch keine Angebotskarte. Füge eine Karte hinzu.</div>';
    return;
  }
  context.store.snapshot.services.forEach((service, index) => {
    const fragment = context.serviceTemplate.content.cloneNode(true) as DocumentFragment;
    const card = fragment.querySelector<HTMLElement>("[data-service-card]");
    if (!card) return;
    card.dataset.serviceId = service.clientId;
    const number = fragment.querySelector<HTMLElement>("[data-service-number]");
    if (number) number.textContent = `${index + 1}. ${service.name || "Angebot"}`;
    fragment.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("[data-service-field]").forEach((input) => {
      const field = input.dataset.serviceField as keyof BuilderService;
      input.value = String(service[field] ?? "");
    });
    context.serviceList.appendChild(fragment);
  });
}

export function renderStructure(context: UiContext): void {
  context.structureList.innerHTML = context.store.snapshot.layout.order.map((key, index, order) => {
    const meta = SECTION_LABELS[key];
    const visible = context.store.snapshot.layout.visibility[key];
    return `<article class="structure-row" data-section-key="${key}">
      <div class="structure-row__copy"><strong>${escapeHtml(meta.title)}</strong><span>${escapeHtml(meta.description)}</span></div>
      <label class="visibility-toggle"><input type="checkbox" data-layout-visible ${visible ? "checked" : ""}><span>${visible ? "Sichtbar" : "Ausgeblendet"}</span></label>
      <div class="structure-row__actions"><button class="icon-button icon-button--move" type="button" data-layout-action="up" aria-label="${escapeHtml(meta.title)} nach oben" ${index === 0 ? "disabled" : ""}>↑</button><button class="icon-button icon-button--move" type="button" data-layout-action="down" aria-label="${escapeHtml(meta.title)} nach unten" ${index === order.length - 1 ? "disabled" : ""}>↓</button></div>
    </article>`;
  }).join("");
}

export function renderPresets(context: UiContext): void {
  document.querySelectorAll<HTMLElement>("[data-preset]").forEach((button) => {
    const active = button.dataset.preset === context.store.snapshot.theme.preset;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-checked", String(active));
  });
}

export function syncPresetInputs(context: UiContext, name: ThemePresetName): void {
  const preset = PRESETS[name];
  const primary = document.querySelector<HTMLInputElement>('[data-bind="theme.primary"]');
  const accent = document.querySelector<HTMLInputElement>('[data-bind="theme.accent"]');
  if (primary) primary.value = preset.primary;
  if (accent) accent.value = preset.accent;
  renderPresets(context);
}

export function renderPreview(context: UiContext): void {
  context.previewFrame.srcdoc = buildWebsiteHtml(context.store.snapshot as BuilderDraftV2, { preview: true });
}

export function schedulePreview(context: UiContext): void {
  if (context.previewTimer) clearTimeout(context.previewTimer);
  context.previewTimer = setTimeout(() => renderPreview(context), 80);
}

export function updateReadiness(context: UiContext): void {
  const draft = context.store.snapshot;
  const checks = [
    { label: "Name des Auftritts eingetragen", ready: Boolean(draft.salon.name.trim()) },
    { label: "E-Mail oder Telefon vorhanden", ready: Boolean(draft.salon.phone.trim() || draft.salon.email.trim()) },
    { label: "Einstiegstext vorhanden", ready: Boolean(draft.copy.heroTitle.trim() && draft.copy.heroSubtitle.trim()) },
    { label: "Mindestens ein sichtbarer Inhaltsbereich", ready: draft.layout.order.some((key) => draft.layout.visibility[key]) },
    { label: "Mindestens eine Angebotskarte", ready: draft.services.some((service) => service.name.trim()) },
  ];
  context.readinessList.innerHTML = checks.map((check) => `<div class="readiness-item${check.ready ? " is-ready" : ""}">${escapeHtml(check.label)}</div>`).join("");
}

export function updateMigrationNotice(_context: UiContext): void {}

export function renderSaveState(context: UiContext, state: SaveState, error?: unknown): void {
  if (context.volatileStorage) {
    context.saveStatus.textContent = "Nur für diese Sitzung";
    context.saveStatus.className = "status-pill is-error";
    context.saveStatus.title = "Der Browser stellt keinen dauerhaften lokalen Speicher bereit.";
    return;
  }
  const labels: Record<SaveState, string> = { idle: "Lokal gespeichert", saving: "Speichert …", saved: "Lokal gespeichert", error: "Speichern fehlgeschlagen" };
  context.saveStatus.textContent = labels[state];
  context.saveStatus.className = `status-pill ${state === "saving" ? "is-saving" : state === "saved" ? "is-saved" : state === "error" ? "is-error" : ""}`.trim();
  if (state === "error") context.saveStatus.title = error instanceof Error ? error.message : "Der lokale Entwurf konnte nicht gespeichert werden.";
}

export function showPanel(context: UiContext, panelName: string): void {
  document.querySelectorAll<HTMLElement>("[data-panel-target]").forEach((button) => button.classList.toggle("is-active", button.dataset.panelTarget === panelName));
  document.querySelectorAll<HTMLElement>("[data-panel]").forEach((panel) => {
    const active = panel.dataset.panel === panelName;
    panel.hidden = !active;
    panel.classList.toggle("is-active", active);
  });
  context.surfaceCard.classList.remove("is-turning");
  void context.surfaceCard.offsetWidth;
  context.surfaceCard.classList.add("is-turning");
  if (panelName === "publish") updateReadiness(context);
}

export function setViewport(context: UiContext, viewport: string): void {
  const labels: Record<string, string> = { desktop: "Desktop", tablet: "Tablet", mobile: "Mobile" };
  context.previewFrame.dataset.viewport = viewport;
  context.previewHint.textContent = labels[viewport] ?? "Desktop";
  document.querySelectorAll<HTMLElement>("[data-viewport]").forEach((button) => button.classList.toggle("is-active", button.dataset.viewport === viewport));
}

export function showToast(message: string): void {
  document.querySelector(".toast")?.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.setAttribute("role", "status");
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4200);
}
