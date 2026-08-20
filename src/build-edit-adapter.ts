import { FONT_PRESETS, SCHEMA_VERSION, type MusicraumDraft, type SectionKey } from "./domain.js";
import type { PreviewTarget } from "./preview-contract.js";
import { evaluateReadiness } from "./readiness.js";
import { RAUM_FUER_KLANG_MEDIA, RAUM_FUER_KLANG_URL } from "./website-media.js";

export const MUSICRAUM_ADAPTER_ID = "ch.gasserwerk.musicraum" as const;
export const MUSICRAUM_ADAPTER_VERSION = "1.0.0" as const;
export const BUILD_EDIT_CORE_SCHEMA_VERSION = 2 as const;

export type AdapterDiagnostic = {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
  path: readonly (string | number)[];
  targetId?: string;
  hint?: string;
};

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

export type BuildEditRawSiteInput = {
  documentType: "raw-site-input";
  version: string;
  site: {
    name: string;
    industry: string;
    language: string;
    pageType: string;
    domain: string;
    tagline: string;
    contact: {
      email: string;
      phone: string;
      address: string;
      city: string;
      zip: string;
      country: string;
    };
  };
  theme: JsonObject;
  shared: JsonObject;
  pages: JsonObject[];
  seo: JsonObject;
  assets: JsonObject;
  extensions: JsonObject;
};

export type MusicraumAdapterResult = {
  input: BuildEditRawSiteInput;
  diagnostics: readonly AdapterDiagnostic[];
  provenance: {
    adapterId: typeof MUSICRAUM_ADAPTER_ID;
    adapterVersion: typeof MUSICRAUM_ADAPTER_VERSION;
    sourceSchemaVersion: typeof SCHEMA_VERSION;
    coreSchemaVersion: typeof BUILD_EDIT_CORE_SCHEMA_VERSION;
    sourceDraftId: string;
  };
};

const SECTION_FRAGMENT: Record<SectionKey, string> = {
  intro: "franz",
  why: "frei-spielen",
  offers: "angebote",
  story: "geschichte",
  contact: "kontakt",
};

const NAVIGATION_COPY: Record<SectionKey, keyof MusicraumDraft["copy"]> = {
  intro: "navIntro",
  why: "navWhy",
  offers: "navOffers",
  story: "navStory",
  contact: "navContact",
};

export function adaptMusicraumDraft(draft: Readonly<MusicraumDraft>): MusicraumAdapterResult {
  const source = draft;
  const font = FONT_PRESETS[source.theme.font];
  const pageId = source.draftId;
  const sections: JsonObject[] = [
    {
      id: `${pageId}:header`,
      type: "header",
      enabled: true,
      data: {
        navItems: source.layout.order
          .filter((section) => source.layout.visibility[section])
          .map((section) => ({ label: source.copy[NAVIGATION_COPY[section]], href: `#${SECTION_FRAGMENT[section]}` })),
      },
    },
    heroSection(source),
    ...source.layout.order.map((section) => contentSection(source, section)),
    {
      id: `${pageId}:footer`,
      type: "footer",
      enabled: true,
      data: { title: source.site.name, tagline: source.site.tagline },
    },
  ];
  const navigation = source.layout.order
    .filter((section) => source.layout.visibility[section])
    .map((section) => ({
      id: `${pageId}:nav:${section}`,
      label: source.copy[NAVIGATION_COPY[section]],
      link: { kind: "internal", pageId, fragment: SECTION_FRAGMENT[section] },
    }));
  const readiness = evaluateReadiness(source);
  const diagnostics = readiness.results.map((result): AdapterDiagnostic => ({
    code: `musicraum.${result.id}`,
    severity: result.severity,
    message: result.title,
    path: result.target ? pathForTarget(result.target) : [],
    ...(result.target ? { targetId: targetId(result.target) } : {}),
    ...(result.detail ? { hint: result.detail } : {}),
  }));

  return {
    input: {
      documentType: "raw-site-input",
      version: `musicraum-${source.schemaVersion}`,
      site: {
        name: source.site.name,
        industry: "creative-service",
        language: "de-CH",
        pageType: "landing",
        domain: RAUM_FUER_KLANG_URL,
        tagline: source.site.tagline,
        contact: {
          email: source.site.email,
          phone: source.site.phone,
          address: source.site.address,
          city: source.site.city,
          zip: source.site.postalCode,
          country: "CH",
        },
      },
      theme: {
        preset: source.theme.preset,
        brand: { primary: source.theme.primary, accent: source.theme.accent },
        font: { display: font.display, body: font.body },
        extensions: { musicraumFontSize: source.theme.fontSize },
      },
      shared: { navigation },
      pages: [{
        id: pageId,
        kind: "landing",
        title: source.site.name,
        description: source.copy.heroSubtitle,
        slug: "/",
        sections,
      }],
      seo: {
        canonical: RAUM_FUER_KLANG_URL,
        locale: "de_CH",
        defaultDescription: source.copy.heroSubtitle,
      },
      assets: {
        slots: [
          { id: "hero", role: "hero", source: RAUM_FUER_KLANG_MEDIA.hero },
          { id: "portrait", role: "portrait", source: RAUM_FUER_KLANG_MEDIA.portrait },
          { id: "detail", role: "detail", source: RAUM_FUER_KLANG_MEDIA.detail },
        ],
      },
      extensions: {
        adapter: {
          id: MUSICRAUM_ADAPTER_ID,
          version: MUSICRAUM_ADAPTER_VERSION,
          sourceSchemaVersion: source.schemaVersion,
          coreSchemaVersion: BUILD_EDIT_CORE_SCHEMA_VERSION,
        },
        source: {
          draftId: source.draftId,
          createdAt: source.createdAt,
          updatedAt: source.updatedAt,
        },
      },
    },
    diagnostics,
    provenance: {
      adapterId: MUSICRAUM_ADAPTER_ID,
      adapterVersion: MUSICRAUM_ADAPTER_VERSION,
      sourceSchemaVersion: SCHEMA_VERSION,
      coreSchemaVersion: BUILD_EDIT_CORE_SCHEMA_VERSION,
      sourceDraftId: source.draftId,
    },
  };
}

