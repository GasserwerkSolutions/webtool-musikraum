import type { MusicraumDraft } from "./domain.js";
import { evaluateContentCompleteness, type ContentCompleteness, type ContentPolicyTarget } from "./content-policy.js";
import { EDITOR_FIELD_REGISTRY, type ReadinessGroup, type StaticEditableField } from "./editor-registry.js";
import type { PreviewTarget } from "./preview-contract.js";

export type ContentOverviewEntry = {
  id: string;
  label: string;
  detail: string;
  status: ContentCompleteness;
  target: PreviewTarget;
};

export type ContentOverviewGroup = {
  id: ReadinessGroup;
  label: string;
  entries: readonly ContentOverviewEntry[];
};

const GROUP_ORDER: readonly ReadinessGroup[] = ["identity", "hero", "navigation", "intro", "why", "offers", "story", "contact"];
const GROUP_LABELS: Record<ReadinessGroup, string> = {
  identity: "Grundlage",
  hero: "Einstieg",
  navigation: "Navigation",
  intro: "Über Franz",
  why: "Frei spielen",
  offers: "Klangmomente",
  story: "Geschichte",
  contact: "Kontakt",
};

export function buildContentOverview(draft: Readonly<MusicraumDraft>): readonly ContentOverviewGroup[] {
  const groups = new Map<ReadinessGroup, ContentOverviewEntry[]>(GROUP_ORDER.map((group) => [group, []]));
  for (const definition of Object.values(EDITOR_FIELD_REGISTRY)) {
    add(groups, definition.readinessGroup, {
      id: `field:${definition.field}`,
      label: definition.label,
      detail: summarize(fieldValue(definition.field, draft)),
      status: evaluateContentCompleteness({ kind: "field", field: definition.field }, draft),
      target: { kind: "field", field: definition.field },
    });
  }

  addCollection(groups, draft, "hero", "heroPoints", "Punkte im Titelbild", { kind: "panel", panel: "hero" });
  draft.heroPoints.forEach((item, index) => add(groups, "hero", dynamicEntry(
    `hero-point:${item.id}`,
    `Punkt im Titelbild ${index + 1}`,
    item.text,
    { kind: "text-item", list: "heroPoints", itemId: item.id },
    { kind: "text-item", list: "heroPoints", itemId: item.id },
    draft,
  )));

  addCollection(groups, draft, "intro", "introPoints", "Punkte unter Über Franz", { kind: "panel", panel: "content" });
  draft.introPoints.forEach((item, index) => add(groups, "intro", dynamicEntry(
    `intro-point:${item.id}`,
    `Punkt über Franz ${index + 1}`,
    item.text,
    { kind: "text-item", list: "introPoints", itemId: item.id },
    { kind: "text-item", list: "introPoints", itemId: item.id },
    draft,
  )));

  addCollection(groups, draft, "offers", "offers", "Klangmomente", { kind: "panel", panel: "services" });
  draft.offers.forEach((offer, index) => {
    add(groups, "offers", dynamicEntry(
      `offer-title:${offer.id}`,
      `Klangmoment ${index + 1}: Titel`,
      offer.title,
      { kind: "offer", offerId: offer.id, field: "title" },
      { kind: "offer", offerId: offer.id, field: "title" },
      draft,
    ));
    add(groups, "offers", dynamicEntry(
      `offer-text:${offer.id}`,
      `Klangmoment ${index + 1}: Beschreibung`,
      offer.text,
      { kind: "offer", offerId: offer.id, field: "text" },
      { kind: "offer", offerId: offer.id, field: "text" },
      draft,
    ));
  });

  return GROUP_ORDER.map((id) => ({ id, label: GROUP_LABELS[id], entries: groups.get(id) ?? [] }));
}

function addCollection(
  groups: Map<ReadinessGroup, ContentOverviewEntry[]>,
  draft: Readonly<MusicraumDraft>,
  group: ReadinessGroup,
  collection: "heroPoints" | "introPoints" | "offers",
  label: string,
  target: PreviewTarget,
): void {
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

function dynamicEntry(
  id: string,
  label: string,
  value: string,
  target: PreviewTarget,
  policyTarget: ContentPolicyTarget,
  draft: Readonly<MusicraumDraft>,
): ContentOverviewEntry {
  return { id, label, detail: summarize(value), status: evaluateContentCompleteness(policyTarget, draft), target };
}

function add(groups: Map<ReadinessGroup, ContentOverviewEntry[]>, group: ReadinessGroup, entry: ContentOverviewEntry): void {
  groups.get(group)?.push(entry);
}

function fieldValue(field: StaticEditableField, draft: Readonly<MusicraumDraft>): string {
  const [group, key] = field.split(".") as ["site" | "copy", string];
  return String((draft[group] as unknown as Record<string, string>)[key] ?? "");
}

function summarize(value: string): string {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) return "Leer";
  return normalized.length > 72 ? `${normalized.slice(0, 69)}…` : normalized;
}
