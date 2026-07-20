import { PRESETS, createId, normalizeDraft, slugify } from "./domain.js";
import { replaceWithFreshDraft, replaceWithImportedDraft } from "./persistence.js";
import { EDITOR_FIELD_REGISTRY } from "./editor-registry.js";
import { buildWebsiteHtml, MUSICRAUM_HERO_URL } from "./website.js";
import { inputValue, setAtPath } from "./ui-shared.js";
import { bindStaticInputs, renderDynamicControls, renderOffers, renderPreview, renderStructure, setViewport, showPanel, showToast, syncPresetInputs, updateReadiness } from "./ui-render.js";
import { handleTextListAction, handleTextListInput } from "./text-list-actions.js";
import { ensureEditorOpen } from "./sidebar.js";
import { navigateToPreviewTarget } from "./preview-navigation.js";
export const MAX_OFFERS = 12;
export const MAX_BACKUP_BYTES = 1_000_000;
export function isBackupFileSizeAllowed(file) { return file.size <= MAX_BACKUP_BYTES; }
export function handleClick(context, event) {
    const target = event.target;
    if (!(target instanceof Element))
        return;
    const panelButton = target.closest("[data-panel-target]");
    if (panelButton) {
        ensureEditorOpen(context);
        showPanel(context, panelButton.dataset.panelTarget ?? "site");
        return;
    }
    const viewportButton = target.closest("[data-viewport]");
    if (viewportButton) {
        setViewport(context, viewportButton.dataset.viewport ?? "desktop");
        return;
    }
    const presetButton = target.closest("[data-preset]");
    if (presetButton) {
        applyPreset(context, presetButton.dataset.preset);
        return;
    }
    const layoutButton = target.closest("[data-layout-action]");
    if (layoutButton) {
        moveSection(context, layoutButton);
        return;
    }
    const actionButton = target.closest("[data-action]");
    if (!actionButton)
        return;
    if (handleTextListAction(context, actionButton))
        return;
    const action = actionButton.dataset.action;
    if (action === "add-offer")
        addOffer(context);
    if (action === "remove-offer")
        removeOffer(context, actionButton.closest("[data-offer-card]")?.dataset.offerId ?? "");
    if (action === "export")
        void exportHtml(context);
    if (action === "download-backup")
        downloadBackup(context);
    if (action === "restore-backup")
        context.backupInput.click();
    if (action === "undo")
        undo(context);
    if (action === "redo")
        redo(context);
    if (action === "reset")
        void resetBuilder(context);
}
export function handleInput(context, event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement))
        return;
    if (target === context.backupInput && target.files?.[0]) {
        void restoreBackup(context, target.files[0]);
        return;
    }
    if (target.matches("[data-layout-visible]")) {
        const key = target.closest("[data-section-key]")?.dataset.sectionKey;
        if (!key || !(target instanceof HTMLInputElement))
            return;
        context.store.flushHistoryGroup();
        context.store.mutate((draft) => { draft.layout.visibility[key] = target.checked; }, { intent: { type: "set-section-visibility", section: key }, history: { label: `${sectionLabel(key)} ${target.checked ? "eingeblendet" : "ausgeblendet"}`, target: { kind: "panel", panel: "structure" } } });
        renderStructure(context);
        return;
    }
    const bind = target.dataset.bind;
    if (bind && bind in EDITOR_FIELD_REGISTRY) {
        const field = bind;
        try {
            context.store.mutate((draft) => setAtPath(draft, field, inputValue(target)), { intent: { type: "set-field", field }, history: { key: `field:${field}`, label: EDITOR_FIELD_REGISTRY[field].historyLabel, target: { kind: "field", field } } });
        }
        catch (error) {
            console.error(error);
        }
        return;
    }
    if (handleTextListInput(context, target))
        return;
    const field = target.dataset.offerField;
    const card = target.closest("[data-offer-card]");
    if (field && card?.dataset.offerId) {
        const offerId = card.dataset.offerId;
        context.store.mutate((draft) => { const offer = draft.offers.find((item) => item.id === offerId); if (offer)
            offer[field] = target.value; }, { intent: { type: "set-offer-field", offerId, field }, history: { key: `offer:${offerId}:${field}`, label: field === "title" ? "Klangmoment-Titel geändert" : "Klangmoment-Beschreibung geändert", target: { kind: "offer", offerId, field } } });
        if (field === "title") {
            const number = card.querySelector("[data-offer-number]");
            const index = context.store.snapshot.offers.findIndex((offer) => offer.id === offerId);
            if (number)
                number.textContent = `${index + 1}. ${target.value || "Klangmoment"}`;
        }
    }
}
function moveSection(context, button) {
    const key = button.closest("[data-section-key]")?.dataset.sectionKey;
    const direction = button.dataset.layoutAction;
    if (!key || (direction !== "up" && direction !== "down"))
        return;
    context.store.flushHistoryGroup();
    context.store.mutate((draft) => { const index = draft.layout.order.indexOf(key); const nextIndex = direction === "up" ? index - 1 : index + 1; if (index < 0 || nextIndex < 0 || nextIndex >= draft.layout.order.length)
        return; draft.layout.order.splice(index, 1); draft.layout.order.splice(nextIndex, 0, key); }, { intent: { type: "move-section", section: key }, history: { label: `${sectionLabel(key)} verschoben`, target: { kind: "panel", panel: "structure" } } });
    renderStructure(context);
}
function addOffer(context) {
    if (context.store.snapshot.offers.length >= MAX_OFFERS) {
        showToast(`Du kannst höchstens ${MAX_OFFERS} Klangmomente anlegen.`);
        return;
    }
    context.store.flushHistoryGroup();
    const offerId = createId("offer");
    context.store.mutate((draft) => { draft.offers.push({ id: offerId, title: "Neuer Klangmoment", text: "" }); }, { intent: { type: "insert-collection-item", collection: "offers", itemId: offerId }, history: { label: "Klangmoment hinzugefügt", target: { kind: "offer", offerId, field: "title" } } });
    renderOffers(context);
}
function removeOffer(context, id) {
    if (!id)
        return;
    const offer = context.store.snapshot.offers.find((item) => item.id === id);
    if (!offer)
        return;
    const meaningful = offer.title.trim() || offer.text.trim();
    if (meaningful && !window.confirm(`„${offer.title.trim() || "Dieser Klangmoment"}“ wirklich entfernen? Du kannst den Schritt danach rückgängig machen.`))
        return;
    context.store.flushHistoryGroup();
    context.store.mutate((draft) => { draft.offers = draft.offers.filter((item) => item.id !== id); }, { intent: { type: "remove-collection-item", collection: "offers", itemId: id }, history: { label: `Klangmoment „${offer.title.trim() || "Ohne Titel"}“ entfernt`, target: { kind: "panel", panel: "services" } } });
    renderOffers(context);
    showToast("Klangmoment entfernt. Rückgängig ist weiterhin möglich.");
}
function applyPreset(context, name) {
    const preset = PRESETS[name];
    if (!preset)
        return;
    context.store.flushHistoryGroup();
    context.store.mutate((draft) => { draft.theme.preset = name; draft.theme.primary = preset.primary; draft.theme.accent = preset.accent; }, { intent: { type: "set-theme" }, history: { label: `Farbwelt „${presetLabel(name)}“ gewählt`, target: { kind: "panel", panel: "design" } } });
    syncPresetInputs(context, name);
}
async function exportHtml(context) {
    const buttons = [...document.querySelectorAll('[data-action="export"]')];
    const labels = buttons.map((button) => button.textContent ?? "");
    buttons.forEach((button) => { button.disabled = true; button.textContent = "Export wird vorbereitet …"; });
    let heroImageUrl = MUSICRAUM_HERO_URL;
    let embedded = true;
    try {
        heroImageUrl = await fetchAsDataUrl(MUSICRAUM_HERO_URL);
    }
    catch (error) {
        embedded = false;
        console.warn("Das Titelbild konnte nicht eingebettet werden.", error);
    }
    try {
        const html = buildWebsiteHtml(context.store.snapshot, { heroImageUrl });
        downloadBlob(new Blob([html], { type: "text/html;charset=utf-8" }), `${slugify(context.store.snapshot.site.name || "musikraum")}.html`);
        showToast(embedded ? "Website fertig: Eine vollständige HTML-Datei wurde heruntergeladen." : "Website exportiert. Das Titelbild benötigt beim Öffnen eine Internetverbindung.");
    }
    finally {
        buttons.forEach((button, index) => { button.disabled = false; button.textContent = labels[index] ?? "HTML exportieren"; });
    }
}
async function fetchAsDataUrl(url) { const response = await fetch(url); if (!response.ok)
    throw new Error(`ASSET_FETCH_FAILED:${response.status}`); const blob = await response.blob(); return await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error ?? new Error("ASSET_READ_FAILED")); reader.readAsDataURL(blob); }); }