function heroSection(draft: Readonly<MusicraumDraft>): JsonObject {
  return {
    id: `${draft.draftId}:hero`,
    type: "hero",
    enabled: true,
    data: {
      label: draft.copy.heroLabel,
      title: draft.copy.heroTitle,
      subtitle: draft.copy.heroSubtitle,
      primaryAction: draft.copy.heroPrimaryAction,
      secondaryAction: draft.copy.heroSecondaryAction,
    },
    items: draft.heroPoints.map((item) => ({ id: item.id, text: item.text })),
    extensions: { musicraumKey: "hero" },
  };
}

function contentSection(draft: Readonly<MusicraumDraft>, section: SectionKey): JsonObject {
  const common = {
    id: `${draft.draftId}:${section}`,
    enabled: draft.layout.visibility[section],
    extensions: { musicraumKey: section, fragment: SECTION_FRAGMENT[section] },
  };
  if (section === "intro") return {
    ...common,
    type: "text",
    data: { label: draft.copy.introLabel, title: draft.copy.introTitle, quote: draft.copy.introQuote, text: draft.copy.introText },
    items: draft.introPoints.map((item) => ({ id: item.id, text: item.text })),
  };
  if (section === "why") return {
    ...common,
    type: "text",
    data: { label: draft.copy.whyLabel, title: draft.copy.whyTitle, text: draft.copy.whyText },
  };
  if (section === "offers") return {
    ...common,
    type: "services",
    data: { label: draft.copy.offersLabel, title: draft.copy.offersTitle, intro: draft.copy.offersIntro },
    items: draft.offers.map((offer) => ({ id: offer.id, title: offer.title, text: offer.text })),
  };
  if (section === "story") return {
    ...common,
    type: "text",
    data: { label: draft.copy.storyLabel, title: draft.copy.storyTitle, text: draft.copy.storyText },
  };
  return {
    ...common,
    type: "cta",
    data: {
      label: draft.copy.contactLabel,
      title: draft.copy.contactTitle,
      text: draft.copy.contactText,
      emailAction: draft.copy.contactEmailAction,
      phoneAction: draft.copy.contactPhoneAction,
      instagramAction: draft.copy.contactInstagramAction,
    },
  };
}

function targetId(target: PreviewTarget): string {
  if (target.kind === "field") return `field:${target.field}`;
  if (target.kind === "offer") return `offer:${target.offerId}:${target.field}`;
  if (target.kind === "text-item") return `text-item:${target.list}:${target.itemId}`;
  if (target.kind === "section") return `section:${target.section}`;
  return `panel:${target.panel}`;
}

function pathForTarget(target: PreviewTarget): readonly (string | number)[] {
  if (target.kind === "field") return target.field.split(".");
  if (target.kind === "offer") return ["offers", target.offerId, target.field];
  if (target.kind === "text-item") return [target.list, target.itemId];
  if (target.kind === "section") return ["layout", "visibility", target.section];
  return ["editor", target.panel];
}
