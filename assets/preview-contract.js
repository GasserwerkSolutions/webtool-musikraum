import { EDITOR_FIELD_REGISTRY } from "./editor-registry.js";
export { EDITOR_FIELD_REGISTRY, STATIC_FIELD_REGISTRY } from "./editor-registry.js";
const PANELS = new Set(["site", "hero", "content", "services", "structure", "contact", "design", "publish"]);
const FIELDS = new Set(Object.keys(EDITOR_FIELD_REGISTRY));
const TEXT_LISTS = new Set(["heroPoints", "introPoints"]);
function record(value) { return value !== null && typeof value === "object" && !Array.isArray(value) ? value : null; }
export function isPreviewTarget(value, draft) {
    if (!isPreviewTargetShape(value))
        return false;
    if (value.kind === "offer")
        return draft.offers.some((offer) => offer.id === value.offerId);
    if (value.kind === "text-item")
        return draft[value.list].some((item) => item.id === value.itemId);
    return true;
}
export function isPreviewTargetShape(value) {
    const target = record(value);
    if (!target || typeof target.kind !== "string")
        return false;
    if (target.kind === "field")
        return typeof target.field === "string" && FIELDS.has(target.field);
    if (target.kind === "panel")
        return typeof target.panel === "string" && PANELS.has(target.panel);
    if (target.kind === "offer")
        return typeof target.offerId === "string" && (target.field === "title" || target.field === "text");
    if (target.kind === "text-item")
        return typeof target.list === "string" && TEXT_LISTS.has(target.list) && typeof target.itemId === "string";
    return false;
}
export function parseNavigateMessage(value, instanceId, draft) {
    const message = record(value);
    if (!message || message.channel !== "musikraum-preview" || message.version !== 1 || message.instanceId !== instanceId || message.action !== "navigate-to-editor" || !isPreviewTargetShape(message.target))
        return null;
    return message;
}
export function panelForTarget(target) {
    if (target.kind === "field")
        return EDITOR_FIELD_REGISTRY[target.field].panel;
    if (target.kind === "offer")
        return "services";
    if (target.kind === "text-item")
        return target.list === "heroPoints" ? "hero" : "content";
    return target.panel;
}
