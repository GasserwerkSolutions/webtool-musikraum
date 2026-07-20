import { normalizeEmail, normalizeInstagramUrl, normalizePhone, type MusicraumDraft, type SectionKey } from "./domain.js";
import type { PreviewTarget } from "./preview-contract.js";

export type ReadinessSeverity = "info" | "warning" | "error";
export type ReadinessResult = {
  id: string;
  ruleId: string;
  severity: ReadinessSeverity;
  title: string;
  detail: string;
  target?: PreviewTarget;
  section?: SectionKey;
  order: number;
};
export type ReadinessRule = {
  id: string;
  order: number;
  evaluate(draft: Readonly<MusicraumDraft>): readonly ReadinessResult[];
};
export type ReadinessSummary = {
  results: readonly ReadinessResult[];
  errorCount: number;
  warningCount: number;
  infoCount: number;
  ready: boolean;
  clean: boolean;
};

const NAVIGATION_FIELDS: Record<SectionKey, keyof MusicraumDraft["copy"]> = {
  intro: "navIntro",
  why: "navWhy",
  offers: "navOffers",
  story: "navStory",
  contact: "navContact",
};
const SECTION_LABELS: Record<SectionKey, string> = {
  intro: "Über Franz",
  why: "Frei spielen",
  offers: "Klangabende",
  story: "Geschichte",
  contact: "Kontakt",
};

export const READINESS_RULES: readonly ReadinessRule[] = [
  {
    id: "identity",
    order: 10,
    evaluate(draft) {
      return draft.site.name.trim() ? [] : [result("identity:site-name:missing", "identity", "error", "Name der Website fehlt", "Trage einen Namen ein, damit Titel, Kopfzeile und Dateiname eindeutig sind.", { kind: "field", field: "site.name" }, undefined, 10)];
    },
  },
  {
    id: "hero",
    order: 20,
    evaluate(draft) {
      const results: ReadinessResult[] = [];
      const title = draft.copy.heroTitle.trim();
      const subtitle = draft.copy.heroSubtitle.trim();
      if (!title) results.push(result("hero:title:missing", "hero", "error", "Haupttitel fehlt", "Der Einstieg benötigt einen aussagekräftigen Haupttitel.", { kind: "field", field: "copy.heroTitle" }, undefined, 20));
      else if (title.length > 85) results.push(result("hero:title:too-long", "hero", "warning", "Haupttitel ist sehr lang", `Der Haupttitel umfasst ${title.length} Zeichen. Kürzere Titel bleiben auf kleinen Bildschirmen ruhiger.`, { kind: "field", field: "copy.heroTitle" }, undefined, 20));
      if (!subtitle) results.push(result("hero:subtitle:missing", "hero", "error", "Einleitung im Einstieg fehlt", "Erkläre in ein bis drei Sätzen, was Besucherinnen und Besucher erwartet.", { kind: "field", field: "copy.heroSubtitle" }, undefined, 21));
      else if (subtitle.length > 300) results.push(result("hero:subtitle:too-long", "hero", "warning", "Einleitung im Einstieg ist sehr lang", `Die Einleitung umfasst ${subtitle.length} Zeichen. Prüfe, ob sie sich verdichten lässt.`, { kind: "field", field: "copy.heroSubtitle" }, undefined, 21));
      return results;
    },
  },
  {
    id: "layout",
    order: 30,
    evaluate(draft) {
      if (draft.layout.order.some((section) => draft.layout.visibility[section])) return [];
      const section = draft.layout.order[0] ?? "intro";
      return [result("layout:visible-section:missing", "layout", "error", "Alle Inhaltsbereiche sind ausgeblendet", "Blende mindestens einen Bereich ein, damit die Website nach dem Einstieg weiterführt.", { kind: "section", section }, section, 30)];
    },
  },
  {
    id: "contact",
    order: 40,
    evaluate(draft) {
      if (!draft.layout.visibility.contact) return [];
      const results: ReadinessResult[] = [];
      const rawEmail = draft.site.email.trim();
      const rawPhone = draft.site.phone.trim();
      const rawInstagram = draft.site.instagram.trim();
      const email = normalizeEmail(rawEmail);
      const phone = normalizePhone(rawPhone);
      const contactTarget: PreviewTarget = rawEmail ? { kind: "field", field: "site.email" } : rawPhone ? { kind: "field", field: "site.phone" } : { kind: "field", field: "site.email" };
      if (!email && !phone) results.push(result("contact:methods:missing", "contact", "error", "Keine gültige Kontaktmöglichkeit", "Hinterlege eine gültige E-Mail-Adresse oder Telefonnummer.", contactTarget, "contact", 40));
      if (rawEmail && !email) results.push(result("contact:email:invalid", "contact", "warning", "E-Mail-Adresse ist ungültig", "Die E-Mail-Adresse wird erst als Kontaktlink ausgegeben, wenn ihr Format gültig ist.", { kind: "field", field: "site.email" }, "contact", 41));
      if (rawPhone && !phone) results.push(result("contact:phone:invalid", "contact", "warning", "Telefonnummer ist ungültig", "Die Telefonnummer benötigt mindestens sechs Ziffern und darf höchstens 15 Ziffern enthalten.", { kind: "field", field: "site.phone" }, "contact", 42));
      if (rawInstagram && !normalizeInstagramUrl(rawInstagram)) results.push(result("contact:instagram:invalid", "contact", "warning", "Instagram-Adresse ist ungültig", "Verwende eine vollständige HTTPS-Adresse auf instagram.com.", { kind: "field", field: "site.instagram" }, "contact", 43));
      return results;
    },
  },
  {
    id: "offers",
    order: 50,
    evaluate(draft) {
      if (!draft.layout.visibility.offers) return [];
      const results: ReadinessResult[] = [];
      const titled = draft.offers.filter((offer) => offer.title.trim());
      if (!titled.length) results.push(result("offers:valid-offer:missing", "offers", "error", "Kein Klangmoment besitzt einen Titel", "Füge mindestens einen benannten Klangmoment hinzu oder blende den Bereich aus.", { kind: "panel", panel: "services" }, "offers", 50));
      for (const offer of draft.offers) {
        const title = offer.title.trim();
        const text = offer.text.trim();
        if (!title && text) results.push(result(`offers:${offer.id}:missing-title`, "offers", "error", "Klangmoment ohne Titel", "Die vorhandene Beschreibung benötigt einen Titel.", { kind: "offer", offerId: offer.id, field: "title" }, "offers", 51));
        else if (title && !text) results.push(result(`offers:${offer.id}:missing-text`, "offers", "warning", `„${title}“ hat keine Beschreibung`, "Eine kurze Beschreibung macht den Klangmoment verständlicher.", { kind: "offer", offerId: offer.id, field: "text" }, "offers", 52));
        else if (!title && !text) results.push(result(`offers:${offer.id}:empty`, "offers", "warning", "Leerer Klangmoment", "Entferne den leeren Eintrag oder ergänze Titel und Beschreibung.", { kind: "offer", offerId: offer.id, field: "title" }, "offers", 53));
      }
      const groups = duplicateGroups(draft.offers.map((offer) => ({ id: offer.id, value: offer.title })));
      for (const group of groups) for (const id of group.ids) results.push(result(`offers:${id}:duplicate-title`, "offers", "warning", "Klangmoment-Titel ist doppelt", `Der Titel „${group.label}“ wird mehrfach verwendet.`, { kind: "offer", offerId: id, field: "title" }, "offers", 54));
      return results;
    },
  },
  {
    id: "duplicates",
    order: 60,
    evaluate(draft) {
      const results: ReadinessResult[] = [];
      for (const list of ["heroPoints", "introPoints"] as const) {
        if (list === "introPoints" && !draft.layout.visibility.intro) continue;
        const groups = duplicateGroups(draft[list].map((item) => ({ id: item.id, value: item.text })));
        for (const group of groups) for (const id of group.ids) results.push(result(`${list}:${id}:duplicate`, "duplicates", "warning", "Listenpunkt ist doppelt", `„${group.label}“ kommt in derselben Liste mehrfach vor.`, { kind: "text-item", list, itemId: id }, list === "introPoints" ? "intro" : undefined, 60));
      }
      return results;
    },
  },
  {
    id: "navigation",
    order: 70,
    evaluate(draft) {
      const results: ReadinessResult[] = [];
      for (const section of draft.layout.order) {
        if (!draft.layout.visibility[section]) continue;
        const key = NAVIGATION_FIELDS[section];
        const value = draft.copy[key].trim();
        if (value.length > 24) results.push(result(`navigation:${section}:too-long`, "navigation", "warning", `Navigation „${SECTION_LABELS[section]}“ ist lang`, `Der Navigationstext umfasst ${value.length} Zeichen und kann auf kleinen Breiten umbrechen.`, { kind: "field", field: `copy.${key}` as Extract<PreviewTarget, { kind: "field" }>["field"] }, section, 70));
      }
      return results;
    },
  },
];

