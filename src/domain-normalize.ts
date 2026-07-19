import { PRESETS, SCHEMA_VERSION, createDefaultDraft, createId, type MusicraumDraft, type MusicraumOffer, type SectionKey, type ThemePresetName } from "./domain-model.js";
import { normalizeHttpUrl } from "./domain-helpers.js";
import { asBoolean, asRecord, asString, safeColor, safeIso } from "./domain-coerce.js";

const SECTION_KEYS: SectionKey[] = ["intro", "why", "offers", "story", "contact"];
const PRESET_KEYS: ThemePresetName[] = ["musikraum", "waldton", "holzklang", "nachtklang"];

export function normalizeDraft(input: unknown): MusicraumDraft {
  const source = asRecord(input);
  if (source.schemaVersion !== SCHEMA_VERSION) throw new Error(`UNSUPPORTED_DRAFT_SCHEMA:${String(source.schemaVersion)}`);
  const fallback = createDefaultDraft();
  const site = asRecord(source.site);
  const copy = asRecord(source.copy);
  const layout = asRecord(source.layout);
  const visibility = asRecord(layout.visibility);
  const theme = asRecord(source.theme);
  const requestedOrder = Array.isArray(layout.order) ? layout.order.map((value) => asString(value)).filter((value): value is SectionKey => SECTION_KEYS.includes(value as SectionKey)) : [];
  const order = [...new Set(requestedOrder), ...SECTION_KEYS.filter((key) => !requestedOrder.includes(key))];
  const preset = PRESET_KEYS.includes(theme.preset as ThemePresetName) ? theme.preset as ThemePresetName : fallback.theme.preset;
  const usedOfferIds = new Set<string>();
  const offers: MusicraumOffer[] = Array.isArray(source.offers) ? source.offers.slice(0, 12).map((value) => {
    const row = asRecord(value);
    let id = asString(row.id).trim();
    while (!id || usedOfferIds.has(id)) id = createId("offer");
    usedOfferIds.add(id);
    return { id, title: asString(row.title, "Neuer Klangmoment"), text: asString(row.text) };
  }) : fallback.offers;
  const now = new Date().toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    draftId: asString(source.draftId).trim() || fallback.draftId,
    createdAt: safeIso(source.createdAt, now),
    updatedAt: safeIso(source.updatedAt, now),
    site: {
      name: asString(site.name, fallback.site.name), tagline: asString(site.tagline, fallback.site.tagline), phone: asString(site.phone, fallback.site.phone), email: asString(site.email, fallback.site.email), address: asString(site.address, fallback.site.address), postalCode: asString(site.postalCode, fallback.site.postalCode), city: asString(site.city, fallback.site.city), instagram: normalizeHttpUrl(site.instagram) ?? "",
    },
    copy: Object.fromEntries(Object.keys(fallback.copy).map((key) => [key, asString(copy[key], fallback.copy[key as keyof typeof fallback.copy])])) as MusicraumDraft["copy"],
    offers,
    layout: { order, visibility: Object.fromEntries(SECTION_KEYS.map((key) => [key, asBoolean(visibility[key], fallback.layout.visibility[key])])) as Record<SectionKey, boolean> },
    theme: { preset, primary: safeColor(theme.primary, PRESETS[preset].primary), accent: safeColor(theme.accent, PRESETS[preset].accent) },
  };
}

export function cloneDraft(draft: MusicraumDraft): MusicraumDraft { return structuredClone(draft); }
