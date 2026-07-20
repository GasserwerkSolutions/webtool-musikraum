import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultDraft } from "../assets/domain.js";
import { buildContentOverview } from "../assets/content-overview.js";

function entries(draft) { return buildContentOverview(draft).flatMap((group) => group.entries); }
function entry(draft, id) { return entries(draft).find((item) => item.id === id); }

test("content overview exposes deterministic completeness and editor targets", () => {
  const draft = createDefaultDraft();
  const first = entries(draft); const second = entries(draft);
  assert.deepEqual(first.map((item) => item.id), second.map((item) => item.id));
  assert.ok(first.length > 45); assert.ok(first.every((item) => ["complete", "optional-empty", "incomplete", "hidden"].includes(item.status)));
  assert.ok(first.every((item) => item.target && typeof item.target.kind === "string"));
});

test("required empty content is incomplete", () => {
  const draft = createDefaultDraft(); draft.copy.heroTitle = "";
  assert.equal(entry(draft, "field:copy.heroTitle")?.status, "incomplete");
});

test("optional empty content is optional-empty", () => {
  const draft = createDefaultDraft(); draft.copy.heroLabel = "";
  assert.equal(entry(draft, "field:copy.heroLabel")?.status, "optional-empty");
});

test("content in an invisible section is hidden and exposes its visibility control", () => {
  const draft = createDefaultDraft(); draft.layout.visibility.contact = false;
  assert.equal(entry(draft, "field:copy.contactTitle")?.status, "hidden");
  assert.deepEqual(entry(draft, "section:contact")?.target, { kind: "section", section: "contact" });
  assert.equal(entry(draft, "section:contact")?.status, "hidden");
  assert.equal(entry(draft, "section:contact")?.detail, "Auf der Website ausgeblendet");
});

test("dynamic targets remain stable when collections move", () => {
  const draft = createDefaultDraft(); const id = draft.offers[1].id; const before = entry(draft, `offer-title:${id}`)?.target;
  const [moved] = draft.offers.splice(1, 1); draft.offers.unshift(moved);
  const after = entry(draft, `offer-title:${id}`)?.target;
  assert.deepEqual(after, before);
});
