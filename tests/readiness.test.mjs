import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultDraft } from "../assets/domain.js";
import { evaluateReadiness } from "../assets/readiness.js";

test("default draft is ready and clean", () => {
  const summary = evaluateReadiness(createDefaultDraft());
  assert.equal(summary.ready, true);
  assert.equal(summary.clean, true);
  assert.equal(summary.errorCount, 0);
  assert.equal(summary.warningCount, 0);
  assert.deepEqual(summary.results, []);
});

test("rules can emit multiple stable blocker and warning results", () => {
  const draft = createDefaultDraft();
  draft.site.name = "";
  draft.copy.heroTitle = "";
  draft.copy.heroSubtitle = "";
  draft.site.email = "nicht-gueltig";
  draft.site.phone = "12";
  draft.offers = [
    { id: "offer-a", title: "Gleich", text: "" },
    { id: "offer-b", title: "gleich", text: "Beschreibung" },
    { id: "offer-c", title: "", text: "Ohne Titel" },
  ];
  const summary = evaluateReadiness(draft);
  const ids = summary.results.map((item) => item.id);
  assert.equal(summary.ready, false);
  assert.equal(summary.clean, false);
  assert.ok(summary.errorCount >= 4);
  assert.ok(summary.warningCount >= 4);
  assert.ok(ids.includes("identity:site-name:missing"));
  assert.ok(ids.includes("hero:title:missing"));
  assert.ok(ids.includes("hero:subtitle:missing"));
  assert.ok(ids.includes("contact:methods:missing"));
  assert.ok(ids.includes("offers:offer-c:missing-title"));
  assert.ok(ids.includes("offers:offer-a:duplicate-title"));
  assert.ok(ids.includes("offers:offer-b:duplicate-title"));
  assert.deepEqual(summary.results.slice(0, summary.errorCount).map((item) => item.severity), Array(summary.errorCount).fill("error"));
});

test("warning-only drafts are ready but not clean", () => {
  const draft = createDefaultDraft();
  draft.copy.navIntro = "Ein sehr langer Navigationstext für Über Franz";
  const summary = evaluateReadiness(draft);
  assert.equal(summary.ready, true);
  assert.equal(summary.clean, false);
  assert.equal(summary.errorCount, 0);
  assert.equal(summary.warningCount, 1);
  assert.equal(summary.results[0].id, "navigation:intro:too-long");
});

test("dynamic result ids survive collection and section reordering", () => {
  const draft = createDefaultDraft();
  draft.heroPoints = [
    { id: "hero-stable-a", text: "Doppelt" },
    { id: "hero-stable-b", text: " doppelt " },
  ];
  draft.offers = [
    { id: "offer-stable-a", title: "Doppelt", text: "Text" },
    { id: "offer-stable-b", title: "doppelt", text: "Text" },
  ];
  const before = evaluateReadiness(draft).results.map((item) => item.id).sort();
  draft.heroPoints.reverse();
  draft.offers.reverse();
  draft.layout.order.reverse();
  const after = evaluateReadiness(draft).results.map((item) => item.id).sort();
  assert.deepEqual(after, before);
  assert.ok(after.includes("heroPoints:hero-stable-a:duplicate"));
  assert.ok(after.includes("offers:offer-stable-b:duplicate-title"));
});

test("hidden section rules do not report inaccessible content", () => {
  const draft = createDefaultDraft();
  draft.layout.visibility.contact = false;
  draft.site.email = "ungueltig";
  draft.site.phone = "1";
  draft.layout.visibility.offers = false;
  draft.offers = [{ id: "hidden-offer", title: "", text: "" }];
  draft.layout.visibility.intro = false;
  draft.introPoints = [
    { id: "hidden-intro-a", text: "Doppelt" },
    { id: "hidden-intro-b", text: " doppelt " },
  ];
  const ids = evaluateReadiness(draft).results.map((item) => item.id);
  assert.equal(ids.some((id) => id.startsWith("contact:")), false);
  assert.equal(ids.some((id) => id.startsWith("offers:")), false);
  assert.equal(ids.some((id) => id.startsWith("introPoints:")), false);
});

test("multi-field blockers resolve to reachable canonical targets", () => {
  const layout = createDefaultDraft();
  for (const section of layout.layout.order) layout.layout.visibility[section] = false;
  const layoutResult = evaluateReadiness(layout).results.find((item) => item.id === "layout:visible-section:missing");
  assert.deepEqual(layoutResult?.target, { kind: "section", section: layout.layout.order[0] });

  const contact = createDefaultDraft();
  contact.site.email = "ungueltig";
  contact.site.phone = "";
  const contactResult = evaluateReadiness(contact).results.find((item) => item.id === "contact:methods:missing");
  assert.deepEqual(contactResult?.target, { kind: "field", field: "site.email" });
});
