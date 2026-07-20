export const SCHEMA_VERSION = 1 as const;
export const ACTIVE_DRAFT_POINTER_KEY = "musikraum-website-werkzeug-active-draft";

export type ThemePresetName = "musikraum" | "waldton" | "holzklang" | "nachtklang";
export type SectionKey = "intro" | "why" | "offers" | "story" | "contact";
export type MusicraumTextItem = { id: string; text: string };
export type MusicraumOffer = { id: string; title: string; text: string };

export type MusicraumDraft = {
  schemaVersion: 1;
  draftId: string;
  createdAt: string;
  updatedAt: string;
  site: { name: string; tagline: string; phone: string; email: string; address: string; postalCode: string; city: string; instagram: string };
  copy: {
    heroLabel: string; heroTitle: string; heroSubtitle: string; heroPrimaryAction: string; heroSecondaryAction: string;
    navIntro: string; navWhy: string; navOffers: string; navStory: string; navContact: string;
    introLabel: string; introTitle: string; introQuote: string; introText: string;
    whyLabel: string; whyTitle: string; whyText: string;
    offersLabel: string; offersTitle: string; offersIntro: string;
    storyLabel: string; storyTitle: string; storyText: string;
    contactLabel: string; contactTitle: string; contactText: string; contactEmailAction: string; contactPhoneAction: string; contactInstagramAction: string;
  };
  heroPoints: MusicraumTextItem[];
  introPoints: MusicraumTextItem[];
  offers: MusicraumOffer[];
  layout: { order: SectionKey[]; visibility: Record<SectionKey, boolean> };
  theme: { preset: ThemePresetName; primary: string; accent: string };
};

export const PRESETS = {
  musikraum: { primary: "#403b34", accent: "#587271", bg: "#f6e4c2", surface: "#fff3dd", text: "#2f2b25", display: "Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif", body: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", radius: "12px" },
  waldton: { primary: "#3f514e", accent: "#b89a63", bg: "#edf1e9", surface: "#fbfcf8", text: "#24302d", display: "Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif", body: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", radius: "10px" },
  holzklang: { primary: "#5d4938", accent: "#8b6f47", bg: "#efe2cf", surface: "#fff9ef", text: "#302820", display: "Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif", body: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", radius: "16px" },
  nachtklang: { primary: "#252c2b", accent: "#c4a96d", bg: "#e7e2d7", surface: "#f8f5ee", text: "#202322", display: "Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif", body: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", radius: "6px" },
} satisfies Record<ThemePresetName, { primary: string; accent: string; bg: string; surface: string; text: string; display: string; body: string; radius: string }>;

export function createId(prefix: string): string {
  const id = globalThis.crypto?.randomUUID?.();
  return id ? `${prefix}-${id}` : `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createDefaultDraft(now = new Date().toISOString()): MusicraumDraft {
  return {
    schemaVersion: SCHEMA_VERSION,
    draftId: createId("musikraum"),
    createdAt: now,
    updatedAt: now,
    site: { name: "Musikraum", tagline: "Lauschen. Spielen. Entdecken.", phone: "+41 79 675 58 69", email: "info@Musikraum.ch", address: "Bielstrasse 44", postalCode: "2555", city: "Brügg", instagram: "" },
    copy: {
      heroLabel: "Klangabende · gemeinsam frei spielen", heroTitle: "Jeder Mensch ist musikalisch", heroSubtitle: "Auch du. An einem Klangabend spielen wir in der Gruppe frei zusammen — auf einfachen Instrumenten aus aller Welt, ohne Noten und ohne Druck.", heroPrimaryAction: "Klangabende entdecken", heroSecondaryAction: "Unverbindlich anfragen",
      navIntro: "Über Franz", navWhy: "Frei spielen", navOffers: "Klangabende", navStory: "Geschichte", navContact: "Kontakt",
      introLabel: "Franz Gasser", introTitle: "Aus dem Moment heraus", introQuote: "Meine Musik entsteht immer aus dem Moment, und in der Verbindung mit den Menschen, die zuhören und mitspielen.", introText: "Ich habe erlebt, dass Musik Menschen tief erreichen kann, auch ohne Theorie, Notenlesen oder Leistungsdruck. Aus dieser Erfahrung ist mein Wunsch entstanden, Menschen einen einfachen Zugang zum gemeinsamen Musizieren zu öffnen.",
      whyLabel: "Frei spielen", whyTitle: "Ohne Noten heisst nicht beliebig", whyText: "Das Stück ist nicht vorgegeben — aber wir spielen so miteinander, dass es zusammenpasst. Wir hören einander zu und finden gemeinsam eine Richtung. So wächst aus dem Moment ein gemeinsamer Klang.",
      offersLabel: "Die Klangabende", offersTitle: "Was dich erwartet", offersIntro: "Kein Vorspielen, kein Richtig oder Falsch — einfach Freude am Klang. Du darfst neugierig sein und in deinem eigenen Tempo Teil eines gemeinsamen Klangs werden.",
      storyLabel: "Meine Geschichte mit der Musik", storyTitle: "Freude am Klang, auch ohne Noten", storyText: "Bis fast 30 war ich überzeugt, unmusikalisch zu sein. Heute weiss ich: Wer gern Musik hört, ist musikalisch und kann selbst spielen. Oft braucht es nur einen leichten, spielerischen Zugang.",
      contactLabel: "Kontakt", contactTitle: "Möchtest du bei einem Klangabend mitspielen?", contactText: "Schreib mir kurz, mit wie vielen Personen du kommen möchtest und was dich interessiert. Vorkenntnisse brauchst du keine.", contactEmailAction: "Jetzt unverbindlich anfragen", contactPhoneAction: "anrufen", contactInstagramAction: "Instagram",
    },
    heroPoints: [{ id: "hero-point-group", text: "In der Gruppe" }, { id: "hero-point-instruments", text: "Viele Instrumente" }, { id: "hero-point-free", text: "Frei statt vorgegeben" }],
    introPoints: [{ id: "intro-point-listen", text: "gemeinsam spielen und aufeinander hören" }, { id: "intro-point-instruments", text: "Instrumente aus aller Welt ausprobieren" }, { id: "intro-point-pressure", text: "ohne Noten und ohne Leistungsdruck" }],
    offers: [
      { id: "offer-instrumente", title: "Viele Instrumente", text: "Vom Didgeridoo über die Harfe bis zu Flöten und Instrumenten aus aller Welt: Du darfst ausprobieren, was dich anspricht." },
      { id: "offer-frei", title: "Frei, nicht beliebig", text: "Wir spielen ohne vorgegebenes Stück und hören dabei aufmerksam aufeinander, bis ein gemeinsamer Klang entsteht." },
      { id: "offer-begleitung", title: "Warm begleitet", text: "Franz öffnet einen leichten Zugang zu Klang und Rhythmus. Vorkenntnisse oder Notenlesen brauchst du nicht." },
    ],
    layout: { order: ["intro", "why", "offers", "story", "contact"], visibility: { intro: true, why: true, offers: true, story: true, contact: true } },
    theme: { preset: "musikraum", primary: PRESETS.musikraum.primary, accent: PRESETS.musikraum.accent },
  };
}
