import { escapeAttr, escapeHtml, type MusicraumDraft, type MusicraumTextItem } from "./domain.js";
import {
  EDITOR_FIELD_REGISTRY,
  PREVIEW_CHANNEL,
  PREVIEW_PROTOCOL_VERSION,
  type EditorPanel,
  type PreviewTarget,
  type StaticEditableField,
  type TextListKey,
} from "./preview-contract.js";
import { buildPreviewBridgeScript } from "./preview-bridge.js";
import type { BuildOptions } from "./website-contract.js";

export function renderTextList(items: readonly MusicraumTextItem[], list: TextListKey, tag: "span" | "li", options: BuildOptions): string {
  return items.filter((item) => item.text.trim()).map((item) => {
    const value = escapeHtml(item.text);
    return options.preview
      ? `<${tag} class="preview-edit-trigger"${previewTargetAttr(options, { kind: "text-item", list, itemId: item.id }, `${list}-${item.id}`)}>${value}</${tag}>`
      : `<${tag}>${value}</${tag}>`;
  }).join("");
}

export function previewBridge(options: BuildOptions): string {
  return buildPreviewBridgeScript({
    channel: PREVIEW_CHANNEL,
    version: PREVIEW_PROTOCOL_VERSION,
    instanceId: options.previewInstanceId ?? "",
    renderGeneration: options.renderGeneration ?? 0,
    revision: options.previewRevision ?? 0,
    parentOrigin: options.parentOrigin ?? "*",
    restore: options.previewScroll ?? null,
  });
}


export function buildMailtoHref(email: string, siteName: string): string {
  return `mailto:${encodeURIComponent(email)}?${new URLSearchParams({ subject: `Anfrage ${siteName}` }).toString()}`;
}

export function previewTargetAttr(options: BuildOptions, target: PreviewTarget, occurrence: string, interactive = false): string {
  if (!options.preview) return "";
  const accessibleName = `${previewTargetLabel(target)} bearbeiten`;
  return ` data-preview-target="${escapeAttr(JSON.stringify(target))}" data-preview-occurrence="${escapeAttr(occurrence)}" aria-label="${escapeAttr(accessibleName)}"${interactive ? "" : ' tabindex="0" role="button"'}`;
}
export function previewTargetLabel(target: PreviewTarget): string {
  if (target.kind === "field") return EDITOR_FIELD_REGISTRY[target.field].label;
  if (target.kind === "offer") return target.field === "title" ? "Klangmoment-Titel" : "Klangmoment-Beschreibung";
  if (target.kind === "text-item") return target.list === "heroPoints" ? "Punkt im Einstieg" : "Punkt über Franz";
  return "Bearbeitungsbereich";
}
export function previewSectionAttr(options: BuildOptions, section: string, panel: EditorPanel): string { return options.preview ? ` data-preview-section="${escapeAttr(section)}" data-preview-panel="${panel}"` : ""; }
export function previewRegionAttr(options: BuildOptions, region: string): string { return options.preview ? ` data-preview-region="${escapeAttr(region)}"` : ""; }
export function editable(value: string, field: StaticEditableField, occurrence: string, options: BuildOptions): string { return options.preview ? `<span class="preview-edit-trigger"${previewTargetAttr(options, { kind: "field", field }, occurrence)}>${escapeHtml(value)}</span>` : escapeHtml(value); }
export function editableOffer(value: string, offerId: string, field: "title" | "text", occurrence: string, options: BuildOptions): string { return options.preview ? `<span class="preview-edit-trigger"${previewTargetAttr(options, { kind: "offer", offerId, field }, occurrence)}>${escapeHtml(value)}</span>` : escapeHtml(value); }
export function previewAction(value: string, field: StaticEditableField, href: string, classes: string, occurrence: string, options: BuildOptions): string { return options.preview ? `<button class="${classes} preview-action" type="button"${previewTargetAttr(options, { kind: "field", field }, occurrence, true)}>${escapeHtml(value)}</button>` : `<a class="${classes}" href="${href}">${escapeHtml(value)}</a>`; }
export function previewLink(value: string, field: StaticEditableField, href: string, classes: string, occurrence: string, options: BuildOptions): string { return options.preview ? `<a class="${classes}" href="${escapeAttr(href)}"${previewTargetAttr(options, { kind: "field", field }, occurrence, true)}>${escapeHtml(value)}</a>` : `<a class="${classes}" href="${escapeAttr(href)}">${escapeHtml(value)}</a>`; }
export function previewNavigationLink(value: string, field: StaticEditableField, href: string, occurrence: string, options: BuildOptions): string { return options.preview ? `<a href="${href}"${previewTargetAttr(options, { kind: "field", field }, occurrence, true)}>${escapeHtml(value)}</a>` : `<a href="${href}">${escapeHtml(value)}</a>`; }
export function addressParts(draft: MusicraumDraft, prefix: string, options: BuildOptions): string {
  const street = draft.site.address ? editable(draft.site.address, "site.address", `${prefix}-street`, options) : "";
  const postal = draft.site.postalCode ? editable(draft.site.postalCode, "site.postalCode", `${prefix}-postal-code`, options) : "";
  const city = draft.site.city ? editable(draft.site.city, "site.city", `${prefix}-city`, options) : "";
  return [street, [postal, city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
}

