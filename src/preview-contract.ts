import type { MusicraumDraft } from "./domain.js";
import { EDITOR_FIELD_REGISTRY } from "./editor-registry.js";
import type { EditorPanel, StaticEditableField, TextListKey } from "./editor-registry.js";

export type { EditorPanel, StaticEditableField, TextListKey } from "./editor-registry.js";
export { EDITOR_FIELD_REGISTRY, STATIC_FIELD_REGISTRY } from "./editor-registry.js";

export type PreviewTarget =
  | { kind: "field"; field: StaticEditableField }
  | { kind: "offer"; offerId: string; field: "title" | "text" }
  | { kind: "text-item"; list: TextListKey; itemId: string }
  | { kind: "panel"; panel: EditorPanel };
export type PreviewScrollState = { section: string; offsetWithinSection: number; fallbackScrollY: number };
export type PreviewNavigateMessage = { channel: "musikraum-preview"; version: 1; instanceId: string; action: "navigate-to-editor"; target: PreviewTarget };
export type PreviewScrollMessage = { channel: "musikraum-preview"; version: 1; instanceId: string; action: "preview-scroll"; position: PreviewScrollState };

const PANELS = new Set<EditorPanel>(["site", "hero", "content", "services", "structure", "contact", "design", "publish"]);
const FIELDS = new Set(Object.keys(EDITOR_FIELD_REGISTRY));
const TEXT_LISTS = new Set<TextListKey>(["heroPoints", "introPoints"]);
function record(value: unknown): Record<string, unknown> | null { return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null; }
export function isPreviewTarget(value: unknown, draft: Readonly<MusicraumDraft>): value is PreviewTarget {
  if (!isPreviewTargetShape(value)) return false;
  if (value.kind === "offer") return draft.offers.some((offer) => offer.id === value.offerId);
  if (value.kind === "text-item") return draft[value.list].some((item) => item.id === value.itemId);
  return true;
}
export function isPreviewTargetShape(value: unknown): value is PreviewTarget {
  const target = record(value); if (!target || typeof target.kind !== "string") return false;
  if (target.kind === "field") return typeof target.field === "string" && FIELDS.has(target.field);
  if (target.kind === "panel") return typeof target.panel === "string" && PANELS.has(target.panel as EditorPanel);
  if (target.kind === "offer") return typeof target.offerId === "string" && (target.field === "title" || target.field === "text");
  if (target.kind === "text-item") return typeof target.list === "string" && TEXT_LISTS.has(target.list as TextListKey) && typeof target.itemId === "string";
  return false;
}
export function parseNavigateMessage(value: unknown, instanceId: string, draft: Readonly<MusicraumDraft>): PreviewNavigateMessage | null {
  const message = record(value); if (!message || message.channel !== "musikraum-preview" || message.version !== 1 || message.instanceId !== instanceId || message.action !== "navigate-to-editor" || !isPreviewTargetShape(message.target)) return null;
  return message as PreviewNavigateMessage;
}
export function panelForTarget(target: PreviewTarget): EditorPanel {
  if (target.kind === "field") return EDITOR_FIELD_REGISTRY[target.field].panel;
  if (target.kind === "offer") return "services";
  if (target.kind === "text-item") return target.list === "heroPoints" ? "hero" : "content";
  return target.panel;
}
