import { evaluateContentCompleteness } from "./content-policy.js";
import { EDITOR_FIELD_REGISTRY } from "./editor-registry.js";
const GROUP_ORDER = ["identity", "hero", "navigation", "intro", "why", "offers", "story", "contact"];
const GROUP_LABELS = {
    identity: "Grundlage",
    hero: "Einstieg",
    navigation: "Navigation und Bereiche",
    intro: "Über Franz",
    why: "Frei spielen",
    offers: "Klangmomente",
    story: "Geschichte",
    contact: "Kontakt",
};
const SECTION_LABELS = {
    intro: "Über Franz",
    why: "Frei spielen",
    offers: "Klangmomente",
    story: "Geschichte",
    contact: "Kontakt",
};
export function buildContentOverview(draft) {
    const groups = new Map(GROUP_ORDER.map((group) => [group, []]));
    for (const definition of Object.values(EDITOR_FIELD_REGISTRY)) {
        add(groups, definition.readinessGroup, {
            id: `field:${definition.field}`,
            label: definition.label,
            detail: summarize(fieldValue(definition.field, draft)),
            status: evaluateContentCompleteness({ kind: "field", field: definition.field }, draft),
            target: { kind: "field", field: definition.field },
        });
    }
    for (const section of draft.layout.order) {
        add(groups, "navigation", {
            id: `section:${section}`,
            label: `Bereich: ${SECTION_LABELS[section]}`,
            detail: draft.layout.visibility[section] ? "Auf der Website sichtbar" : "Auf der Website ausgeblendet",
            status: evaluateContentCompleteness({ kind: "section", section }, draft),
            target: { kind: "section", section },
        });
    }
    addCollection(groups, draft, "hero", "heroPoints", "Punkte im Titelbild", { kind: "panel", panel: "hero" });
    draft.heroPoints.forEach((item, index) => add(groups, "hero", dynamicEntry(`hero-point:${item.id}`, `Punkt im Titelbild ${index + 1}`, item.text, { kind: "text-item", list: "heroPoints", itemId: item.id }, { kind: "text-item", list: "heroPoints", itemId: item.id }, draft)));
    addCollection(groups, draft, "intro", "introPoints", "Punkte unter Über Franz", { kind: "panel", panel: "content" });
    draft.introPoints.forEach((item, index) => add(groups, "intro", dynamicEntry(`intro-point:${item.id}`, `Punkt über Franz ${index + 1}`, item.text, { kind: "text-item", list: "introPoints", itemId: item.id }, { kind: "text-item", list: "introPoints", itemId: item.id }, draft)));
    addCollection(groups, draft, "offers", "offers", "Klangmomente", { kind: "panel", panel: "services" });
    draft.offers.forEach((offer, index) => {
        add(groups, "offers", dynamicEntry(`offer-title:${offer.id}`, `Klangmoment ${index + 1}: Titel`, offer.title, { kind: "offer", offerId: offer.id, field: "title" }, { kind: "offer", offerId: offer.id, field: "title" }, draft));
        add(groups, "offers", dynamicEntry(`offer-text:${offer.id}`, `Klangmoment ${index + 1}: Beschreibung`, offer.text, { kind: "offer", offerId: offer.id, field: "text" }, { kind: "offer", offerId: offer.id, field: "text" }, draft));
    });
    return GROUP_ORDER.map((id) => ({ id, label: GROUP_LABELS[id], entries: groups.get(id) ?? [] }));
}
function addCollection(groups, draft, group, collection, label, target) {
    const count = collection === "offers"
        ? draft.offers.filter((offer) => offer.title.trim()).length
        : draft[collection].filter((item) => item.text.trim()).length;
    add(groups, group, {
        id: `collection:${collection}`,
        label,
        detail: count ? `${count} ${count === 1 ? "Eintrag" : "Einträge"}` : "Keine sichtbaren Einträge",
        status: evaluateContentCompleteness({ kind: "collection", collection }, draft),
        target,
    });
}
function dynamicEntry(id, label, value, target, policyTarget, draft) {
    return { id, label, detail: summarize(value), status: evaluateContentCompleteness(policyTarget, draft), target };
}
function add(groups, group, entry) {
    groups.get(group)?.push(entry);
}
function fieldValue(field, draft) {
    const [group, key] = field.split(".");
    return String(draft[group][key] ?? "");
}
function summarize(value) {
    const normalized = value.trim().replace(/\s+/g, " ");
    if (!normalized)
        return "Leer";
    return normalized.length > 72 ? `${normalized.slice(0, 69)}…` : normalized;
}
