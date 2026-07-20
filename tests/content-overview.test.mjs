import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultDraft } from "../assets/domain.js";
import { buildContentOverview } from "../assets/content-overview.js";

function entries(draft) { return buildContentOverview(draft).flatMap((group) => group.entries); }

test("content overview exposes deterministic completeness and editor targets", () => {
  const draft = createDefaultDraft();
  const first = entries(draft); const second = entries(draft);
  assert.deepEqual(first.map((entry) => entry.id), second.map((entry) => entry.id));
  assert.ok(first.length > 40); assert.ok(first.every((entry) => ["complete", "optional-empty", "incomplete", "hidden"].includes(entry.status)));
  assert.ok(first.every((entry) => entry.target && typeof entry.target.kind === "string"));
});

test("overview reflects required, optional and hidden content", () => {
  const draft = createDefaultDraft(); draft.copy.heroTitle = ""; draft.site.tagline = ""; draft.layout.visibility.contact = false;
  const overview = entries(draft); const byId = new Map(overview.map((entry) => [entry.id, entry]));
  assert.equal(byId.get("field:copy.heroTitle")?.status, "incomplete");
  assert.equal(byId.get("field:site.tagline")?.status, "optional-empty");
  assert.equal(byId.get("field:copy.contactTitle")?.status, "hidden");
});

test("dynamic targets remain stable when collections move", () => {
  const draft = createDefaultDraft(); const id = draft.offers[1].id; const before = entries(draft).find((entry) => entry.id === `offer-title:${id}`)?.target;
  const [moved] = draft.offers.splice(1, 1); draft.offers.unshift(moved);
  const after = entries(draft).find((entry) => entry.id === `offer-title:${id}`)?.target;
  assert.deepEqual(after, before);
});
