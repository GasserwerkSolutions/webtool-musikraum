import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultDraft } from "../assets/domain.js";
import {
  PREVIEW_CHANNEL,
  PREVIEW_PROTOCOL_VERSION,
  STATIC_FIELD_REGISTRY,
  panelForTarget,
  parseNavigateMessage,
  parseReadyMessage,
  parseScrollMessage,
  parseUpdateResult,
} from "../assets/preview-contract.js";

test("registry covers every current site and copy field", () => {
  const draft = createDefaultDraft(); const actual = [...Object.keys(draft.site).map((key) => `site.${key}`), ...Object.keys(draft.copy).map((key) => `copy.${key}`)].sort();
  assert.deepEqual(Object.keys(STATIC_FIELD_REGISTRY).sort(), actual);
});

test("accepts only current, well-formed version 2 preview targets", () => {
  const draft = createDefaultDraft(); const base = { channel: PREVIEW_CHANNEL, version: PREVIEW_PROTOCOL_VERSION, instanceId: "current", renderGeneration: 3, revision: 7, action: "navigate-to-editor" };
  assert.equal(parseNavigateMessage({ ...base, target: { kind: "field", field: "copy.heroTitle" } }, "current", draft, 3)?.target.kind, "field");
  assert.equal(parseNavigateMessage({ ...base, target: { kind: "offer", offerId: draft.offers[1].id, field: "text" } }, "current", draft, 3)?.target.kind, "offer");
  assert.equal(parseNavigateMessage({ ...base, target: { kind: "text-item", list: "heroPoints", itemId: draft.heroPoints[0].id } }, "current", draft, 3)?.target.kind, "text-item");
  assert.equal(parseNavigateMessage({ ...base, target: { kind: "section", section: "contact" } }, "current", draft, 3)?.target.kind, "section");
  assert.equal(parseNavigateMessage({ ...base, version: 1, target: { kind: "panel", panel: "hero" } }, "current", draft, 3), null);
  assert.equal(parseNavigateMessage({ ...base, instanceId: "old", target: { kind: "panel", panel: "hero" } }, "current", draft, 3), null);
  assert.equal(parseNavigateMessage({ ...base, renderGeneration: 2, target: { kind: "panel", panel: "hero" } }, "current", draft, 3), null);
  assert.equal(parseNavigateMessage({ ...base, target: { kind: "field", field: "site.unknown" } }, "current", draft, 3), null);
  assert.equal(parseNavigateMessage({ ...base, target: { kind: "text-item", list: "unknown", itemId: "x" } }, "current", draft, 3), null);
  assert.equal(parseNavigateMessage({ ...base, target: { kind: "section", section: "unknown" } }, "current", draft, 3), null);
  assert.equal(parseNavigateMessage({ ...base, target: { kind: "offer", offerId: "deleted", field: "title" } }, "current", draft, 3)?.target.kind, "offer");
});

test("parses ready, update and scroll messages only for the active generation", () => {
  const envelope = { channel: PREVIEW_CHANNEL, version: PREVIEW_PROTOCOL_VERSION, instanceId: "active", renderGeneration: 4, revision: 9 };
  assert.equal(parseReadyMessage({ ...envelope, action: "ready" }, "active", 4)?.revision, 9);
  assert.equal(parseReadyMessage({ ...envelope, renderGeneration: 3, action: "ready" }, "active", 4), null);
  assert.equal(parseUpdateResult({ ...envelope, action: "update-result", requestId: "request-1", success: true }, "active", 4)?.requestId, "request-1");
  assert.equal(parseUpdateResult({ ...envelope, action: "update-result", requestId: "request-1", success: false, reason: "revision-gap" }, "active", 4)?.reason, "revision-gap");
  assert.equal(parseUpdateResult({ ...envelope, action: "update-result", requestId: "request-1", success: false, reason: "made-up" }, "active", 4), null);
  assert.deepEqual(parseScrollMessage({ ...envelope, action: "preview-scroll", position: { section: "franz", offsetWithinSection: 12, fallbackScrollY: 400 } }, "active", 4)?.position, { section: "franz", offsetWithinSection: 12, fallbackScrollY: 400 });
});

test("resolves the editor panel for all target kinds", () => {
  assert.equal(panelForTarget({ kind: "field", field: "site.email" }), "contact");
  assert.equal(panelForTarget({ kind: "offer", offerId: "offer-2", field: "text" }), "services");
  assert.equal(panelForTarget({ kind: "text-item", list: "heroPoints", itemId: "hero-1" }), "hero");
  assert.equal(panelForTarget({ kind: "text-item", list: "introPoints", itemId: "intro-1" }), "content");
  assert.equal(panelForTarget({ kind: "section", section: "offers" }), "structure");
  assert.equal(panelForTarget({ kind: "panel", panel: "design" }), "design");
});
