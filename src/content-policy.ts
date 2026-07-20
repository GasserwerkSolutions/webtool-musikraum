import { normalizeEmail, normalizeInstagramUrl, normalizePhone, type MusicraumDraft, type SectionKey } from "./domain.js";
import { EDITOR_FIELD_REGISTRY, type ContentPolicy, type StaticEditableField, type TextListKey } from "./editor-registry.js";
import type { ContentCollection, ContentPresence } from "./draft-mutations.js";

export type ContentPolicyTarget =
  | { kind: "field"; field: StaticEditableField }
  | { kind: "text-item"; list: TextListKey; itemId: string }
  | { kind: "offer"; offerId: string; field: "title" | "text" }
  | { kind: "collection"; collection: ContentCollection }
  | { kind: "section"; section: SectionKey };

export type ContentCompleteness = "complete" | "optional-empty" | "incomplete" | "hidden";

const TEXT_ITEM_POLICY: ContentPolicy = { requirement: "optional", emptyBehavior: "omit-node", helpText: "Leere Punkte werden auf der Website nicht angezeigt." };
const TEXT_COLLECTION_POLICY: ContentPolicy = { requirement: "optional", emptyBehavior: "omit-container", helpText: "Die Liste kann leer bleiben." };
const OFFER_TITLE_POLICY: ContentPolicy = { requirement: "recommended", emptyBehavior: "omit-container", helpText: "Ohne Titel wird der gesamte Klangmoment nicht angezeigt." };
const OFFER_TEXT_POLICY: ContentPolicy = { requirement: "optional", emptyBehavior: "omit-node", helpText: "Leer lassen, um nur den Titel anzuzeigen." };
const OFFER_COLLECTION_POLICY: ContentPolicy = { requirement: "recommended", emptyBehavior: "omit-container", helpText: "Ohne gültige Klangmomente wird kein Kartenraster angezeigt." };
const SECTION_POLICY: ContentPolicy = { requirement: "recommended", emptyBehavior: "omit-container" };

export function resolveContentPolicy(target: ContentPolicyTarget, _draft: Readonly<MusicraumDraft>): ContentPolicy {
  if (target.kind === "field") return EDITOR_FIELD_REGISTRY[target.field].policy;
  if (target.kind === "text-item") return TEXT_ITEM_POLICY;
  if (target.kind === "offer") return target.field === "title" ? OFFER_TITLE_POLICY : OFFER_TEXT_POLICY;
  if (target.kind === "collection") return target.collection === "offers" ? OFFER_COLLECTION_POLICY : TEXT_COLLECTION_POLICY;
  return SECTION_POLICY;
}

export function contentPresence(target: ContentPolicyTarget, draft: Readonly<MusicraumDraft>): ContentPresence {
  if (target.kind === "field") return fieldPresence(target.field, draft);
  if (target.kind === "text-item") {
    const item = draft[target.list].find((entry) => entry.id === target.itemId);
    return item ? stringPresence(item.text) : "invalid";
  }
  if (target.kind === "offer") {
    const offer = draft.offers.find((entry) => entry.id === target.offerId);
    return offer ? stringPresence(offer[target.field]) : "invalid";
  }
  if (target.kind === "collection") {
    if (target.collection === "offers") return draft.offers.some((offer) => offer.title.trim()) ? "present" : "empty";
    return draft[target.collection].some((item) => item.text.trim()) ? "present" : "empty";
  }
  return sectionHasMeaningfulContent(target.section, draft) ? "present" : "empty";
}

export function shouldRenderContent(target: ContentPolicyTarget, draft: Readonly<MusicraumDraft>): boolean {
  if (target.kind === "section") return draft.layout.visibility[target.section];
  const policy = resolveContentPolicy(target, draft);
  const presence = contentPresence(target, draft);
  if (policy.emptyBehavior !== "conditional") return presence === "present";
  if (target.kind !== "field" || presence !== "present") return false;
  return conditionalFieldCanRender(target.field, draft);
}

