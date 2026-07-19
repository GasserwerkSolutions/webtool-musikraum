import { PRESETS, createId, slugify } from "./domain.js";
import { replaceWithFreshDraft } from "./persistence.js";
import { buildWebsiteHtml, MUSICRAUM_HERO_URL } from "./website.js";
import { inputValue, setAtPath } from "./ui-shared.js";
import { bindStaticInputs, renderDynamicControls, renderOffers, renderPreview, renderStructure, setViewport, showPanel, showToast, syncPresetInputs, updateReadiness } from "./ui-render.js";
export function handleClick(context, event) {
    const target = event.target;
    if (!(target instanceof Element))
        return;
    const panelButton = target.closest("[data-panel-target]");
    if (panelButton) {
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
    const action = actionButton.dataset.action;
    if (action === "add-offer")
        addOffer(context);
    if (action === "remove-offer")
        removeOffer(context, actionButton.closest("[data-offer-card]")?.dataset.offerId ?? "");
    if (action === "export")
        void exportHtml(context);
    if (action === "copy-draft")
        void copyDraftData(context);
    if (action === "reset")
        void resetBuilder(context);
}
export function handleInput(context, event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement))
        return;
    if (target.matches("[data-layout-visible]")) {
        const key = target.closest("[data-section-key]")?.dataset.sectionKey;
        if (!key)
            return;
        if (!(target instanceof HTMLInputElement))
            return;
        context.store.mutate((draft) => { draft.layout.visibility[key] = target.checked; });
        renderStructure(context);
        return;
    }
    const bind = target.dataset.bind;
    if (bind) {
        try {
            context.store.mutate((draft) => setAtPath(draft, bind, inputValue(target)));
        }
        catch (error) {
            console.error(error);
        }
        return;
    }
    const field = target.dataset.offerField;
    const card = target.closest("[data-offer-card]");
    if (field && card?.dataset.offerId) {
        context.store.mutate((draft) => { const offer = draft.offers.find((item) => item.id === card.dataset.offerId); if (offer)
            offer[field] = target.value; });
        if (field === "title") {
            const number = card.querySelector("[data-offer-number]");
            const index = context.store.snapshot.offers.findIndex((offer) => offer.id === card.dataset.offerId);
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
    context.store.mutate((draft) => { const index = draft.layout.order.indexOf(key); const nextIndex = direction === "up" ? index - 1 : index + 1; if (index < 0 || nextIndex < 0 || nextIndex >= draft.layout.order.length)
        return; draft.layout.order.splice(index, 1); draft.layout.order.splice(nextIndex, 0, key); });
    renderStructure(context);
}
function addOffer(context) { context.store.mutate((draft) => { draft.offers.push({ id: createId("offer"), title: "Neuer Klangmoment", text: "" }); }); renderOffers(context); }
function removeOffer(context, id) { if (!id)
    return; context.store.mutate((draft) => { draft.offers = draft.offers.filter((offer) => offer.id !== id); }); renderOffers(context); }
function applyPreset(context, name) { const preset = PRESETS[name]; if (!preset)
    return; context.store.mutate((draft) => { draft.theme.preset = name; draft.theme.primary = preset.primary; draft.theme.accent = preset.accent; }); syncPresetInputs(context, name); }
async function exportHtml(context) {
    let heroImageUrl = MUSICRAUM_HERO_URL;
    try {
        heroImageUrl = await fetchAsDataUrl(MUSICRAUM_HERO_URL);
    }
    catch (error) {
        console.warn("Das Titelbild konnte nicht eingebettet werden.", error);
    }
    const html = buildWebsiteHtml(context.store.snapshot, { heroImageUrl });
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugify(context.store.snapshot.site.name || "musikraum")}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    showToast("Deine Website wurde als einzelne HTML-Datei exportiert.");
}
async function fetchAsDataUrl(url) { const response = await fetch(url); if (!response.ok)
    throw new Error(`ASSET_FETCH_FAILED:${response.status}`); const blob = await response.blob(); return await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error ?? new Error("ASSET_READ_FAILED")); reader.readAsDataURL(blob); }); }
async function copyDraftData(context) { try {
    await navigator.clipboard.writeText(JSON.stringify(context.store.snapshot, null, 2));
    showToast("Deine Musikraum-Sicherung wurde kopiert.");
}
catch {
    showToast("Kopieren wurde vom Browser blockiert.");
} }
async function resetBuilder(context) {
    if (!window.confirm("Alle eigenen Änderungen verwerfen und zum Musikraum-Ausgangspunkt zurückkehren?"))
        return;
    try {
        const fresh = await replaceWithFreshDraft(context.repository, context.store.snapshot);
        context.store.replace(fresh, false);
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
