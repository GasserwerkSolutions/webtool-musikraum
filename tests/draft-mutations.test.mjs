import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultDraft } from "../assets/domain.js";
import { createDraftEffect, draftsEqualIgnoringUpdatedAt, invertDraftEffect } from "../assets/draft-mutations.js";

test("updatedAt does not create a mutation", () => {
  const before = createDefaultDraft("2026-01-01T00:00:00.000Z");
  const after = structuredClone(before);
  after.updatedAt = "2026-02-01T00:00:00.000Z";
  assert.equal(draftsEqualIgnoringUpdatedAt(before, after), true);
});

test("field effects are derived after normalization and reject unrelated changes", () => {
  const before = createDefaultDraft();
  const after = structuredClone(before);
  after.copy.heroTitle = "Neuer Titel";
  const effect = createDraftEffect(before, after, { type: "set-field", field: "copy.heroTitle" });
  assert.deepEqual(effect, { type: "field-set", field: "copy.heroTitle", previousPresence: "present", nextPresence: "present" });
  after.site.name = "Unzulässige zweite Änderung";
  assert.throws(() => createDraftEffect(before, after, { type: "set-field", field: "copy.heroTitle" }), /UNEXPECTED_FIELD_CHANGE/);
});

test("collection insert and its inverse use the verified index", () => {
  const before = createDefaultDraft();
  const after = structuredClone(before);
  after.heroPoints.splice(1, 0, { id: "hero-point-new", text: "Neu" });
  const effect = createDraftEffect(before, after, { type: "insert-collection-item", collection: "heroPoints", itemId: "hero-point-new" });
  assert.deepEqual(effect, { type: "collection-insert", collection: "heroPoints", itemId: "hero-point-new", index: 1 });
  assert.deepEqual(invertDraftEffect(effect), { type: "collection-remove", collection: "heroPoints", itemId: "hero-point-new", previousIndex: 1 });
});

test("visibility and move effects invert their actual direction", () => {
  const before = createDefaultDraft();
  const hidden = structuredClone(before); hidden.layout.visibility.story = false;
  const visibility = createDraftEffect(before, hidden, { type: "set-section-visibility", section: "story" });
  assert.deepEqual(invertDraftEffect(visibility), { type: "section-visibility", section: "story", previousVisible: false, nextVisible: true });

  const moved = structuredClone(before); moved.layout.order.splice(3, 1); moved.layout.order.splice(1, 0, "story");
  const move = createDraftEffect(before, moved, { type: "move-section", section: "story" });
  assert.deepEqual(move, { type: "section-move", section: "story", previousIndex: 3, nextIndex: 1 });
  assert.deepEqual(invertDraftEffect(move), { type: "section-move", section: "story", previousIndex: 1, nextIndex: 3 });
});
