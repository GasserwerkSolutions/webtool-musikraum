import type { MusicraumDraft } from "./domain.js";
import { EDITOR_FIELD_REGISTRY } from "./editor-registry.js";
import type { EditorPanel, StaticEditableField, TextListKey } from "./editor-registry.js";

export type { EditorPanel, StaticEditableField, TextListKey } from "./editor-registry.js";
export { EDITOR_FIELD_REGISTRY, STATIC_FIELD_REGISTRY } from "./editor-registry.js";

export const PREVIEW_CHANNEL = "musikraum-preview" as const;
export const PREVIEW_PROTOCOL_VERSION = 2 as const;

export type PreviewTarget =
  | { kind: "field"; field: StaticEditableField }
  | { kind: "offer"; offerId: string; field: "title" | "text" }
  | { kind: "text-item"; list: TextListKey; itemId: string }
  | { kind: "panel"; panel: EditorPanel };

export type PreviewRegion = "header" | "hero" | "intro" | "why" | "offers" | "story" | "contact" | "footer";
export type PreviewScrollState = { section: string; offsetWithinSection: number; fallbackScrollY: number };

export type PreviewMessageEnvelope = {
  channel: typeof PREVIEW_CHANNEL;
  version: typeof PREVIEW_PROTOCOL_VERSION;
  instanceId: string;
  renderGeneration: number;
  revision: number;
};

export type PreviewRequestEnvelope = PreviewMessageEnvelope & {
  requestId: string;
  baseRevision: number;
};

export type PreviewOperation =
  | { type: "patch-text"; target: PreviewTarget; occurrence?: string; value: string }
  | { type: "replace-region"; region: PreviewRegion; html: string }
  | { type: "patch-theme"; primary: string; accent: string };

export type PreviewUpdateRequest = PreviewRequestEnvelope & {
  action: "apply-update";
  operations: readonly PreviewOperation[];
};

export type PreviewUpdateFailureReason =
  | "stale-revision"
  | "revision-gap"
  | "unknown-target"
  | "ambiguous-target"
  | "invalid-region"
  | "conflicting-operations"
  | "invalid-operation"
  | "internal-error";

export type PreviewUpdateResult = PreviewMessageEnvelope & {
  action: "update-result";
  requestId: string;
  success: boolean;
  reason?: PreviewUpdateFailureReason;
};

export type PreviewReadyMessage = PreviewMessageEnvelope & { action: "ready" };
export type PreviewNavigateMessage = PreviewMessageEnvelope & { action: "navigate-to-editor"; target: PreviewTarget };
export type PreviewScrollMessage = PreviewMessageEnvelope & { action: "preview-scroll"; position: PreviewScrollState };
export type PreviewIncomingMessage = PreviewReadyMessage | PreviewUpdateResult | PreviewNavigateMessage | PreviewScrollMessage;

export type PreviewBridgeConfig = PreviewMessageEnvelope & {
  parentOrigin: string;
  restore: PreviewScrollState | null;
};

const PANELS = new Set<EditorPanel>(["site", "hero", "content", "services", "structure", "contact", "design", "publish"]);
const FIELDS = new Set(Object.keys(EDITOR_FIELD_REGISTRY));
const TEXT_LISTS = new Set<TextListKey>(["heroPoints", "introPoints"]);
const REGIONS = new Set<PreviewRegion>(["header", "hero", "intro", "why", "offers", "story", "contact", "footer"]);
const FAILURE_REASONS = new Set<PreviewUpdateFailureReason>(["stale-revision", "revision-gap", "unknown-target", "ambiguous-target", "invalid-region", "conflicting-operations", "invalid-operation", "internal-error"]);

function record(value: unknown): Record<string, unknown> | null { return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null; }
function integer(value: unknown): value is number { return typeof value === "number" && Number.isInteger(value) && value >= 0; }

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

export function isPreviewRegion(value: unknown): value is PreviewRegion { return typeof value === "string" && REGIONS.has(value as PreviewRegion); }

export function isPreviewMessageEnvelope(value: unknown, instanceId?: string, renderGeneration?: number): value is PreviewMessageEnvelope {
  const message = record(value);
  if (!message || message.channel !== PREVIEW_CHANNEL || message.version !== PREVIEW_PROTOCOL_VERSION || typeof message.instanceId !== "string" || !integer(message.renderGeneration) || !integer(message.revision)) return false;
  if (instanceId !== undefined && message.instanceId !== instanceId) return false;
  if (renderGeneration !== undefined && message.renderGeneration !== renderGeneration) return false;
  return true;
}

export function parseNavigateMessage(value: unknown, instanceId: string, draft: Readonly<MusicraumDraft>, renderGeneration?: number): PreviewNavigateMessage | null {
  if (!isPreviewMessageEnvelope(value, instanceId, renderGeneration)) return null;
  const message = value as unknown as Record<string, unknown>;
  if (message.action !== "navigate-to-editor" || !isPreviewTargetShape(message.target)) return null;
  void draft;
  return value as PreviewNavigateMessage;
}

export function parseScrollMessage(value: unknown, instanceId: string, renderGeneration?: number): PreviewScrollMessage | null {
  if (!isPreviewMessageEnvelope(value, instanceId, renderGeneration)) return null;
  const message = value as unknown as Record<string, unknown>; const position = record(message.position);
  if (message.action !== "preview-scroll" || !position || typeof position.section !== "string" || !Number.isFinite(position.offsetWithinSection) || !Number.isFinite(position.fallbackScrollY)) return null;
  return value as PreviewScrollMessage;
}

export function parseReadyMessage(value: unknown, instanceId: string, renderGeneration: number): PreviewReadyMessage | null {
  if (!isPreviewMessageEnvelope(value, instanceId, renderGeneration)) return null;
  return (value as PreviewMessageEnvelope & { action?: unknown }).action === "ready" ? value as PreviewReadyMessage : null;
}

export function parseUpdateResult(value: unknown, instanceId: string, renderGeneration: number): PreviewUpdateResult | null {
  if (!isPreviewMessageEnvelope(value, instanceId, renderGeneration)) return null;
  const message = value as unknown as Record<string, unknown>;
  if (message.action !== "update-result" || typeof message.requestId !== "string" || typeof message.success !== "boolean") return null;
  if (message.reason !== undefined && !FAILURE_REASONS.has(message.reason as PreviewUpdateFailureReason)) return null;
  return value as PreviewUpdateResult;
}

export function panelForTarget(target: PreviewTarget): EditorPanel {
  if (target.kind === "field") return EDITOR_FIELD_REGISTRY[target.field].panel;
  if (target.kind === "offer") return "services";
  if (target.kind === "text-item") return target.list === "heroPoints" ? "hero" : "content";
  return target.panel;
}
