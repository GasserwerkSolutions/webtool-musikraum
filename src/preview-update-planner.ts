import type { MusicraumDraft } from "./domain.js";
import type { DraftMutation } from "./draft-mutations.js";
import type { PreviewOperation, PreviewRegion, PreviewTarget, StaticEditableField } from "./preview-contract.js";
import { renderPreviewRegions, type PreviewRenderOptions } from "./preview-renderer.js";

export type PreviewUpdatePlan =
  | { kind: "full"; revision: number; reason: "draft-replace" | "layout" | "metadata" | "unsupported" }
  | { kind: "noop"; revision: number }
  | { kind: "patch"; revision: number; operations: readonly PreviewOperation[] };

const REGION_ORDER: readonly PreviewRegion[] = ["header", "hero", "intro", "why", "offers", "story", "contact", "footer"];
const TEXT_FIELDS: Partial<Record<StaticEditableField, PreviewRegion>> = {
  "copy.heroLabel": "hero",
  "copy.heroTitle": "hero",
  "copy.heroSubtitle": "hero",
  "copy.introLabel": "intro",
  "copy.introTitle": "intro",
  "copy.introQuote": "intro",
  "copy.introText": "intro",
  "copy.whyLabel": "why",
  "copy.whyTitle": "why",
  "copy.whyText": "why",
  "copy.offersLabel": "offers",
  "copy.offersTitle": "offers",
  "copy.offersIntro": "offers",
  "copy.storyLabel": "story",
  "copy.storyTitle": "story",
  "copy.storyText": "story",
  "copy.contactLabel": "contact",
  "copy.contactTitle": "contact",
  "copy.contactText": "contact",
};
const REGION_FIELDS: Partial<Record<StaticEditableField, readonly PreviewRegion[]>> = {
  "site.name": ["header", "contact", "footer"],
  "site.tagline": ["header", "footer"],
  "site.phone": ["contact"],
  "site.email": ["contact", "footer"],
  "site.address": ["contact", "footer"],
  "site.postalCode": ["contact", "footer"],
  "site.city": ["contact", "footer"],
  "site.instagram": ["contact"],
  "copy.heroPrimaryAction": ["hero"],
  "copy.heroSecondaryAction": ["hero"],
  "copy.navIntro": ["header"],
  "copy.navWhy": ["header"],
  "copy.navOffers": ["header"],
  "copy.navStory": ["header"],
  "copy.navContact": ["header"],
  "copy.contactEmailAction": ["contact"],
  "copy.contactPhoneAction": ["contact"],
  "copy.contactInstagramAction": ["contact"],
};

export function planPreviewUpdate(mutations: readonly DraftMutation[], draft: Readonly<MusicraumDraft>, renderOptions: PreviewRenderOptions): PreviewUpdatePlan {
  const revision = mutations.reduce((latest, mutation) => Math.max(latest, mutation.revision), renderOptions.revision);
  const regions = new Set<PreviewRegion>();
  const texts = new Map<string, Extract<PreviewOperation, { type: "patch-text" }>>();
  let patchTheme = false;

  for (const mutation of mutations) {
    const effect = mutation.effect;
    if (effect.type === "draft-replace") return { kind: "full", revision, reason: "draft-replace" };
    if (effect.type === "section-move" || effect.type === "section-visibility") return { kind: "full", revision, reason: "layout" };
    if (effect.type === "theme-set") {
      if (effect.changed.includes("preset")) return { kind: "full", revision, reason: "metadata" };
      patchTheme = true;
      continue;
    }
    if (effect.type === "field-set") {
      const regional = REGION_FIELDS[effect.field];
      if (regional) {
        for (const region of regional) if (isRegionVisible(region, draft)) regions.add(region);
        continue;
      }
      const textRegion = TEXT_FIELDS[effect.field];
      if (!textRegion) return { kind: "full", revision, reason: "unsupported" };
      if (!isRegionVisible(textRegion, draft)) continue;
      if (effect.previousPresence === "present" && effect.nextPresence === "present") {
        addText(texts, { kind: "field", field: effect.field }, fieldValue(draft, effect.field));
      } else {
        regions.add(textRegion);
      }
      continue;
    }
    if (effect.type === "text-item-set") {
      const region: PreviewRegion = effect.list === "heroPoints" ? "hero" : "intro";
      if (!isRegionVisible(region, draft)) continue;
      if (effect.previousPresence !== "present" || effect.nextPresence !== "present") { regions.add(region); continue; }
      const item = draft[effect.list].find((entry) => entry.id === effect.itemId);
      if (!item) return { kind: "full", revision, reason: "unsupported" };
      addText(texts, { kind: "text-item", list: effect.list, itemId: effect.itemId }, item.text);
      continue;
    }
    if (effect.type === "offer-field-set") {
      if (!isRegionVisible("offers", draft)) continue;
      if (effect.previousPresence !== "present" || effect.nextPresence !== "present") { regions.add("offers"); continue; }
      const offer = draft.offers.find((entry) => entry.id === effect.offerId);
      if (!offer) return { kind: "full", revision, reason: "unsupported" };
      addText(texts, { kind: "offer", offerId: effect.offerId, field: effect.field }, offer[effect.field]);
      continue;
    }
    if (effect.type === "collection-insert" || effect.type === "collection-remove" || effect.type === "collection-move") {
      const region = effect.collection === "heroPoints" ? "hero" : effect.collection === "introPoints" ? "intro" : "offers";
      if (isRegionVisible(region, draft)) regions.add(region);
      continue;
    }
    return { kind: "full", revision, reason: "unsupported" };
  }

  for (const [key, operation] of texts) {
    const region = regionForTarget(operation.target);
    if (region && regions.has(region)) texts.delete(key);
  }

  const operations: PreviewOperation[] = [];
  const orderedRegions = REGION_ORDER.filter((region) => regions.has(region));
  if (orderedRegions.length) {
    const rendered = renderPreviewRegions(orderedRegions, draft, { ...renderOptions, revision });
    for (const region of orderedRegions) {
      const html = rendered.get(region);
      if (!html) return { kind: "full", revision, reason: "unsupported" };
      operations.push({ type: "replace-region", region, html });
    }
  }
  if (patchTheme) operations.push({ type: "patch-theme", primary: draft.theme.primary, accent: draft.theme.accent });
  operations.push(...[...texts.values()].sort((left, right) => targetKey(left.target).localeCompare(targetKey(right.target))));
  return operations.length ? { kind: "patch", revision, operations } : { kind: "noop", revision };
}

function addText(targets: Map<string, Extract<PreviewOperation, { type: "patch-text" }>>, target: PreviewTarget, value: string): void {
  targets.set(targetKey(target), { type: "patch-text", target, value });
}
function targetKey(target: PreviewTarget): string { return JSON.stringify(target); }
function regionForTarget(target: PreviewTarget): PreviewRegion | null {
  if (target.kind === "offer") return "offers";
  if (target.kind === "text-item") return target.list === "heroPoints" ? "hero" : "intro";
  if (target.kind === "field") return TEXT_FIELDS[target.field] ?? REGION_FIELDS[target.field]?.[0] ?? null;
  return null;
}
function isRegionVisible(region: PreviewRegion, draft: Readonly<MusicraumDraft>): boolean {
  if (region === "header" || region === "hero" || region === "footer") return true;
  return draft.layout.visibility[region];
}
function fieldValue(draft: Readonly<MusicraumDraft>, field: StaticEditableField): string {
  const [group, key] = field.split(".") as ["site" | "copy", string];
  return String((draft[group] as unknown as Record<string, string>)[key] ?? "");
}
