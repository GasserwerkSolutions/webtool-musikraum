import type { SectionKey } from "./domain.js";

export type EditorPanel = "site" | "hero" | "content" | "services" | "structure" | "contact" | "design" | "publish";
export type TextListKey = "heroPoints" | "introPoints";
export type StaticEditableField =
  | "site.name" | "site.tagline" | "site.phone" | "site.email" | "site.address" | "site.postalCode" | "site.city" | "site.instagram"
  | "copy.heroLabel" | "copy.heroTitle" | "copy.heroSubtitle" | "copy.heroPrimaryAction" | "copy.heroSecondaryAction"
  | "copy.navIntro" | "copy.navWhy" | "copy.navOffers" | "copy.navStory" | "copy.navContact"
  | "copy.introLabel" | "copy.introTitle" | "copy.introQuote" | "copy.introText"
  | "copy.whyLabel" | "copy.whyTitle" | "copy.whyText"
  | "copy.offersLabel" | "copy.offersTitle" | "copy.offersIntro"
  | "copy.storyLabel" | "copy.storyTitle" | "copy.storyText"
  | "copy.contactLabel" | "copy.contactTitle" | "copy.contactText" | "copy.contactEmailAction" | "copy.contactPhoneAction" | "copy.contactInstagramAction";

export type InputKind = "text" | "textarea" | "email" | "tel" | "url";
export type ContentRequirement = "required" | "recommended" | "optional";
export type EmptyRenderBehavior = "omit-node" | "omit-container" | "keep-structure" | "conditional";
export type ContentPolicy = {
  requirement: ContentRequirement;
  emptyBehavior: EmptyRenderBehavior;
  technicalFallback?: string;
  helpText?: string;
};
export type ReadinessGroup = "identity" | "hero" | "navigation" | "intro" | "why" | "offers" | "story" | "contact";

export type EditorFieldDefinition = {
  field: StaticEditableField;
  label: string;
  panel: EditorPanel;
  input: InputKind;
  previewPositions: readonly string[];
  historyLabel: string;
  readinessGroup: ReadinessGroup;
  section?: SectionKey;
  policy: ContentPolicy;
};

type FieldOptions = Omit<EditorFieldDefinition, "field">;
const required = (helpText?: string, technicalFallback?: string): ContentPolicy => ({ requirement: "required", emptyBehavior: "omit-node", ...(helpText ? { helpText } : {}), ...(technicalFallback ? { technicalFallback } : {}) });
const recommended = (helpText?: string): ContentPolicy => ({ requirement: "recommended", emptyBehavior: "omit-node", ...(helpText ? { helpText } : {}) });
const optional = (helpText?: string): ContentPolicy => ({ requirement: "optional", emptyBehavior: "omit-node", ...(helpText ? { helpText } : {}) });
const conditional = (helpText: string): ContentPolicy => ({ requirement: "optional", emptyBehavior: "conditional", helpText });
const field = (name: StaticEditableField, options: FieldOptions): EditorFieldDefinition => ({ field: name, ...options });

