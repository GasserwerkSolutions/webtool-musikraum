import { PRESETS, createId, normalizeDraft, slugify, type MusicraumDraft, type SectionKey, type ThemePresetName } from "./domain.js";
import { replaceWithFreshDraft, replaceWithImportedDraft } from "./persistence.js";
import { EDITOR_FIELD_REGISTRY, type StaticEditableField } from "./editor-registry.js";
import { isPreviewTargetShape } from "./preview-contract.js";
import { buildWebsiteHtml, MUSICRAUM_HERO_URL } from "./website.js";
import { inputValue, setAtPath, type UiContext } from "./ui-shared.js";
import { bindStaticInputs, renderContentOverview, renderDynamicControls, renderOffers, renderPreview, renderStructure, setViewport, showPanel, showToast, syncPresetInputs, updateReadiness } from "./ui-render.js";
import { handleTextListAction, handleTextListInput } from "./text-list-actions.js";
import { ensureEditorOpen } from "./sidebar.js";
import { navigateToEditorTarget } from "./preview-navigation.js";
import { handleReorderClick } from "./reorder-actions.js";

export const MAX_OFFERS = 12;
export const MAX_BACKUP_BYTES = 1_000_000;
export function isBackupFileSizeAllowed(file: Pick<File, "size">): boolean { return file.size <= MAX_BACKUP_BYTES; }

export function handleClick(context: UiContext, event: Event): void {
  const target = event.target; if (!(target instanceof Element)) return;
  const editorTarget = target.closest<HTMLElement>("[data-editor-target]");
  if (editorTarget) {
    try { const parsed: unknown = JSON.parse(editorTarget.dataset.editorTarget ?? ""); if (isPreviewTargetShape(parsed)) navigateToEditorTarget(context, parsed); } catch { /* malformed UI target is ignored */ }
    return;
  }
  const panelButton = target.closest<HTMLElement>("[data-panel-target]"); if (panelButton) { ensureEditorOpen(context); showPanel(context, panelButton.dataset.panelTarget ?? "site"); return; }
  const viewportButton = target.closest<HTMLElement>("[data-viewport]"); if (viewportButton) { setViewport(context, viewportButton.dataset.viewport ?? "desktop"); return; }
  const presetButton = target.closest<HTMLElement>("[data-preset]"); if (presetButton) { applyPreset(context, presetButton.dataset.preset as ThemePresetName); return; }
  if (handleReorderClick(context, target)) return;
  const actionButton = target.closest<HTMLElement>("[data-action]"); if (!actionButton) return;
  if (handleTextListAction(context, actionButton)) return;
  const action = actionButton.dataset.action;
  if (action === "add-offer") addOffer(context);
  if (action === "remove-offer") removeOffer(context, actionButton.closest<HTMLElement>("[data-offer-card]")?.dataset.offerId ?? "");
  if (action === "export") void exportHtml(context);
  if (action === "download-backup") downloadBackup(context);
  if (action === "restore-backup") context.backupInput.click();
  if (action === "undo") undo(context);
  if (action === "redo") redo(context);
  if (action === "reset") void resetBuilder(context);
}

