import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultDraft, normalizeDraft } from "../assets/domain.js";
import { buildWebsiteHtml } from "../assets/website.js";

test("creates a focused Musikraum draft", () => {
  const draft = createDefaultDraft("2026-07-19T12:00:00.000Z");
  assert.equal(draft.schemaVersion, 1);
  assert.equal(draft.site.name, "Musikraum");
  assert.equal(draft.heroPoints.length, 3);
  assert.equal(draft.introPoints.length, 3);
  assert.equal(draft.offers.length, 3);
  assert.deepEqual(Object.keys(draft).sort(), ["copy", "createdAt", "draftId", "heroPoints", "introPoints", "layout", "offers", "schemaVersion", "site", "theme", "updatedAt"]);
});

test("normalizes section order, visibility and safe values", () => {
  const draft = createDefaultDraft();
  const normalized = normalizeDraft({ ...draft, layout: { order: ["contact", "contact", "offers"], visibility: { contact: false } }, site: { ...draft.site, instagram: "javascript:alert(1)" }, theme: { ...draft.theme, primary: "red" } });
  assert.deepEqual(normalized.layout.order, ["contact", "offers", "intro", "why", "story"]);
  assert.equal(normalized.layout.visibility.contact, false);
  assert.equal(normalized.site.instagram, "");
  assert.equal(normalized.theme.primary, "#403b34");
});

test("normalizes font choices and keeps older drafts compatible", () => {
  const draft = createDefaultDraft();
  assert.equal(draft.theme.font, "klassisch");
  assert.equal(draft.theme.fontSize, "normal");
  const legacy = normalizeDraft({ ...draft, theme: { preset: "waldton", primary: "#3f514e", accent: "#b89a63" } });
  assert.equal(legacy.theme.font, "klassisch");
  assert.equal(legacy.theme.fontSize, "normal");
  const invalid = normalizeDraft({ ...draft, theme: { ...draft.theme, font: "comic-sans", fontSize: "riesig" } });
  assert.equal(invalid.theme.font, "klassisch");
  assert.equal(invalid.theme.fontSize, "normal");
  const chosen = normalizeDraft({ ...draft, theme: { ...draft.theme, font: "klar", fontSize: "sehr-gross" } });
  assert.equal(chosen.theme.font, "klar");
  assert.equal(chosen.theme.fontSize, "sehr-gross");
});

test("website css follows the chosen font family and size", () => {
  const draft = createDefaultDraft();
  const standard = buildWebsiteHtml(draft);
  assert.match(standard, /--display:Iowan Old Style/);
  assert.match(standard, /font-size:100%/);
  draft.theme.font = "klar";
  draft.theme.fontSize = "gross";
  const arial = buildWebsiteHtml(draft);
  assert.match(arial, /--display:Arial/);
  assert.match(arial, /--body:Arial/);
  assert.match(arial, /font-size:110%/);
});

test("website css keeps readable fallbacks for very old browsers", () => {
  const html = buildWebsiteHtml(createDefaultDraft());
  const css = html.slice(html.indexOf("<style>"), html.indexOf("</style>"));
  assert.match(css, /\.hero\{min-height:calc\(100vh - 76px\);min-height:calc\(100svh - 76px\)/);
  assert.match(css, /background-color:#494840;background-image:url\(/);
  assert.match(css, /\.hero:after\{content:"";position:absolute;top:0;right:0;bottom:0;left:0/);
  assert.doesNotMatch(css, /inset:0/);
  assert.match(css, /body\{margin:0;min-width:320px;background:#f6e4c2;background:var\(--bg\);color:#2f2b25;color:var\(--text\)/);
  assert.match(css, /font-size:3\.4rem;line-height:\.98;font:700 clamp\(3rem,8vw,6\.5rem\)/);
  assert.match(css, /\.section\{padding:5\.5rem 0;padding:clamp\(4\.5rem,9vw,7\.5rem\) 0;background:#f6e4c2;background:linear-gradient/);
  assert.match(css, /\.dark-band,\.contact\{color:#fff;background:#403b34;background:linear-gradient/);
});

test("repairs blank draft ids and duplicate offer ids", () => {
  const draft = createDefaultDraft();
  const normalized = normalizeDraft({
    ...draft,
    draftId: "   ",
    offers: [
      { id: "same", title: "Eins", text: "" },
      { id: "same", title: "Zwei", text: "" },
      { id: "", title: "Drei", text: "" },
    ],
  });
  const ids = normalized.offers.map((offer) => offer.id);
  assert.ok(normalized.draftId.trim());
  assert.equal(ids[0], "same");
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every((id) => id.trim().length > 0));
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

test("preview contains versioned editor instrumentation while export remains clean", () => {
  const draft = createDefaultDraft(); const preview = buildWebsiteHtml(draft, { preview: true, previewInstanceId: "preview-1", parentOrigin: "https://example.test", previewRevision: 8, renderGeneration: 3 }); const exported = buildWebsiteHtml(draft);
  assert.match(preview, /data-preview-target/); assert.match(preview, /data-preview-region/); assert.match(preview, /musikraum-preview/); assert.match(preview, /preview-1/); assert.match(preview, /preview-edit-trigger/); assert.match(preview, /"version":2/); assert.match(preview, /"renderGeneration":3/); assert.match(preview, /"revision":8/);
  assert.doesNotMatch(exported, /data-preview-(?:target|section|panel|region|occurrence)/); assert.doesNotMatch(exported, /musikraum-preview|preview-edit-trigger|preview-1|renderGeneration|sidebar-resizer|sidebar-toggle/);
});

test("preview identifies each offer card independently", () => {
  const draft = createDefaultDraft(); const preview = buildWebsiteHtml(draft, { preview: true, previewInstanceId: "offers", parentOrigin: "https://example.test", previewRevision: 0, renderGeneration: 1 });
  for (const offer of draft.offers) { assert.match(preview, new RegExp(`&quot;offerId&quot;:&quot;${offer.id}&quot;`)); }
});
