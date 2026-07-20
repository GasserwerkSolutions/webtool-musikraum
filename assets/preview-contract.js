import { EDITOR_FIELD_REGISTRY } from "./editor-registry.js";
export { EDITOR_FIELD_REGISTRY, STATIC_FIELD_REGISTRY } from "./editor-registry.js";
export const PREVIEW_CHANNEL = "musikraum-preview";
export const PREVIEW_PROTOCOL_VERSION = 2;
const PANELS = new Set(["site", "hero", "content", "services", "structure", "contact", "design", "publish"]);
const FIELDS = new Set(Object.keys(EDITOR_FIELD_REGISTRY));
const TEXT_LISTS = new Set(["heroPoints", "introPoints"]);
const REGIONS = new Set(["header", "hero", "intro", "why", "offers", "story", "contact", "footer"]);
const FAILURE_REASONS = new Set(["stale-revision", "revision-gap", "unknown-target", "ambiguous-target", "invalid-region", "conflicting-operations", "invalid-operation", "internal-error"]);
function record(value) { return value !== null && typeof value === "object" && !Array.isArray(value) ? value : null; }
function integer(value) { return typeof value === "number" && Number.isInteger(value) && value >= 0; }
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
export function isPreviewRegion(value) { return typeof value === "string" && REGIONS.has(value); }
export function isPreviewMessageEnvelope(value, instanceId, renderGeneration) {
    const message = record(value);
    if (!message || message.channel !== PREVIEW_CHANNEL || message.version !== PREVIEW_PROTOCOL_VERSION || typeof message.instanceId !== "string" || !integer(message.renderGeneration) || !integer(message.revision))
        return false;
    if (instanceId !== undefined && message.instanceId !== instanceId)
        return false;
    if (renderGeneration !== undefined && message.renderGeneration !== renderGeneration)
        return false;
    return true;
}
export function parseNavigateMessage(value, instanceId, draft, renderGeneration) {
    if (!isPreviewMessageEnvelope(value, instanceId, renderGeneration))
        return null;
    const message = value;
    if (message.action !== "navigate-to-editor" || !isPreviewTargetShape(message.target))
        return null;
    void draft;
    return value;
}
export function parseScrollMessage(value, instanceId, renderGeneration) {
    if (!isPreviewMessageEnvelope(value, instanceId, renderGeneration))
        return null;
    const message = value;
    const position = record(message.position);
    if (message.action !== "preview-scroll" || !position || typeof position.section !== "string" || !Number.isFinite(position.offsetWithinSection) || !Number.isFinite(position.fallbackScrollY))
        return null;
    return value;
}
export function parseReadyMessage(value, instanceId, renderGeneration) {
    if (!isPreviewMessageEnvelope(value, instanceId, renderGeneration))
        return null;
    return value.action === "ready" ? value : null;
}
export function parseUpdateResult(value, instanceId, renderGeneration) {
    if (!isPreviewMessageEnvelope(value, instanceId, renderGeneration))
        return null;
    const message = value;
    if (message.action !== "update-result" || typeof message.requestId !== "string" || typeof message.success !== "boolean")
        return null;
    if (message.reason !== undefined && !FAILURE_REASONS.has(message.reason))
        return null;
    return value;
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
