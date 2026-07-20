import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultDraft } from "../assets/domain.js";
import { EDITOR_FIELD_REGISTRY, STATIC_EDITABLE_FIELDS } from "../assets/editor-registry.js";

test("central registry covers every static site and copy field", () => {
  const draft = createDefaultDraft();
  const expected = [
    ...Object.keys(draft.site).map((key) => `site.${key}`),
    ...Object.keys(draft.copy).map((key) => `copy.${key}`),
  ].sort();
  assert.deepEqual([...STATIC_EDITABLE_FIELDS].sort(), expected);
  assert.deepEqual(Object.keys(EDITOR_FIELD_REGISTRY).sort(), expected);
});

test("every registered field has complete semantic metadata", () => {
  for (const [field, definition] of Object.entries(EDITOR_FIELD_REGISTRY)) {
    assert.equal(definition.field, field);
    assert.ok(definition.label.trim());
    assert.ok(definition.historyLabel.trim());
    assert.ok(definition.panel);
    assert.ok(definition.input);
    assert.ok(definition.readinessGroup);
    assert.ok(definition.policy.requirement);
    assert.ok(definition.policy.emptyBehavior);
  }
});
