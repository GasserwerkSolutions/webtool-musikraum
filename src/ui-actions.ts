import { PRESETS, createId, normalizeDraft, slugify, type MusicraumDraft, type SectionKey, type ThemePresetName } from "./domain.js";
import { replaceWithFreshDraft, replaceWithImportedDraft } from "./persistence.js";
import { buildWebsiteHtml, MUSICRAUM_HERO_URL } from "./website.js";
import { inputValue, setAtPath, type UiContext } from "./ui-shared.js";
import { bindStaticInputs, renderDynamicControls, renderOffers, renderPreview, renderStructure, setViewport, showPanel, showToast, syncPresetInputs, updateReadiness } from "./ui-render.js";

export function handleClick(context: UiContext, event: Event): void {
  const target = event.target; if (!(target instanceof Element)) return;
  const panelButton = target.closest<HTMLElement>("[data-panel-target]"); if (panelButton) { showPanel(context, panelButton.dataset.panelTarget ?? "site"); return; }
  const viewportButton = target.closest<HTMLElement>("[data-viewport]"); if (viewportButton) { setViewport(context, viewportButton.dataset.viewport ?? "desktop"); return; }
  const presetButton = target.closest<HTMLElement>("[data-preset]"); if (presetButton) { applyPreset(context, presetButton.dataset.preset as ThemePresetName); return; }
  const layoutButton = target.closest<HTMLElement>("[data-layout-action]"); if (layoutButton) { moveSection(context, layoutButton); return; }
  const actionButton = target.closest<HTMLElement>("[data-action]"); if (!actionButton) return;
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
    const key = target.closest<HTMLElement>("[data-section-key]")?.dataset.sectionKey as SectionKey | undefined; if (!key) return;
    if (!(target instanceof HTMLInputElement)) return;
    context.store.mutate((draft) => { draft.layout.visibility[key] = target.checked; }); renderStructure(context); return;
  }
  const bind = target.dataset.bind; if (bind) { try { context.store.mutate((draft) => setAtPath(draft, bind, inputValue(target)), `field:${bind}`); } catch (error) { console.error(error); } return; }
  const field = target.dataset.offerField as "title" | "text" | undefined;
  const card = target.closest<HTMLElement>("[data-offer-card]");
  if (field && card?.dataset.offerId) {
    context.store.mutate((draft) => { const offer = draft.offers.find((item) => item.id === card.dataset.offerId); if (offer) offer[field] = target.value; }, `offer:${card.dataset.offerId}:${field}`);
    if (field === "title") { const number = card.querySelector<HTMLElement>("[data-offer-number]"); const index = context.store.snapshot.offers.findIndex((offer) => offer.id === card.dataset.offerId); if (number) number.textContent = `${index + 1}. ${target.value || "Klangmoment"}`; }
  }
}

function moveSection(context: UiContext, button: HTMLElement): void {
  const key = button.closest<HTMLElement>("[data-section-key]")?.dataset.sectionKey as SectionKey | undefined; const direction = button.dataset.layoutAction; if (!key || (direction !== "up" && direction !== "down")) return;
  context.store.mutate((draft) => { const index = draft.layout.order.indexOf(key); const nextIndex = direction === "up" ? index - 1 : index + 1; if (index < 0 || nextIndex < 0 || nextIndex >= draft.layout.order.length) return; draft.layout.order.splice(index, 1); draft.layout.order.splice(nextIndex, 0, key); }); renderStructure(context);
}
function addOffer(context: UiContext): void { context.store.mutate((draft) => { draft.offers.push({ id: createId("offer"), title: "Neuer Klangmoment", text: "" }); }); renderOffers(context); }
function removeOffer(context: UiContext, id: string): void { if (!id) return; const offer = context.store.snapshot.offers.find((item) => item.id === id); if (!offer) return; const meaningful = offer.title.trim() || offer.text.trim(); if (meaningful && !window.confirm(`„${offer.title.trim() || "Dieser Klangmoment"}“ wirklich entfernen? Du kannst den Schritt danach rückgängig machen.`)) return; context.store.mutate((draft) => { draft.offers = draft.offers.filter((item) => item.id !== id); }); renderOffers(context); showToast("Klangmoment entfernt. Rückgängig ist weiterhin möglich."); }
function applyPreset(context: UiContext, name: ThemePresetName): void { const preset = PRESETS[name]; if (!preset) return; context.store.mutate((draft) => { draft.theme.preset = name; draft.theme.primary = preset.primary; draft.theme.accent = preset.accent; }); syncPresetInputs(context, name); }

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
async function restoreBackup(context: UiContext, file: File): Promise<void> { try { const parsed: unknown = JSON.parse(await file.text()); const restored = normalizeDraft(parsed); await replaceWithImportedDraft(context.repository, context.store.snapshot as MusicraumDraft, restored); context.store.replace(restored, false); bindStaticInputs(context); renderDynamicControls(context); renderPreview(context); updateReadiness(context); showPanel(context, "site"); showToast("Sicherung wiederhergestellt. Prüfe kurz die Vorschau."); } catch (error) { console.error(error); showToast("Diese Datei ist keine gültige Musikraum-Sicherung."); } finally { context.backupInput.value = ""; } }
function undo(context: UiContext): void { if (!context.store.undo()) return; bindStaticInputs(context); renderDynamicControls(context); showToast("Letzte Änderung rückgängig gemacht."); }
function redo(context: UiContext): void { if (!context.store.redo()) return; bindStaticInputs(context); renderDynamicControls(context); showToast("Änderung wiederhergestellt."); }
async function resetBuilder(context: UiContext): Promise<void> {
  if (!window.confirm("Alle eigenen Änderungen verwerfen und zum Musikraum-Ausgangspunkt zurückkehren?")) return;
  try { const fresh = await replaceWithFreshDraft(context.repository, context.store.snapshot as MusicraumDraft); context.store.replace(fresh, false, false); bindStaticInputs(context); renderDynamicControls(context); renderPreview(context); updateReadiness(context); showPanel(context, "site"); showToast("Der Musikraum-Ausgangspunkt ist wiederhergestellt."); } catch (error) { console.error(error); showToast("Der Entwurf konnte nicht zurückgesetzt werden."); }
}