export function contentHelpText(target: ContentPolicyTarget, draft: Readonly<MusicraumDraft>): string | null {
  return resolveContentPolicy(target, draft).helpText ?? null;
}

export function evaluateContentCompleteness(target: ContentPolicyTarget, draft: Readonly<MusicraumDraft>): ContentCompleteness {
  const section = sectionForTarget(target);
  if (section && !draft.layout.visibility[section]) return "hidden";
  const policy = resolveContentPolicy(target, draft);
  const presence = contentPresence(target, draft);
  if (policy.emptyBehavior === "conditional" && presence === "present" && !shouldRenderContent(target, draft)) return "incomplete";
  if (presence === "present") return "complete";
  return policy.requirement === "optional" && presence === "empty" ? "optional-empty" : "incomplete";
}

function fieldPresence(field: StaticEditableField, draft: Readonly<MusicraumDraft>): ContentPresence {
  const value = fieldValue(field, draft);
  const presence = stringPresence(value);
  if (presence === "empty") return presence;
  if (field === "site.email") return normalizeEmail(value) ? "present" : "invalid";
  if (field === "site.phone") return normalizePhone(value) ? "present" : "invalid";
  if (field === "site.instagram") return normalizeInstagramUrl(value) ? "present" : "invalid";
  return presence;
}

function conditionalFieldCanRender(field: StaticEditableField, draft: Readonly<MusicraumDraft>): boolean {
  if (field === "site.email") return Boolean(normalizeEmail(draft.site.email));
  if (field === "site.phone") return Boolean(normalizePhone(draft.site.phone));
  if (field === "site.instagram") return Boolean(normalizeInstagramUrl(draft.site.instagram));
  if (field === "copy.contactEmailAction") return Boolean(normalizeEmail(draft.site.email));
  if (field === "copy.contactPhoneAction") return Boolean(normalizePhone(draft.site.phone));
  if (field === "copy.contactInstagramAction") return Boolean(normalizeInstagramUrl(draft.site.instagram));
  if (field === "copy.heroPrimaryAction") return draft.layout.order.some((section) => draft.layout.visibility[section]);
  if (field === "copy.heroSecondaryAction") return draft.layout.visibility.contact && draft.layout.order.some((section) => section !== "contact" && draft.layout.visibility[section]);
  return true;
}

function fieldValue(field: StaticEditableField, draft: Readonly<MusicraumDraft>): string {
  const [group, key] = field.split(".") as ["site" | "copy", string];
  return String((draft[group] as unknown as Record<string, string>)[key] ?? "");
}

function stringPresence(value: string): ContentPresence { return value.trim() ? "present" : "empty"; }

function sectionForTarget(target: ContentPolicyTarget): SectionKey | null {
  if (target.kind === "section") return target.section;
  if (target.kind === "offer" || (target.kind === "collection" && target.collection === "offers")) return "offers";
  if (target.kind === "text-item") return target.list === "introPoints" ? "intro" : null;
  if (target.kind === "collection") return target.collection === "introPoints" ? "intro" : null;
  return EDITOR_FIELD_REGISTRY[target.field].section ?? null;
}

function sectionHasMeaningfulContent(section: SectionKey, draft: Readonly<MusicraumDraft>): boolean {
  if (section === "intro") return Boolean(draft.copy.introTitle.trim() || draft.copy.introQuote.trim() || draft.copy.introText.trim() || draft.introPoints.some((item) => item.text.trim()));
  if (section === "why") return Boolean(draft.copy.whyTitle.trim() || draft.copy.whyText.trim());
  if (section === "offers") return Boolean(draft.copy.offersTitle.trim() || draft.copy.offersIntro.trim() || draft.offers.some((offer) => offer.title.trim()));
  if (section === "story") return Boolean(draft.copy.storyTitle.trim() || draft.copy.storyText.trim());
  return Boolean(draft.copy.contactTitle.trim() || draft.copy.contactText.trim() || normalizeEmail(draft.site.email) || normalizePhone(draft.site.phone) || normalizeInstagramUrl(draft.site.instagram) || draft.site.address.trim() || draft.site.city.trim());
}
