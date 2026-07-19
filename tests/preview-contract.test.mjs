import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultDraft } from "../assets/domain.js";
import { STATIC_FIELD_REGISTRY, panelForTarget, parseNavigateMessage } from "../assets/preview-contract.js";

test("registry covers every current site and copy field", () => {
  const draft = createDefaultDraft(); const actual = [...Object.keys(draft.site).map((key) => `site.${key}`), ...Object.keys(draft.copy).map((key) => `copy.${key}`)].sort();
  assert.deepEqual(Object.keys(STATIC_FIELD_REGISTRY).sort(), actual);
});

test("accepts only current, well-formed preview targets", () => {
  const draft = createDefaultDraft(); const base = { channel: "musikraum-preview", version: 1, instanceId: "current", action: "navigate-to-editor" };
  assert.equal(parseNavigateMessage({ ...base, target: { kind: "field", field: "copy.heroTitle" } }, "current", draft)?.target.kind, "field");
  assert.equal(parseNavigateMessage({ ...base, target: { kind: "offer", offerId: draft.offers[1].id, field: "text" } }, "current", draft)?.target.kind, "offer");
  assert.equal(parseNavigateMessage({ ...base, instanceId: "old", target: { kind: "panel", panel: "hero" } }, "current", draft), null);
  assert.equal(parseNavigateMessage({ ...base, target: { kind: "field", field: "site.unknown" } }, "current", draft), null);
  assert.equal(parseNavigateMessage({ ...base, target: { kind: "offer", offerId: "deleted", field: "title" } }, "current", draft)?.target.kind, "offer");
});

test("resolves the editor panel for all target kinds", () => {
  assert.equal(panelForTarget({ kind: "field", field: "site.email" }), "contact");
  assert.equal(panelForTarget({ kind: "offer", offerId: "offer-2", field: "text" }), "services");
  assert.equal(panelForTarget({ kind: "panel", panel: "design" }), "design");
});
