import type { MusicraumDraft } from "./domain.js";

export type EditorPanel = "site" | "hero" | "content" | "services" | "structure" | "contact" | "design" | "publish";
export type StaticEditableField =
  | "site.name" | "site.tagline" | "site.phone" | "site.email" | "site.address" | "site.postalCode" | "site.city" | "site.instagram"
  | "copy.heroLabel" | "copy.heroTitle" | "copy.heroSubtitle" | "copy.heroPrimaryAction" | "copy.heroSecondaryAction"
  | "copy.introLabel" | "copy.introTitle" | "copy.introQuote" | "copy.introText"
  | "copy.whyLabel" | "copy.whyTitle" | "copy.whyText"
  | "copy.offersTitle" | "copy.offersIntro"
  | "copy.storyLabel" | "copy.storyTitle" | "copy.storyText"
  | "copy.contactTitle" | "copy.contactText";
export type PreviewTarget =
  | { kind: "field"; field: StaticEditableField }
  | { kind: "offer"; offerId: string; field: "title" | "text" }
  | { kind: "panel"; panel: EditorPanel };
export type PreviewScrollState = { section: string; offsetWithinSection: number; fallbackScrollY: number };
export type PreviewNavigateMessage = { channel: "musikraum-preview"; version: 1; instanceId: string; action: "navigate-to-editor"; target: PreviewTarget };
export type PreviewScrollMessage = { channel: "musikraum-preview"; version: 1; instanceId: string; action: "preview-scroll"; position: PreviewScrollState };

type InputKind = "text" | "textarea" | "email" | "tel" | "url";
type FieldMeta = { panel: EditorPanel; input: InputKind; previewPositions: readonly string[] };

export const STATIC_FIELD_REGISTRY: Record<StaticEditableField, FieldMeta> = {
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

const PANELS = new Set<EditorPanel>(["site", "hero", "content", "services", "structure", "contact", "design", "publish"]);
const FIELDS = new Set(Object.keys(STATIC_FIELD_REGISTRY));
function record(value: unknown): Record<string, unknown> | null { return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null; }
export function isPreviewTarget(value: unknown, draft: Readonly<MusicraumDraft>): value is PreviewTarget {
  const target = record(value); if (!target || typeof target.kind !== "string") return false;
  if (target.kind === "field") return typeof target.field === "string" && FIELDS.has(target.field);
  if (target.kind === "panel") return typeof target.panel === "string" && PANELS.has(target.panel as EditorPanel);
  if (target.kind === "offer") return typeof target.offerId === "string" && (target.field === "title" || target.field === "text") && draft.offers.some((offer) => offer.id === target.offerId);
  return false;
}
export function parseNavigateMessage(value: unknown, instanceId: string, draft: Readonly<MusicraumDraft>): PreviewNavigateMessage | null {
  const message = record(value); if (!message || message.channel !== "musikraum-preview" || message.version !== 1 || message.instanceId !== instanceId || message.action !== "navigate-to-editor" || !isPreviewTarget(message.target, draft)) return null;
  return message as PreviewNavigateMessage;
}
export function panelForTarget(target: PreviewTarget): EditorPanel { return target.kind === "field" ? STATIC_FIELD_REGISTRY[target.field].panel : target.kind === "offer" ? "services" : target.panel; }