export function evaluateReadiness(draft: Readonly<MusicraumDraft>): ReadinessSummary {
  const results = READINESS_RULES.flatMap((rule) => rule.evaluate(draft)).slice().sort((left, right) => compareResults(left, right, draft));
  const errorCount = results.filter((item) => item.severity === "error").length;
  const warningCount = results.filter((item) => item.severity === "warning").length;
  const infoCount = results.filter((item) => item.severity === "info").length;
  return { results, errorCount, warningCount, infoCount, ready: errorCount === 0, clean: errorCount === 0 && warningCount === 0 };
}

function result(id: string, ruleId: string, severity: ReadinessSeverity, title: string, detail: string, target: PreviewTarget | undefined, section: SectionKey | undefined, order: number): ReadinessResult {
  return { id, ruleId, severity, title, detail, ...(target ? { target } : {}), ...(section ? { section } : {}), order };
}
function compareResults(left: ReadinessResult, right: ReadinessResult, draft: Readonly<MusicraumDraft>): number {
  const severity = severityRank(left.severity) - severityRank(right.severity);
  if (severity) return severity;
  const section = sectionRank(left.section, draft) - sectionRank(right.section, draft);
  if (section) return section;
  return left.order - right.order || left.id.localeCompare(right.id);
}
function severityRank(severity: ReadinessSeverity): number { return severity === "error" ? 0 : severity === "warning" ? 1 : 2; }
function sectionRank(section: SectionKey | undefined, draft: Readonly<MusicraumDraft>): number { return section ? draft.layout.order.indexOf(section) : -1; }
function normalized(value: string): string { return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("de-CH"); }
function duplicateGroups(values: readonly { id: string; value: string }[]): readonly { label: string; ids: readonly string[] }[] {
  const groups = new Map<string, { label: string; ids: string[] }>();
  for (const item of values) {
    const key = normalized(item.value);
    if (!key) continue;
    const group = groups.get(key) ?? { label: item.value.trim(), ids: [] };
    group.ids.push(item.id); groups.set(key, group);
  }
  return [...groups.values()].filter((group) => group.ids.length > 1).sort((left, right) => normalized(left.label).localeCompare(normalized(right.label), "de-CH"));
}