function downloadBlob(blob, filename) { const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 0); }
function downloadBackup(context) { const name = slugify(context.store.snapshot.site.name || "musikraum"); downloadBlob(new Blob([JSON.stringify(context.store.snapshot, null, 2)], { type: "application/json;charset=utf-8" }), `${name}-sicherung.json`); showToast("Sicherung heruntergeladen. Bewahre die JSON-Datei gut auf."); }
async function restoreBackup(context, file) {
    try {
        if (!isBackupFileSizeAllowed(file)) {
            showToast("Diese Sicherung ist zu gross. Bitte verwende eine Musikraum-Sicherung unter 1 MB.");
            return;
        }
        const parsed = JSON.parse(await file.text());
        const imported = normalizeDraft(parsed);
        context.store.flushHistoryGroup();
        await context.store.flush();
        const restored = await replaceWithImportedDraft(context.repository, context.store.snapshot, imported);
        context.store.replace(restored, false, "import");
        bindStaticInputs(context);
        renderDynamicControls(context);
        renderPreview(context);
        updateReadiness(context);
        showPanel(context, "site");
        showToast("Sicherung wiederhergestellt. Prüfe kurz die Vorschau.");
    }
    catch (error) {
        console.error(error);
        showToast("Diese Datei ist keine gültige Musikraum-Sicherung.");
    }
    finally {
        context.backupInput.value = "";
    }
}
function undo(context) {
    const mutation = context.store.undo();
    if (!mutation)
        return;
    bindStaticInputs(context);
    renderDynamicControls(context);
    showToast(`„${mutation.history.label}“ wurde rückgängig gemacht.`);
    if (mutation.history.target)
        navigateToPreviewTarget(context, mutation.history.target);
}
function redo(context) {
    const mutation = context.store.redo();
    if (!mutation)
        return;
    bindStaticInputs(context);
    renderDynamicControls(context);
    showToast(`„${mutation.history.label}“ wurde wiederhergestellt.`);
    if (mutation.history.target)
        navigateToPreviewTarget(context, mutation.history.target);
}
async function resetBuilder(context) {
    if (!window.confirm("Alle eigenen Änderungen verwerfen und zum Musikraum-Ausgangspunkt zurückkehren?"))
        return;
    try {
        context.store.flushHistoryGroup();
        await context.store.flush();
        const fresh = await replaceWithFreshDraft(context.repository, context.store.snapshot);
        context.store.replace(fresh, false, "reset");
        bindStaticInputs(context);
        renderDynamicControls(context);
        renderPreview(context);
        updateReadiness(context);
        showPanel(context, "site");
        showToast("Der Musikraum-Ausgangspunkt ist wiederhergestellt.");
    }
    catch (error) {
        console.error(error);
        showToast("Der Entwurf konnte nicht zurückgesetzt werden.");
    }
}
function sectionLabel(key) { return { intro: "Über Franz", why: "Frei spielen", offers: "Klangabende", story: "Geschichte", contact: "Kontakt" }[key]; }
function presetLabel(name) { return { musikraum: "Musikraum", waldton: "Waldton", holzklang: "Holzklang", nachtklang: "Nachtklang" }[name]; }