export const EDITOR_FIELD_REGISTRY: Record<StaticEditableField, EditorFieldDefinition> = {
  "site.name": field("site.name", { label: "Name der Website", panel: "site", input: "text", previewPositions: ["Kopfzeile", "Fusszeile"], historyLabel: "Website-Name geändert", readinessGroup: "identity", policy: required(undefined, "Musikraum") }),
  "site.tagline": field("site.tagline", { label: "Leitsatz", panel: "site", input: "text", previewPositions: ["Kopfzeile", "Fusszeile"], historyLabel: "Leitsatz geändert", readinessGroup: "identity", policy: recommended("Leer lassen, um den Leitsatz auszublenden.") }),
  "site.phone": field("site.phone", { label: "Telefonnummer", panel: "contact", input: "tel", previewPositions: ["Kontaktknopf"], historyLabel: "Telefonnummer geändert", readinessGroup: "contact", section: "contact", policy: conditional("Der Telefonknopf erscheint nur zusammen mit einer gültigen Telefonnummer.") }),
  "site.email": field("site.email", { label: "E-Mail-Adresse", panel: "contact", input: "email", previewPositions: ["Kontakt", "Fusszeile"], historyLabel: "E-Mail-Adresse geändert", readinessGroup: "contact", section: "contact", policy: conditional("E-Mail-Inhalte erscheinen nur mit einer gültigen E-Mail-Adresse.") }),
  "site.address": field("site.address", { label: "Adresse", panel: "contact", input: "text", previewPositions: ["Kontakt", "Fusszeile"], historyLabel: "Adresse geändert", readinessGroup: "contact", section: "contact", policy: optional("Leer lassen, um die Strassenadresse auszublenden.") }),
  "site.postalCode": field("site.postalCode", { label: "PLZ", panel: "contact", input: "text", previewPositions: ["Kontakt", "Fusszeile"], historyLabel: "PLZ geändert", readinessGroup: "contact", section: "contact", policy: optional() }),
  "site.city": field("site.city", { label: "Ort", panel: "contact", input: "text", previewPositions: ["Kontakt", "Fusszeile"], historyLabel: "Ort geändert", readinessGroup: "contact", section: "contact", policy: optional() }),
  "site.instagram": field("site.instagram", { label: "Instagram-Adresse", panel: "contact", input: "url", previewPositions: ["Instagram-Knopf"], historyLabel: "Instagram-Adresse geändert", readinessGroup: "contact", section: "contact", policy: conditional("Der Instagram-Knopf erscheint nur zusammen mit einer gültigen Instagram-Adresse.") }),
  "copy.heroLabel": field("copy.heroLabel", { label: "Kleine Überschrift im Einstieg", panel: "hero", input: "text", previewPositions: ["Einstieg"], historyLabel: "Einstiegszeile geändert", readinessGroup: "hero", policy: optional("Leer lassen, um die kleine Überschrift auszublenden.") }),
  "copy.heroTitle": field("copy.heroTitle", { label: "Haupttitel", panel: "hero", input: "textarea", previewPositions: ["Einstieg"], historyLabel: "Haupttitel geändert", readinessGroup: "hero", policy: required("Der Haupttitel ist für einen vollständigen Einstieg erforderlich.") }),
  "copy.heroSubtitle": field("copy.heroSubtitle", { label: "Einleitung im Einstieg", panel: "hero", input: "textarea", previewPositions: ["Einstieg"], historyLabel: "Einstiegseinleitung geändert", readinessGroup: "hero", policy: required("Die Einleitung ist für einen vollständigen Einstieg erforderlich.") }),
  "copy.heroPrimaryAction": field("copy.heroPrimaryAction", { label: "Text des ersten Einstiegsknopfs", panel: "hero", input: "text", previewPositions: ["Erster Einstiegsknopf"], historyLabel: "Ersten Einstiegsknopf geändert", readinessGroup: "hero", policy: conditional("Der Knopf erscheint nur mit einem sichtbaren gültigen Abschnittsziel.") }),
  "copy.heroSecondaryAction": field("copy.heroSecondaryAction", { label: "Text des Kontaktknopfs im Einstieg", panel: "hero", input: "text", previewPositions: ["Kontaktknopf im Einstieg"], historyLabel: "Kontaktknopf im Einstieg geändert", readinessGroup: "hero", policy: conditional("Der Knopf erscheint nur, wenn der Kontaktbereich sichtbar ist.") }),
  "copy.navIntro": field("copy.navIntro", { label: "Navigation: Über Franz", panel: "structure", input: "text", previewPositions: ["Navigation"], historyLabel: "Navigation für Über Franz geändert", readinessGroup: "navigation", section: "intro", policy: recommended("Leer lassen, um diesen Navigationspunkt auszublenden.") }),
  "copy.navWhy": field("copy.navWhy", { label: "Navigation: Frei spielen", panel: "structure", input: "text", previewPositions: ["Navigation"], historyLabel: "Navigation für Frei spielen geändert", readinessGroup: "navigation", section: "why", policy: recommended("Leer lassen, um diesen Navigationspunkt auszublenden.") }),
  "copy.navOffers": field("copy.navOffers", { label: "Navigation: Klangabende", panel: "structure", input: "text", previewPositions: ["Navigation"], historyLabel: "Navigation für Klangabende geändert", readinessGroup: "navigation", section: "offers", policy: recommended("Leer lassen, um diesen Navigationspunkt auszublenden.") }),
  "copy.navStory": field("copy.navStory", { label: "Navigation: Geschichte", panel: "structure", input: "text", previewPositions: ["Navigation"], historyLabel: "Navigation für Geschichte geändert", readinessGroup: "navigation", section: "story", policy: recommended("Leer lassen, um diesen Navigationspunkt auszublenden.") }),
  "copy.navContact": field("copy.navContact", { label: "Navigation: Kontakt", panel: "structure", input: "text", previewPositions: ["Navigation"], historyLabel: "Navigation für Kontakt geändert", readinessGroup: "navigation", section: "contact", policy: recommended("Leer lassen, um diesen Navigationspunkt auszublenden.") }),
  "copy.introLabel": field("copy.introLabel", { label: "Kleine Zeile über Franz", panel: "content", input: "text", previewPositions: ["Über Franz"], historyLabel: "Kleine Zeile über Franz geändert", readinessGroup: "intro", section: "intro", policy: optional("Leer lassen, um die kleine Zeile auszublenden.") }),
  "copy.introTitle": field("copy.introTitle", { label: "Titel über Franz", panel: "content", input: "text", previewPositions: ["Über Franz"], historyLabel: "Titel über Franz geändert", readinessGroup: "intro", section: "intro", policy: recommended() }),
  "copy.introQuote": field("copy.introQuote", { label: "Persönliches Zitat", panel: "content", input: "textarea", previewPositions: ["Über Franz"], historyLabel: "Persönliches Zitat geändert", readinessGroup: "intro", section: "intro", policy: recommended("Leer lassen, um das Zitat auszublenden.") }),
  "copy.introText": field("copy.introText", { label: "Text über Franz", panel: "content", input: "textarea", previewPositions: ["Über Franz"], historyLabel: "Text über Franz geändert", readinessGroup: "intro", section: "intro", policy: recommended() }),
  "copy.whyLabel": field("copy.whyLabel", { label: "Kleine Zeile zu Frei spielen", panel: "content", input: "text", previewPositions: ["Frei spielen"], historyLabel: "Kleine Zeile zu Frei spielen geändert", readinessGroup: "why", section: "why", policy: optional("Leer lassen, um die kleine Zeile auszublenden.") }),
  "copy.whyTitle": field("copy.whyTitle", { label: "Titel zu Frei spielen", panel: "content", input: "text", previewPositions: ["Frei spielen"], historyLabel: "Titel zu Frei spielen geändert", readinessGroup: "why", section: "why", policy: recommended() }),
  "copy.whyText": field("copy.whyText", { label: "Text zu Frei spielen", panel: "content", input: "textarea", previewPositions: ["Frei spielen"], historyLabel: "Text zu Frei spielen geändert", readinessGroup: "why", section: "why", policy: recommended() }),
  "copy.offersLabel": field("copy.offersLabel", { label: "Kleine Zeile der Klangabende", panel: "services", input: "text", previewPositions: ["Klangabende"], historyLabel: "Kleine Zeile der Klangabende geändert", readinessGroup: "offers", section: "offers", policy: optional("Leer lassen, um die kleine Zeile auszublenden.") }),
  "copy.offersTitle": field("copy.offersTitle", { label: "Titel der Klangabende", panel: "services", input: "text", previewPositions: ["Klangabende"], historyLabel: "Titel der Klangabende geändert", readinessGroup: "offers", section: "offers", policy: recommended() }),
  "copy.offersIntro": field("copy.offersIntro", { label: "Einleitung der Klangabende", panel: "services", input: "textarea", previewPositions: ["Klangabende"], historyLabel: "Einleitung der Klangabende geändert", readinessGroup: "offers", section: "offers", policy: recommended() }),
  "copy.storyLabel": field("copy.storyLabel", { label: "Kleine Zeile der Geschichte", panel: "content", input: "text", previewPositions: ["Geschichte"], historyLabel: "Kleine Zeile der Geschichte geändert", readinessGroup: "story", section: "story", policy: optional("Leer lassen, um die kleine Zeile auszublenden.") }),
  "copy.storyTitle": field("copy.storyTitle", { label: "Titel der Geschichte", panel: "content", input: "text", previewPositions: ["Geschichte"], historyLabel: "Titel der Geschichte geändert", readinessGroup: "story", section: "story", policy: recommended() }),
  "copy.storyText": field("copy.storyText", { label: "Text der Geschichte", panel: "content", input: "textarea", previewPositions: ["Geschichte"], historyLabel: "Text der Geschichte geändert", readinessGroup: "story", section: "story", policy: recommended() }),
  "copy.contactLabel": field("copy.contactLabel", { label: "Kleine Zeile im Kontakt", panel: "contact", input: "text", previewPositions: ["Kontakt"], historyLabel: "Kleine Zeile im Kontakt geändert", readinessGroup: "contact", section: "contact", policy: optional("Leer lassen, um die kleine Zeile auszublenden.") }),
  "copy.contactTitle": field("copy.contactTitle", { label: "Kontakt-Titel", panel: "contact", input: "text", previewPositions: ["Kontakt"], historyLabel: "Kontakt-Titel geändert", readinessGroup: "contact", section: "contact", policy: recommended() }),
  "copy.contactText": field("copy.contactText", { label: "Kontakt-Text", panel: "contact", input: "textarea", previewPositions: ["Kontakt"], historyLabel: "Kontakt-Text geändert", readinessGroup: "contact", section: "contact", policy: recommended() }),
  "copy.contactEmailAction": field("copy.contactEmailAction", { label: "Text des E-Mail-Knopfs", panel: "contact", input: "text", previewPositions: ["E-Mail-Knopf"], historyLabel: "E-Mail-Knopf geändert", readinessGroup: "contact", section: "contact", policy: conditional("Der Knopf erscheint nur zusammen mit einer gültigen E-Mail-Adresse.") }),
  "copy.contactPhoneAction": field("copy.contactPhoneAction", { label: "Zusatz beim Telefonknopf", panel: "contact", input: "text", previewPositions: ["Telefonknopf"], historyLabel: "Telefonknopf geändert", readinessGroup: "contact", section: "contact", policy: conditional("Der Zusatz erscheint nur zusammen mit einer gültigen Telefonnummer.") }),
  "copy.contactInstagramAction": field("copy.contactInstagramAction", { label: "Text des Instagram-Knopfs", panel: "contact", input: "text", previewPositions: ["Instagram-Knopf"], historyLabel: "Instagram-Knopf geändert", readinessGroup: "contact", section: "contact", policy: conditional("Der Knopf erscheint nur zusammen mit einer gültigen Instagram-Adresse.") }),
};

export const STATIC_FIELD_REGISTRY = EDITOR_FIELD_REGISTRY;
export const STATIC_EDITABLE_FIELDS = Object.freeze(Object.keys(EDITOR_FIELD_REGISTRY) as StaticEditableField[]);
