import { PRESETS, createClientId, slugify, uniqueSlug, } from "./domain.js";
import { replaceWithFreshDraft } from "./persistence.js";
import { buildWebsiteHtml, MUSICRAUM_HERO_URL } from "./website.js";
import { inputValue, setAtPath } from "./ui-shared.js";
import { bindStaticInputs, renderDynamicControls, renderPresets, renderPreview, renderServices, renderStructure, setViewport, showPanel, showToast, syncPresetInputs, updateReadiness, } from "./ui-render.js";
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
    if (action === "add-service")
        addService(context);
    if (action === "remove-service")
        removeService(context, actionButton.closest("[data-service-card]")?.dataset.serviceId ?? "");
    if (action === "export")
        void exportHtml(context);
    if (action === "copy-json")
        void copyDraftData(context);
    if (action === "reset")
        void resetBuilder(context);
}
export function handleInput(context, event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement))
        return;
    const visibilityToggle = target.matches("[data-layout-visible]") ? target : null;
    if (visibilityToggle instanceof HTMLInputElement) {
        const key = visibilityToggle.closest("[data-section-key]")?.dataset.sectionKey;
        if (!key)
            return;
        context.store.mutate((draft) => { draft.layout.visibility[key] = visibilityToggle.checked; });
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
    const serviceField = target.dataset.serviceField;
    const serviceCard = target.closest("[data-service-card]");
    if (serviceField && serviceCard?.dataset.serviceId) {
        context.store.mutate((draft) => {
            const service = draft.services.find((item) => item.clientId === serviceCard.dataset.serviceId);
            if (!service)
                return;
            service[serviceField] = target.value;
            if (serviceField === "name")
                service.slug = uniqueSlug(target.value, draft.services, service.clientId);
        });
        if (serviceField === "name") {
            const number = serviceCard.querySelector("[data-service-number]");
            const index = context.store.snapshot.services.findIndex((service) => service.clientId === serviceCard.dataset.serviceId);
            if (number)
                number.textContent = `${index + 1}. ${target.value || "Angebot"}`;
        }
    }
}
function moveSection(context, button) {
    const key = button.closest("[data-section-key]")?.dataset.sectionKey;
    const direction = button.dataset.layoutAction;
    if (!key || (direction !== "up" && direction !== "down"))
        return;
    context.store.mutate((draft) => {
        const index = draft.layout.order.indexOf(key);
        const nextIndex = direction === "up" ? index - 1 : index + 1;
        if (index < 0 || nextIndex < 0 || nextIndex >= draft.layout.order.length)
            return;
        draft.layout.order.splice(index, 1);
        draft.layout.order.splice(nextIndex, 0, key);
    });
    renderStructure(context);
}
function addService(context) {
    context.store.mutate((draft) => {
        const clientId = createClientId("offer");
        const service = { clientId, slug: uniqueSlug("Neues Angebot", draft.services), category: "Klangabend", name: "Neues Angebot", description: "", durationMinutes: 60, price: 0, priceType: "on-request", bookable: true };
        draft.services.push(service);
    });
    renderServices(context);
}
function removeService(context, clientId) {
    if (!clientId)
        return;
    context.store.mutate((draft) => { draft.services = draft.services.filter((service) => service.clientId !== clientId); });
    renderServices(context);
}
function applyPreset(context, name) {
    const preset = PRESETS[name];
    if (!preset)
        return;
    context.store.mutate((draft) => { draft.theme.preset = name; draft.theme.primary = preset.primary; draft.theme.accent = preset.accent; });
    syncPresetInputs(context, name);
    renderPresets(context);
}
async function exportHtml(context) {
    let heroImageUrl = MUSICRAUM_HERO_URL;
    try {
        heroImageUrl = await fetchAsDataUrl(MUSICRAUM_HERO_URL);
    }
    catch (error) {
        console.warn("Das Titelbild konnte nicht eingebettet werden; der Export verwendet die feste Online-Quelle.", error);
    }
    const html = buildWebsiteHtml(context.store.snapshot, { heroImageUrl });
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugify(context.store.snapshot.salon.name || "musikraum")}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    showToast("Die Website wurde als einzelne HTML-Datei exportiert — inklusive Titelbild, sofern es geladen werden konnte.");
}
async function fetchAsDataUrl(url) {
    const response = await fetch(url);
    if (!response.ok)
        throw new Error(`ASSET_FETCH_FAILED:${response.status}`);
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error ?? new Error("ASSET_READ_FAILED"));
        reader.readAsDataURL(blob);
    });
}
async function copyDraftData(context) {
    try {
        await navigator.clipboard.writeText(JSON.stringify(context.store.snapshot, null, 2));
        showToast("Der Musikraum-Entwurf wurde kopiert.");
    }
    catch {
        showToast("Kopieren wurde vom Browser blockiert.");
    }
}
async function resetBuilder(context) {
    if (!window.confirm("Alle lokalen Änderungen verwerfen und den Musikraum-Entwurf zurücksetzen?"))
        return;
    try {
        const fresh = await replaceWithFreshDraft(context.repository, context.store.snapshot);
        context.store.replace(fresh, false);
        bindStaticInputs(context);
        renderDynamicControls(context);
        renderPreview(context);
        updateReadiness(context);
        showPanel(context, "site");
        showToast("Der Musikraum-Entwurf wurde zurückgesetzt.");
    }
    catch (error) {
        console.error(error);
        showToast("Der Entwurf konnte nicht vollständig zurückgesetzt werden.");
    }
}