export function handleInput(context: UiContext, event: Event): void {
  const target = event.target; if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) return;
  if (target === context.backupInput && target.files?.[0]) { void restoreBackup(context, target.files[0]); return; }
  if (target.matches("[data-layout-visible]")) {
    const key = target.closest<HTMLElement>("[data-section-key]")?.dataset.sectionKey as SectionKey | undefined; if (!key || !(target instanceof HTMLInputElement)) return;
    context.store.flushHistoryGroup();
    context.store.mutate((draft) => { draft.layout.visibility[key] = target.checked; }, { intent: { type: "set-section-visibility", section: key }, history: { label: `${sectionLabel(key)} ${target.checked ? "eingeblendet" : "ausgeblendet"}`, target: { kind: "panel", panel: "structure" } } });
    renderStructure(context); return;
  }
  const bind = target.dataset.bind;
  if (bind === "theme.primary" || bind === "theme.accent") {
    context.store.flushHistoryGroup();
    context.store.mutate((draft) => setAtPath(draft, bind, inputValue(target)), { intent: { type: "set-theme" }, history: { label: bind === "theme.primary" ? "Primärfarbe geändert" : "Akzentfarbe geändert", target: { kind: "panel", panel: "design" } } });
    return;
  }
  if (bind && bind in EDITOR_FIELD_REGISTRY) {
    const field = bind as StaticEditableField;
    try { context.store.mutate((draft) => setAtPath(draft, field, inputValue(target)), { intent: { type: "set-field", field }, history: { key: `field:${field}`, label: EDITOR_FIELD_REGISTRY[field].historyLabel, target: { kind: "field", field } } }); } catch (error) { console.error(error); }
    return;
  }
  if (handleTextListInput(context, target)) return;
  const field = target.dataset.offerField as "title" | "text" | undefined;
  const card = target.closest<HTMLElement>("[data-offer-card]");
  if (field && card?.dataset.offerId) {
    const offerId = card.dataset.offerId;
    context.store.mutate((draft) => { const offer = draft.offers.find((item) => item.id === offerId); if (offer) offer[field] = target.value; }, { intent: { type: "set-offer-field", offerId, field }, history: { key: `offer:${offerId}:${field}`, label: field === "title" ? "Klangmoment-Titel geändert" : "Klangmoment-Beschreibung geändert", target: { kind: "offer", offerId, field } } });
    if (field === "title") { const number = card.querySelector<HTMLElement>("[data-offer-number]"); const index = context.store.snapshot.offers.findIndex((offer) => offer.id === offerId); if (number) number.textContent = `${index + 1}. ${target.value || "Klangmoment"}`; }
  }
}

function addOffer(context: UiContext): void {
  if (context.store.snapshot.offers.length >= MAX_OFFERS) { showToast(`Du kannst höchstens ${MAX_OFFERS} Klangmomente anlegen.`); return; }
  context.store.flushHistoryGroup();
  const offerId = createId("offer");
  context.store.mutate((draft) => { draft.offers.push({ id: offerId, title: "Neuer Klangmoment", text: "" }); }, { intent: { type: "insert-collection-item", collection: "offers", itemId: offerId }, history: { label: "Klangmoment hinzugefügt", target: { kind: "offer", offerId, field: "title" } } });
  renderOffers(context);
}
function removeOffer(context: UiContext, id: string): void {
  if (!id) return; const offer = context.store.snapshot.offers.find((item) => item.id === id); if (!offer) return; const meaningful = offer.title.trim() || offer.text.trim();
  if (meaningful && !window.confirm(`„${offer.title.trim() || "Dieser Klangmoment"}“ wirklich entfernen? Du kannst den Schritt danach rückgängig machen.`)) return;
  context.store.flushHistoryGroup();
  context.store.mutate((draft) => { draft.offers = draft.offers.filter((item) => item.id !== id); }, { intent: { type: "remove-collection-item", collection: "offers", itemId: id }, history: { label: `Klangmoment „${offer.title.trim() || "Ohne Titel"}“ entfernt`, target: { kind: "panel", panel: "services" } } });
  renderOffers(context); showToast("Klangmoment entfernt. Rückgängig ist weiterhin möglich.");
}
function applyPreset(context: UiContext, name: ThemePresetName): void {
  const preset = PRESETS[name]; if (!preset) return; context.store.flushHistoryGroup();
  context.store.mutate((draft) => { draft.theme.preset = name; draft.theme.primary = preset.primary; draft.theme.accent = preset.accent; }, { intent: { type: "set-theme" }, history: { label: `Farbwelt „${presetLabel(name)}“ gewählt`, target: { kind: "panel", panel: "design" } } });
  syncPresetInputs(context, name);
}

