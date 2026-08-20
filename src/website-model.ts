import {
  FONT_PRESETS,
  FONT_SIZES,
  PRESETS,
  type MusicraumDraft,
  type MusicraumOffer,
  type MusicraumTextItem,
  type SectionKey,
} from "./domain.js";
import type { JsonValue, ResolvedPage, ResolvedSite } from "../vendor/build-edit-core.mjs";

export type MusicraumWebsiteModel = {
  site: MusicraumDraft["site"];
  copy: MusicraumDraft["copy"];
  heroPoints: MusicraumTextItem[];
  introPoints: MusicraumTextItem[];
  offers: MusicraumOffer[];
  layout: MusicraumDraft["layout"];
  theme: {
    primary: string;
    accent: string;
    bg: string;
    surface: string;
    text: string;
    radius: string;
    display: string;
    body: string;
    fontScale: number;
  };
  copyrightYear: number;
};

const SECTION_KEYS: readonly SectionKey[] = ["intro", "why", "offers", "story", "contact"];
const NAV_FIELD: Record<SectionKey, keyof MusicraumDraft["copy"]> = {
  intro: "navIntro",
  why: "navWhy",
  offers: "navOffers",
  story: "navStory",
  contact: "navContact",
};
const SECTION_FRAGMENT: Record<SectionKey, string> = {
  intro: "franz",
  why: "frei-spielen",
  offers: "angebote",
  story: "geschichte",
  contact: "kontakt",
};

export function websiteModelFromDraft(draft: Readonly<MusicraumDraft>): MusicraumWebsiteModel {
  const preset = PRESETS[draft.theme.preset] ?? PRESETS.musikraum;
  const font = FONT_PRESETS[draft.theme.font] ?? FONT_PRESETS.klassisch;
  const fontSize = FONT_SIZES[draft.theme.fontSize] ?? FONT_SIZES.normal;
  return {
    site: structuredClone(draft.site),
    copy: structuredClone(draft.copy),
    heroPoints: structuredClone(draft.heroPoints),
    introPoints: structuredClone(draft.introPoints),
    offers: structuredClone(draft.offers),
    layout: structuredClone(draft.layout),
    theme: {
      ...preset,
      primary: draft.theme.primary,
      accent: draft.theme.accent,
      display: font.display,
      body: font.body,
      fontScale: fontSize.scale,
    },
    copyrightYear: isoYear(draft.updatedAt),
  };
}

export function websiteModelFromResolved(page: ResolvedPage, resolved: ResolvedSite): MusicraumWebsiteModel {
  const site = asRecord(resolved.site, "site");
  const contact = asRecord(site.contact, "site.contact");
  const contactExtensions = optionalRecord(contact.extensions);
  const theme = asRecord(resolved.theme, "theme");
  const brand = asRecord(theme.brand, "theme.brand");
  const font = asRecord(theme.font, "theme.font");
  const themeExtensions = optionalRecord(theme.extensions);
  const presetName = text(theme.preset);
  const preset = isPreset(presetName) ? PRESETS[presetName] : PRESETS.musikraum;
  const fontSizeName = text(themeExtensions.musicraumFontSize);
  const fontSize = isFontSize(fontSizeName) ? FONT_SIZES[fontSizeName] : FONT_SIZES.normal;
  const hero = section(page, "hero");
  const intro = section(page, "intro");
  const why = section(page, "why");
  const offers = section(page, "offers");
  const story = section(page, "story");
  const contactSection = section(page, "contact");
  const header = page.sections.find((entry) => entry.type === "header");
  const nav = navigationLabels(header?.data);
  const heroData = asRecord(hero.data, "hero.data");
  const introData = asRecord(intro.data, "intro.data");
  const whyData = asRecord(why.data, "why.data");
  const offersData = asRecord(offers.data, "offers.data");
  const storyData = asRecord(story.data, "story.data");
  const contactData = asRecord(contactSection.data, "contact.data");
  const order = page.sections.flatMap((entry) => {
    const key = text(optionalRecord(entry.extensions).musicraumKey);
    return isSectionKey(key) ? [key] : [];
  });
  const visibility = Object.fromEntries(SECTION_KEYS.map((key) => [key, section(page, key).enabled])) as Record<SectionKey, boolean>;

  return {
    site: {
      name: text(site.name),
      tagline: text(site.tagline),
      phone: text(contact.phone),
      email: text(contact.email),
      address: text(contact.address),
      postalCode: text(contact.zip),
      city: text(contact.city),
      instagram: text(contactExtensions.instagram),
    },
    copy: {
      heroLabel: text(heroData.label), heroTitle: text(heroData.title), heroSubtitle: text(heroData.subtitle),
      heroPrimaryAction: text(heroData.primaryAction), heroSecondaryAction: text(heroData.secondaryAction),
      navIntro: nav.intro, navWhy: nav.why, navOffers: nav.offers, navStory: nav.story, navContact: nav.contact,
      introLabel: text(introData.label), introTitle: text(introData.title), introQuote: text(introData.quote), introText: text(introData.text),
      whyLabel: text(whyData.label), whyTitle: text(whyData.title), whyText: text(whyData.text),
      offersLabel: text(offersData.label), offersTitle: text(offersData.title), offersIntro: text(offersData.intro),
      storyLabel: text(storyData.label), storyTitle: text(storyData.title), storyText: text(storyData.text),
      contactLabel: text(contactData.label), contactTitle: text(contactData.title), contactText: text(contactData.text),
      contactEmailAction: text(contactData.emailAction), contactPhoneAction: text(contactData.phoneAction), contactInstagramAction: text(contactData.instagramAction),
    },
    heroPoints: textItems(hero.items),
    introPoints: textItems(intro.items),
    offers: offerItems(offers.items),
    layout: { order, visibility },
    theme: {
      ...preset,
      primary: text(brand.primary) || preset.primary,
      accent: text(brand.accent) || preset.accent,
      display: text(font.display) || FONT_PRESETS.klassisch.display,
      body: text(font.body) || FONT_PRESETS.klassisch.body,
      fontScale: fontSize.scale,
    },
    copyrightYear: isoYear(resolved.build.timestamp),
  };
}

