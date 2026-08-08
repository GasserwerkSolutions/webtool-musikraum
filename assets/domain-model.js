export const SCHEMA_VERSION = 1;
export const ACTIVE_DRAFT_POINTER_KEY = "musikraum-website-werkzeug-active-draft";
/**
 * The internal preset key stays `musikraum` so schema version 1 drafts remain valid.
 * Its visible identity is now Raum für Klang.
 */
export const PRESETS = {
    musikraum: { primary: "#214f68", accent: "#a45b2a", bg: "#f5f2e9", surface: "#fffdf8", text: "#22333d", radius: "18px" },
    waldton: { primary: "#3f514e", accent: "#8a6840", bg: "#edf1e9", surface: "#fbfcf8", text: "#24302d", radius: "14px" },
    holzklang: { primary: "#5d4938", accent: "#815d34", bg: "#efe2cf", surface: "#fff9ef", text: "#302820", radius: "18px" },
    nachtklang: { primary: "#252f38", accent: "#8b6b32", bg: "#e9e7e1", surface: "#faf8f2", text: "#20262b", radius: "10px" },
};
export const FONT_PRESETS = {
    klassisch: { label: "Klassisch", display: "Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif", body: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
    klar: { label: "Klar", display: "Arial, 'Helvetica Neue', Helvetica, sans-serif", body: "Arial, 'Helvetica Neue', Helvetica, sans-serif" },
    elegant: { label: "Elegant", display: "Georgia, 'Palatino Linotype', Palatino, 'Times New Roman', serif", body: "Georgia, 'Palatino Linotype', Palatino, 'Times New Roman', serif" },
    modern: { label: "Modern", display: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", body: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
};
export const FONT_SIZES = {
    kompakt: { label: "Kompakt", scale: 92 },
    normal: { label: "Normal", scale: 100 },
    gross: { label: "Gross", scale: 110 },
    "sehr-gross": { label: "Sehr gross", scale: 122 },
};
export function createId(prefix) {
    const id = globalThis.crypto?.randomUUID?.();
    return id ? `${prefix}-${id}` : `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
export function createDefaultDraft(now = new Date().toISOString()) {
    return {
        schemaVersion: SCHEMA_VERSION,
        draftId: createId("raum-fuer-klang"),
        createdAt: now,
        updatedAt: now,
        site: {
            name: "Raum für Klang",
            tagline: "Gemeinsam spielen. Aufeinander hören. Klang entstehen lassen.",
            phone: "+41 79 675 58 69",
            email: "info@Musikraum.ch",
            address: "Bielstrasse 44",
            postalCode: "2555",
            city: "Brügg",
            instagram: "",
        },
        copy: {
            heroLabel: "Begleiteter Einstieg ins gemeinsame Musizieren",
            heroTitle: "Jeder Mensch ist musikalisch",
            heroSubtitle: "Im Raum für Klang findest du einen unkomplizierten Einstieg ins gemeinsame Musizieren. Franz gibt Orientierung, die Instrumente sind aufeinander abgestimmt, und aus aufmerksamem Zuhören entsteht gemeinsam Musik — ohne starres Notenblatt, aber mit einer klaren Richtung.",
            heroPrimaryAction: "Gemeinsames Spielen kennenlernen",
            heroSecondaryAction: "Franz kontaktieren",
            navIntro: "Franz",
            navWhy: "So spielen wir",
            navOffers: "Was dich erwartet",
            navStory: "Sein Weg",
            navContact: "Kontakt",
            introLabel: "Franz Gasser",
            introTitle: "Musik entsteht im Miteinander",
            introQuote: "Meine Musik entsteht aus dem Moment und in der Verbindung mit den Menschen, die zuhören und mitspielen.",
            introText: "Franz begleitet Menschen dabei, einen eigenen Zugang zum Musizieren zu finden. Es geht nicht um Vorspielen oder Leistung, sondern um aufmerksames Hören, einen klaren Rahmen und die Erfahrung, wie aus einzelnen Klängen ein gemeinsames Ganzes entsteht.",
            whyLabel: "Offen und klar angeleitet",
            whyTitle: "Ein klarer Rahmen. Ein offener Klang.",
            whyText: "Das grosse Sandpendel, das Franz selbst gebaut hat, folgt einer klaren Konstruktion und hinterlässt trotzdem jedes Mal eine offene Spur. Ähnlich spielen wir zusammen: mit Orientierung, abgestimmten Instrumenten und aufmerksamem Hören — ohne festgeschriebenes Stück.",
            offersLabel: "Gemeinsam musizieren",
            offersTitle: "So findest du ins Zusammenspiel",
            offersIntro: "Du darfst ausprobieren, zuhören und Schritt für Schritt mitspielen. Vorkenntnisse oder Notenlesen sind nicht nötig; Neugier und Freude am Klang genügen.",
            storyLabel: "Franz’ Weg zur Musik",
            storyTitle: "Vom vermeintlich Unmusikalischen zum gemeinsamen Spiel",
            storyText: "Bis fast 30 war Franz überzeugt, unmusikalisch zu sein. Erst ein spielerischer Zugang zum Didgeridoo veränderte seinen Blick auf Musik. Heute gibt er weiter, was ihm selbst gefehlt hat: einen unkomplizierten Einstieg, klare Begleitung und die Freiheit, ohne starres Notenblatt gemeinsam Musik entstehen zu lassen.",
            contactLabel: "Kontakt",
            contactTitle: "Möchtest du das gemeinsame Spielen kennenlernen?",
            contactText: "Schreib Franz kurz, was dich interessiert und ob du allein oder mit anderen kommen möchtest. Er meldet sich persönlich und bespricht mit dir einen passenden Einstieg.",
            contactEmailAction: "Franz schreiben",
            contactPhoneAction: "anrufen",
            contactInstagramAction: "Instagram",
        },
        heroPoints: [
            { id: "hero-point-group", text: "Unkomplizierter Einstieg" },
            { id: "hero-point-instruments", text: "Abgestimmte Instrumente" },
            { id: "hero-point-free", text: "Ohne starres Notenblatt" },
        ],
        introPoints: [
            { id: "intro-point-listen", text: "gemeinsam spielen und aufmerksam zuhören" },
            { id: "intro-point-instruments", text: "Instrumente in Ruhe kennenlernen" },
            { id: "intro-point-pressure", text: "klare Begleitung ohne Leistungsdruck" },
        ],
        offers: [
            { id: "offer-instrumente", title: "Instrumente entdecken", text: "Harfe, Didgeridoo, Floten, Trommeln und weitere Instrumente laden zum Ausprobieren ein. Franz zeigt einfache Zugange und hilft bei den ersten gemeinsamen Klangen." },
            { id: "offer-frei", title: "Miteinander spielen", text: "Das Stuck ist nicht vorgegeben. Wir horen aufeinander, greifen Rhythmen und Tone auf und finden eine Richtung, die fur die Gruppe tragt." },
            { id: "offer-begleitung", title: "Klar begleitet", text: "Franz gibt Orientierung und einen verlasslichen Rahmen. So kann freies Spiel entstehen, ohne beliebig zu werden und ohne dass du Noten lesen musst." },
        ],
        layout: { order: ["intro", "why", "offers", "story", "contact"], visibility: { intro: true, why: true, offers: true, story: true, contact: true } },
        theme: { preset: "musikraum", primary: PRESETS.musikraum.primary, accent: PRESETS.musikraum.accent, font: "klassisch", fontSize: "normal" },
    };
}
