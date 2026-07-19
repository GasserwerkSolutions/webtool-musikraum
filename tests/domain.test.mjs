import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultDraft, normalizeDraft } from "../assets/domain.js";
import { buildWebsiteHtml } from "../assets/website.js";

test("creates a focused Musikraum draft", () => {
  const draft = createDefaultDraft("2026-07-19T12:00:00.000Z");
  assert.equal(draft.schemaVersion, 1);
  assert.equal(draft.site.name, "Musikraum");
  assert.equal(draft.offers.length, 3);
  assert.deepEqual(Object.keys(draft).sort(), ["copy", "createdAt", "draftId", "layout", "offers", "schemaVersion", "site", "theme", "updatedAt"]);
});

test("normalizes section order, visibility and safe values", () => {
  const draft = createDefaultDraft();
  const normalized = normalizeDraft({ ...draft, layout: { order: ["contact", "contact", "offers"], visibility: { contact: false } }, site: { ...draft.site, instagram: "javascript:alert(1)" }, theme: { ...draft.theme, primary: "red" } });
  assert.deepEqual(normalized.layout.order, ["contact", "offers", "intro", "why", "story"]);
  assert.equal(normalized.layout.visibility.contact, false);
  assert.equal(normalized.site.instagram, "");
  assert.equal(normalized.theme.primary, "#403b34");
});

test("rejects unknown schemas instead of silently rewriting them", () => {
  assert.throws(() => normalizeDraft({ schemaVersion: 99 }), /UNSUPPORTED_DRAFT_SCHEMA/);
});

test("website follows Franz' chosen order and emits structured offer data", () => {
  const draft = createDefaultDraft();
  draft.layout.order = ["contact", "offers", "intro", "why", "story"];
  draft.layout.visibility.story = false;
  const html = buildWebsiteHtml(draft);
  assert.ok(html.indexOf('id="kontakt"') < html.indexOf('id="angebote"'));
  assert.doesNotMatch(html, /id="geschichte"/);
  assert.match(html, /"ProfessionalService"/);
  assert.match(html, /Viele Instrumente/);
  assert.match(html, /data:image\/svg\+xml/);
});
