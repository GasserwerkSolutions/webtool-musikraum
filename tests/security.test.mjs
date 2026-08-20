import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultDraft, normalizeEmail, normalizeInstagramUrl, normalizePhone } from "../assets/domain.js";
import { MAX_BACKUP_BYTES, isBackupFileSizeAllowed } from "../assets/ui-actions.js";
import { buildWebsiteHtml, RAUM_FUER_KLANG_MEDIA, RAUM_FUER_KLANG_URL } from "../assets/website.js";

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
  draft.site.name = "Raum für Klang&body=unerwartet";
  draft.site.email = "info+klang@example.com";
  draft.site.phone = "+41 (0)79 123 45 67";
  draft.site.instagram = "https://example.com/kein-instagram";
  const html = buildWebsiteHtml(draft);
  assert.match(html, /mailto:info%2Bklang%40example\.com\?subject=Anfrage\+Raum\+f%C3%BCr\+Klang%26body%3Dunerwartet/);
  assert.doesNotMatch(html, /href="mailto:[^"]*&body=unerwartet/);
  assert.match(html, /href="tel:\+410791234567"/);
  assert.doesNotMatch(html, />Instagram<\/a>/);
});

test("does not emit broken hero targets when every section is hidden", () => {
  const draft = createDefaultDraft();
  for (const key of draft.layout.order) draft.layout.visibility[key] = false;
  const html = buildWebsiteHtml(draft);
  assert.doesNotMatch(html, /href="#kontakt"/);
  assert.doesNotMatch(html, /Gemeinsames Spielen kennenlernen/);
  assert.doesNotMatch(html, /Franz kontaktieren/);
});

test("keeps all default media offline and escapes style raw text", () => {
  assert.equal(RAUM_FUER_KLANG_URL, "https://xn--raum-fr-klang-1ob.ch/");
  for (const source of Object.values(RAUM_FUER_KLANG_MEDIA)) assert.match(source, /^data:image\/svg\+xml;charset=utf-8,/);
  const html = buildWebsiteHtml(createDefaultDraft(), { heroImageUrl: "x</style><script>alert(1)</script>" });
  assert.doesNotMatch(html, /x<\/style><script>/);
  assert.match(html, /src="x&lt;\/style&gt;&lt;script&gt;alert\(1\)&lt;\/script&gt;"/);
});
