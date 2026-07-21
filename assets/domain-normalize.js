import { PRESETS, SCHEMA_VERSION, createDefaultDraft, createId } from "./domain-model.js";
import { normalizeHttpUrl } from "./domain-helpers.js";
import { asBoolean, asRecord, asString, safeColor, safeIso } from "./domain-coerce.js";
const SECTION_KEYS = ["intro", "why", "offers", "story", "contact"];
const PRESET_KEYS = ["musikraum", "waldton", "holzklang", "nachtklang"];
const FONT_KEYS = ["klassisch", "klar", "elegant", "modern"];
const FONT_SIZE_KEYS = ["kompakt", "normal", "gross", "sehr-gross"];
const MAX_TEXT_ITEMS = 6;
export function normalizeDraft(input) {
    const source = asRecord(input);
    if (source.schemaVersion !== SCHEMA_VERSION)
        throw new Error(`UNSUPPORTED_DRAFT_SCHEMA:${String(source.schemaVersion)}`);
    const fallback = createDefaultDraft();
    const site = asRecord(source.site);
    const copy = asRecord(source.copy);
    const layout = asRecord(source.layout);
    const visibility = asRecord(layout.visibility);
    const theme = asRecord(source.theme);
    const requestedOrder = Array.isArray(layout.order) ? layout.order.map((value) => asString(value)).filter((value) => SECTION_KEYS.includes(value)) : [];
    const order = [...new Set(requestedOrder), ...SECTION_KEYS.filter((key) => !requestedOrder.includes(key))];
    const preset = PRESET_KEYS.includes(theme.preset) ? theme.preset : fallback.theme.preset;
    const font = FONT_KEYS.includes(theme.font) ? theme.font : fallback.theme.font;
    const fontSize = FONT_SIZE_KEYS.includes(theme.fontSize) ? theme.fontSize : fallback.theme.fontSize;
    const usedOfferIds = new Set();
    const offers = Array.isArray(source.offers) ? source.offers.slice(0, 12).map((value) => {
        const row = asRecord(value);
        let id = asString(row.id).trim();
        while (!id || usedOfferIds.has(id))
            id = createId("offer");
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
        copy: Object.fromEntries(Object.keys(fallback.copy).map((key) => [key, asString(copy[key], fallback.copy[key])])),
        heroPoints: normalizeTextItems(source.heroPoints, fallback.heroPoints, "hero-point"),
        introPoints: normalizeTextItems(source.introPoints, fallback.introPoints, "intro-point"),
        offers,
        layout: { order, visibility: Object.fromEntries(SECTION_KEYS.map((key) => [key, asBoolean(visibility[key], fallback.layout.visibility[key])])) },
        theme: { preset, primary: safeColor(theme.primary, PRESETS[preset].primary), accent: safeColor(theme.accent, PRESETS[preset].accent), font, fontSize },
    };
}
function normalizeTextItems(value, fallback, prefix) {
    if (!Array.isArray(value))
        return fallback;
    const usedIds = new Set();
    return value.slice(0, MAX_TEXT_ITEMS).map((item) => {
        const row = asRecord(item);
        let id = asString(row.id).trim();
        while (!id || usedIds.has(id))
            id = createId(prefix);
        usedIds.add(id);
        return { id, text: asString(row.text) };
    });
}
export function cloneDraft(draft) { return structuredClone(draft); }
