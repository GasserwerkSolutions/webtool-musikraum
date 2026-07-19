export const STATIC_FIELD_REGISTRY = {
    "site.name": { panel: "site", input: "text", previewPositions: ["Kopfzeile", "Fusszeile"] },
    "site.tagline": { panel: "site", input: "text", previewPositions: ["Kopfzeile", "Fusszeile"] },
    "site.phone": { panel: "contact", input: "tel", previewPositions: ["Kontaktknopf"] },
    "site.email": { panel: "contact", input: "email", previewPositions: ["Fusszeile"] },
    "site.address": { panel: "contact", input: "text", previewPositions: ["Kontakt", "Fusszeile"] },
    "site.postalCode": { panel: "contact", input: "text", previewPositions: ["Kontakt", "Fusszeile"] },
    "site.city": { panel: "contact", input: "text", previewPositions: ["Kontakt", "Fusszeile"] },
    "site.instagram": { panel: "contact", input: "url", previewPositions: [] },
    "copy.heroLabel": { panel: "hero", input: "text", previewPositions: ["Einstieg"] },
    "copy.heroTitle": { panel: "hero", input: "textarea", previewPositions: ["Einstieg"] },
    "copy.heroSubtitle": { panel: "hero", input: "textarea", previewPositions: ["Einstieg"] },
    "copy.heroPrimaryAction": { panel: "hero", input: "text", previewPositions: ["Erster Einstiegsknopf"] },
    "copy.heroSecondaryAction": { panel: "hero", input: "text", previewPositions: ["Kontaktknopf im Einstieg"] },
    "copy.introLabel": { panel: "content", input: "text", previewPositions: ["Über Franz"] },
    "copy.introTitle": { panel: "content", input: "text", previewPositions: ["Über Franz"] },
    "copy.introQuote": { panel: "content", input: "textarea", previewPositions: ["Über Franz"] },
    "copy.introText": { panel: "content", input: "textarea", previewPositions: ["Über Franz"] },
    "copy.whyLabel": { panel: "content", input: "text", previewPositions: ["Frei spielen"] },
    "copy.whyTitle": { panel: "content", input: "text", previewPositions: ["Frei spielen"] },
    "copy.whyText": { panel: "content", input: "textarea", previewPositions: ["Frei spielen"] },
    "copy.offersTitle": { panel: "services", input: "text", previewPositions: ["Klangmomente"] },
    "copy.offersIntro": { panel: "services", input: "textarea", previewPositions: ["Klangmomente"] },
    "copy.storyLabel": { panel: "content", input: "text", previewPositions: ["Geschichte"] },
    "copy.storyTitle": { panel: "content", input: "text", previewPositions: ["Geschichte"] },
    "copy.storyText": { panel: "content", input: "textarea", previewPositions: ["Geschichte"] },
    "copy.contactTitle": { panel: "contact", input: "text", previewPositions: ["Kontakt"] },
    "copy.contactText": { panel: "contact", input: "textarea", previewPositions: ["Kontakt"] },
};
const PANELS = new Set(["site", "hero", "content", "services", "structure", "contact", "design", "publish"]);
const FIELDS = new Set(Object.keys(STATIC_FIELD_REGISTRY));
function record(value) { return value !== null && typeof value === "object" && !Array.isArray(value) ? value : null; }
export function isPreviewTarget(value, draft) {
    const target = record(value);
    if (!target || typeof target.kind !== "string")
        return false;
    if (target.kind === "field")
        return typeof target.field === "string" && FIELDS.has(target.field);
    if (target.kind === "panel")
        return typeof target.panel === "string" && PANELS.has(target.panel);
    if (target.kind === "offer")
        return typeof target.offerId === "string" && (target.field === "title" || target.field === "text") && draft.offers.some((offer) => offer.id === target.offerId);
    return false;
}
export function parseNavigateMessage(value, instanceId, draft) {
    const message = record(value);
    if (!message || message.channel !== "musikraum-preview" || message.version !== 1 || message.instanceId !== instanceId || message.action !== "navigate-to-editor" || !isPreviewTarget(message.target, draft))
        return null;
    return message;
}
export function panelForTarget(target) { return target.kind === "field" ? STATIC_FIELD_REGISTRY[target.field].panel : target.kind === "offer" ? "services" : target.panel; }