export function mediaFromResolved(resolved: ResolvedSite): { hero?: string; portrait?: string; detail?: string } {
  const slots = optionalRecord(resolved.assets).slots;
  if (!Array.isArray(slots)) return {};
  const entries = slots.flatMap((value) => {
    const slot = optionalRecord(value);
    const id = text(slot.id);
    const source = text(slot.source);
    return (id === "hero" || id === "portrait" || id === "detail") && source ? [[id, source] as const] : [];
  });
  return Object.fromEntries(entries);
}

function section(page: ResolvedPage, key: SectionKey | "hero") {
  const found = page.sections.find((entry) => text(optionalRecord(entry.extensions).musicraumKey) === key);
  if (!found) throw new Error(`MUSICRAUM_RENDER_CONTRACT: missing ${key} section`);
  return found;
}
function navigationLabels(value: unknown): Record<SectionKey, string> {
  const result = Object.fromEntries(SECTION_KEYS.map((key) => [key, ""])) as Record<SectionKey, string>;
  const items = optionalRecord(value).navItems;
  if (!Array.isArray(items)) return result;
  for (const value of items) {
    const item = optionalRecord(value);
    const href = text(item.href);
    const match = SECTION_KEYS.find((key) => href === `#${SECTION_FRAGMENT[key]}`);
    if (match) result[match] = text(item.label);
  }
  return result;
}
function textItems(values: Array<Record<string, JsonValue>>): MusicraumTextItem[] {
  return values.map((value) => ({ id: text(value.sourceId) || text(value.id), text: text(value.text) }));
}
function offerItems(values: Array<Record<string, JsonValue>>): MusicraumOffer[] {
  return values.map((value) => ({ id: text(value.sourceId) || text(value.id), title: text(value.title), text: text(value.text) }));
}
function asRecord(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`MUSICRAUM_RENDER_CONTRACT: ${path} must be an object`);
  return value as Record<string, unknown>;
}
function optionalRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function text(value: unknown): string { return typeof value === "string" ? value : ""; }
function isSectionKey(value: string): value is SectionKey { return SECTION_KEYS.includes(value as SectionKey); }
function isPreset(value: string): value is keyof typeof PRESETS { return value in PRESETS; }
function isFontSize(value: string): value is keyof typeof FONT_SIZES { return value in FONT_SIZES; }
function isoYear(value: string): number {
  const year = new Date(value).getUTCFullYear();
  return Number.isInteger(year) ? year : 2000;
}
