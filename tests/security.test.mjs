import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultDraft, normalizeEmail, normalizeInstagramUrl, normalizePhone } from "../assets/domain.js";
import { MAX_BACKUP_BYTES, isBackupFileSizeAllowed } from "../assets/ui-actions.js";
import { buildWebsiteHtml, MUSICRAUM_HERO_URL } from "../assets/website.js";

test("validates exported contact targets", () => {
  assert.equal(normalizeEmail(" info@example.com "), "info@example.com");
  assert.equal(normalizeEmail("nicht-gueltig"), null);
  assert.equal(normalizePhone("+41 (0)79 123 45 67"), "+410791234567");
  assert.equal(normalizePhone("Telefon unbekannt"), null);
  assert.equal(normalizeInstagramUrl("https://instagram.com/musikraum"), "https://instagram.com/musikraum");
  assert.equal(normalizeInstagramUrl("https://instagram.com.evil.example/musikraum"), null);
});

test("bounds backup files before parsing", () => {
  assert.equal(isBackupFileSizeAllowed({ size: MAX_BACKUP_BYTES }), true);
  assert.equal(isBackupFileSizeAllowed({ size: MAX_BACKUP_BYTES + 1 }), false);
});

test("encodes contact links and omits invalid external targets", () => {
  const draft = createDefaultDraft();
  draft.site.name = "Musikraum&body=unerwartet";
  draft.site.email = "info+klang@example.com";
  draft.site.phone = "+41 (0)79 123 45 67";
  draft.site.instagram = "https://example.com/kein-instagram";
  const html = buildWebsiteHtml(draft);
  assert.match(html, /mailto:info%2Bklang%40example\.com\?subject=Anfrage\+Musikraum%26body%3Dunerwartet/);
  assert.doesNotMatch(html, /&body=unerwartet/);
  assert.match(html, /href="tel:\+410791234567"/);
  assert.doesNotMatch(html, />Instagram<\/a>/);
});

test("does not emit broken hero targets when every section is hidden", () => {
  const draft = createDefaultDraft();
  for (const key of draft.layout.order) draft.layout.visibility[key] = false;
  const html = buildWebsiteHtml(draft);
  assert.doesNotMatch(html, /href="#kontakt"/);
  assert.doesNotMatch(html, /Klangabende entdecken/);
  assert.doesNotMatch(html, /Unverbindlich anfragen/);
});

test("pins the hero asset and escapes style raw text", () => {
  assert.match(MUSICRAUM_HERO_URL, /musikraum\/[0-9a-f]{40}\//);
  const html = buildWebsiteHtml(createDefaultDraft(), { heroImageUrl: "x</style><script>alert(1)</script>" });
  assert.doesNotMatch(html, /x<\/style><script>/);
  assert.ok(html.includes("x\\3c /style\\3e \\3c script\\3e alert\\(1\\)"));
});
