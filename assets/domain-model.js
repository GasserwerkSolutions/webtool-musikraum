export const SCHEMA_VERSION = 2;
export const MAX_TESTIMONIALS = 3;
export const LEGACY_STORAGE_KEY = "gasserwerk-free-salon-builder-v1";
export const ACTIVE_DRAFT_POINTER_KEY = "gasserwerk-free-salon-builder-active-draft";
export const PRESETS = {
    elegant: { primary: "#403b34", accent: "#587271", bg: "#f6e4c2", surface: "#fff3dd", text: "#2f2b25", display: "Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif", body: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", radius: "12px" },
    modern: { primary: "#3f514e", accent: "#b89a63", bg: "#edf1e9", surface: "#fbfcf8", text: "#24302d", display: "Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif", body: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", radius: "10px" },
    natural: { primary: "#5d4938", accent: "#8b6f47", bg: "#efe2cf", surface: "#fff9ef", text: "#302820", display: "Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif", body: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", radius: "16px" },
    bold: { primary: "#252c2b", accent: "#c4a96d", bg: "#e7e2d7", surface: "#f8f5ee", text: "#202322", display: "Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif", body: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", radius: "6px" },
};
const DAY_NAMES = { 0: "Sonntag", 1: "Montag", 2: "Dienstag", 3: "Mittwoch", 4: "Donnerstag", 5: "Freitag", 6: "Samstag" };
const ENGLISH_DAY_NAMES = { 0: "Sunday", 1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday", 6: "Saturday" };
export function dayName(dayOfWeek) { return DAY_NAMES[dayOfWeek]; }
export function englishDay(dayOfWeek) { return ENGLISH_DAY_NAMES[dayOfWeek]; }
export function createClientId(prefix) {
    const id = globalThis.crypto?.randomUUID?.();
    if (id)
        return `${prefix}-${id}`;
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
export function createClosedSchedule() {
    return [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({ dayOfWeek, closed: true, ranges: [] }));
}
export function createDefaultSchedule() {
    const defaults = {
        0: { closed: true, ranges: [] },
        1: { closed: true, ranges: [] },
        2: { closed: false, ranges: [{ from: "09:00", to: "18:00" }] },
        3: { closed: false, ranges: [{ from: "09:00", to: "18:00" }] },
        4: { closed: false, ranges: [{ from: "09:00", to: "20:00" }] },
        5: { closed: false, ranges: [{ from: "09:00", to: "18:00" }] },
        6: { closed: false, ranges: [{ from: "08:00", to: "15:00" }] },
    };
    return [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({ dayOfWeek, ...structuredClone(defaults[dayOfWeek]) }));
}
export function createDefaultDraft(now = new Date().toISOString()) {
    const services = [
        { clientId: "offer-instrumente", slug: "viele-instrumente", category: "Klangabend", name: "Viele Instrumente", description: "Vom Didgeridoo über die Harfe bis zu Flöten und Instrumenten aus aller Welt: Du darfst ausprobieren, was dich anspricht.", durationMinutes: 60, price: 0, priceType: "on-request", bookable: true },
        { clientId: "offer-frei", slug: "frei-nicht-beliebig", category: "Klangabend", name: "Frei, nicht beliebig", description: "Wir spielen ohne vorgegebenes Stück und hören dabei aufmerksam aufeinander, bis ein gemeinsamer Klang entsteht.", durationMinutes: 60, price: 0, priceType: "on-request", bookable: true },
        { clientId: "offer-begleitung", slug: "warm-begleitet", category: "Klangabend", name: "Warm begleitet", description: "Franz öffnet einen leichten Zugang zu Klang und Rhythmus. Vorkenntnisse oder Notenlesen brauchst du nicht.", durationMinutes: 60, price: 0, priceType: "on-request", bookable: true },
    ];
    return {
        schemaVersion: SCHEMA_VERSION,
        draftId: createClientId("draft"),
        createdAt: now,
        updatedAt: now,
        salon: { name: "Musikraum", tagline: "Lauschen. Spielen. Entdecken.", phone: "+41 79 675 58 69", email: "info@Musikraum.ch", address: "Bielstrasse 44", postalCode: "2555", city: "Brügg", instagram: "" },
        copy: {
            heroLabel: "Klangabende · gemeinsam frei spielen",
            heroTitle: "Jeder Mensch ist musikalisch",
            heroSubtitle: "Auch du. An einem Klangabend spielen wir in der Gruppe frei zusammen — auf einfachen Instrumenten aus aller Welt, ohne Noten und ohne Druck.",
            heroPrimaryAction: "Klangabende entdecken",
            heroSecondaryAction: "Unverbindlich anfragen",
            introLabel: "Franz Gasser",
            introTitle: "Aus dem Moment heraus",
            introQuote: "Meine Musik entsteht immer aus dem Moment, und in der Verbindung mit den Menschen, die zuhören und mitspielen.",
            introText: "Ich habe erlebt, dass Musik Menschen tief erreichen kann, auch ohne Theorie, Notenlesen oder Leistungsdruck. Aus dieser Erfahrung ist mein Wunsch entstanden, Menschen einen einfachen Zugang zum gemeinsamen Musizieren zu öffnen.",
            whyLabel: "Frei spielen",
            whyTitle: "Ohne Noten heisst nicht beliebig",
            whyText: "Das Stück ist nicht vorgegeben — aber wir spielen so miteinander, dass es zusammenpasst. Wir hören einander zu und finden gemeinsam eine Richtung. So wächst aus dem Moment ein gemeinsamer Klang.",
            servicesTitle: "Was dich erwartet",
            servicesSubtitle: "Kein Vorspielen, kein Richtig oder Falsch — einfach Freude am Klang. Du darfst neugierig sein und in deinem eigenen Tempo Teil eines gemeinsamen Klangs werden.",
            storyLabel: "Meine Geschichte mit der Musik",
            storyTitle: "Freude am Klang, auch ohne Noten",
            storyText: "Bis fast 30 war ich überzeugt, unmusikalisch zu sein. Heute weiss ich: Wer gern Musik hört, ist musikalisch und kann selbst spielen. Oft braucht es nur einen leichten, spielerischen Zugang.",
            bookingTitle: "Möchtest du bei einem Klangabend mitspielen?",
            bookingSubtitle: "Schreib mir kurz, mit wie vielen Personen du kommen möchtest und was dich interessiert. Vorkenntnisse brauchst du keine.",
        },
        layout: {
            order: ["intro", "why", "offers", "story", "contact"],
            visibility: { intro: true, why: true, offers: true, story: true, contact: true },
        },
        services,
        staff: [],
        businessHours: createDefaultSchedule(),
        assets: [],
        testimonials: { enabled: false, items: [] },
        theme: { preset: "elegant", primary: PRESETS.elegant.primary, accent: PRESETS.elegant.accent },
        publication: { intentId: null, state: "LOCAL", lastErrorCode: null },
        migration: { sourceVersion: null, legacyHeroImageUrl: null, migratedAt: null },
    };
}
