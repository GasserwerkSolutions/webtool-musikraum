import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultDraft, normalizeDraft } from "../assets/domain.js";
import { buildWebsiteHtml } from "../assets/website.js";

test("migrates missing editable lists, preserves empty lists and caps them at six", () => {
  const draft = createDefaultDraft();
  const legacy = structuredClone(draft); delete legacy.heroPoints; delete legacy.introPoints;
  const migrated = normalizeDraft(legacy);
  assert.deepEqual(migrated.heroPoints.map((item) => item.text), draft.heroPoints.map((item) => item.text));
  assert.deepEqual(migrated.introPoints.map((item) => item.text), draft.introPoints.map((item) => item.text));

  const normalized = normalizeDraft({
    ...draft,
    heroPoints: [],
    introPoints: Array.from({ length: 8 }, (_, index) => ({ id: index < 2 ? "same" : `point-${index}`, text: `Punkt ${index + 1}` })),
  });
  assert.deepEqual(normalized.heroPoints, []);
  assert.equal(normalized.introPoints.length, 6);
  assert.equal(new Set(normalized.introPoints.map((item) => item.id)).size, 6);
});

test("all requested visible labels and lists come from the editable draft", () => {
  const draft = createDefaultDraft();
  draft.copy.offersLabel = "Neue Angebotszeile";
  draft.copy.contactLabel = "Neue Kontaktzeile";
  draft.copy.contactEmailAction = "Per Mail starten";
  draft.copy.contactPhoneAction = "telefonieren";
  draft.copy.navIntro = "Person";
  draft.heroPoints = [{ id: "hero-custom", text: "Hero eigener Punkt" }];
  draft.introPoints = [{ id: "intro-custom", text: "Inhalt eigener Punkt" }];
  const html = buildWebsiteHtml(draft);
  for (const text of ["Neue Angebotszeile", "Neue Kontaktzeile", "Per Mail starten", "telefonieren", "Person", "Hero eigener Punkt", "Inhalt eigener Punkt"]) assert.match(html, new RegExp(text));

  draft.heroPoints = [];
  draft.introPoints = [];
  const withoutLists = buildWebsiteHtml(draft);
  assert.doesNotMatch(withoutLists, /class="hero-notes"/);
  assert.doesNotMatch(withoutLists, /class="plain-list"/);
});

test("footer separates address and email instead of concatenating them", () => {
  const html = buildWebsiteHtml(createDefaultDraft());
  assert.match(html, /class="footer-contact"/);
  assert.match(html, /class="footer-address"/);
  assert.match(html, /class="footer-email"/);
  assert.doesNotMatch(html, /Brügginfo@Musikraum\.ch/);
});

test("preview instruments every editable list item", () => {
  const draft = createDefaultDraft();
  const preview = buildWebsiteHtml(draft, { preview: true, previewInstanceId: "lists", parentOrigin: "https://example.test" });
  assert.equal((preview.match(/&quot;kind&quot;:&quot;text-item&quot;/g) ?? []).length, draft.heroPoints.length + draft.introPoints.length);
});