async function exportHtml(context: UiContext): Promise<void> {
  const buttons = [...document.querySelectorAll<HTMLButtonElement>('[data-action="export"]')]; const labels = buttons.map((button) => button.textContent ?? ""); buttons.forEach((button) => { button.disabled = true; button.textContent = "Export wird vorbereitet …"; });
  let heroImageUrl = MUSICRAUM_HERO_URL; let embedded = true;
  try { heroImageUrl = await fetchAsDataUrl(MUSICRAUM_HERO_URL); } catch (error) { embedded = false; console.warn("Das Titelbild konnte nicht eingebettet werden.", error); }
  try { const html = buildWebsiteHtml(context.store.snapshot as MusicraumDraft, { heroImageUrl }); downloadBlob(new Blob([html], { type: "text/html;charset=utf-8" }), `${slugify(context.store.snapshot.site.name || "musikraum")}.html`); showToast(embedded ? "Website fertig: Eine vollständige HTML-Datei wurde heruntergeladen." : "Website exportiert. Das Titelbild benötigt beim Öffnen eine Internetverbindung."); }
  finally { buttons.forEach((button, index) => { button.disabled = false; button.textContent = labels[index] ?? "HTML exportieren"; }); }
}
async function fetchAsDataUrl(url: string): Promise<string> { const response = await fetch(url); if (!response.ok) throw new Error(`ASSET_FETCH_FAILED:${response.status}`); const blob = await response.blob(); return await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error ?? new Error("ASSET_READ_FAILED")); reader.readAsDataURL(blob); }); }
function downloadBlob(blob: Blob, filename: string): void { const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 0); }
function downloadBackup(context: UiContext): void { const name = slugify(context.store.snapshot.site.name || "musikraum"); downloadBlob(new Blob([JSON.stringify(context.store.snapshot, null, 2)], { type: "application/json;charset=utf-8" }), `${name}-sicherung.json`); showToast("Sicherung heruntergeladen. Bewahre die JSON-Datei gut auf."); }
async function restoreBackup(context: UiContext, file: File): Promise<void> {
  try {
    if (!isBackupFileSizeAllowed(file)) { showToast("Diese Sicherung ist zu gross. Bitte verwende eine Musikraum-Sicherung unter 1 MB."); return; }
    const parsed: unknown = JSON.parse(await file.text()); const imported = normalizeDraft(parsed); context.store.flushHistoryGroup(); await context.store.flush(); const restored = await replaceWithImportedDraft(context.repository, context.store.snapshot as MusicraumDraft, imported); context.store.replace(restored, false, "import"); bindStaticInputs(context); renderDynamicControls(context); renderContentOverview(context); renderPreview(context); updateReadiness(context); showPanel(context, "site"); showToast("Sicherung wiederhergestellt. Prüfe kurz die Vorschau.");
  } catch (error) { console.error(error); showToast("Diese Datei ist keine gültige Musikraum-Sicherung."); } finally { context.backupInput.value = ""; }
}
function undo(context: UiContext): void {
  const mutation = context.store.undo(); if (!mutation) return; bindStaticInputs(context); renderDynamicControls(context); showToast(`„${mutation.history.label}“ wurde rückgängig gemacht.`); if (mutation.history.target) navigateToEditorTarget(context, mutation.history.target);
}
function redo(context: UiContext): void {
  const mutation = context.store.redo(); if (!mutation) return; bindStaticInputs(context); renderDynamicControls(context); showToast(`„${mutation.history.label}“ wurde wiederhergestellt.`); if (mutation.history.target) navigateToEditorTarget(context, mutation.history.target);
}
async function resetBuilder(context: UiContext): Promise<void> {
  if (!window.confirm("Alle eigenen Änderungen verwerfen und zum Musikraum-Ausgangspunkt zurückkehren?")) return;
  try { context.store.flushHistoryGroup(); await context.store.flush(); const fresh = await replaceWithFreshDraft(context.repository, context.store.snapshot as MusicraumDraft); context.store.replace(fresh, false, "reset"); bindStaticInputs(context); renderDynamicControls(context); renderContentOverview(context); renderPreview(context); updateReadiness(context); showPanel(context, "site"); showToast("Der Musikraum-Ausgangspunkt ist wiederhergestellt."); } catch (error) { console.error(error); showToast("Der Entwurf konnte nicht zurückgesetzt werden."); }
}
function sectionLabel(key: SectionKey): string { return ({ intro: "Über Franz", why: "Frei spielen", offers: "Klangabende", story: "Geschichte", contact: "Kontakt" } satisfies Record<SectionKey, string>)[key]; }
function presetLabel(name: ThemePresetName): string { return ({ musikraum: "Musikraum", waldton: "Waldton", holzklang: "Holzklang", nachtklang: "Nachtklang" } satisfies Record<ThemePresetName, string>)[name]; }
