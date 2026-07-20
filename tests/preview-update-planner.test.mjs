import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { createDefaultDraft } from "../assets/domain.js";
import { planPreviewUpdate } from "../assets/preview-update-planner.js";
import { buildWebsiteHtml } from "../assets/website.js";

const renderOptions = { previewInstanceId: "instance-1", parentOrigin: "*", previewScroll: null, revision: 1, renderGeneration: 2 };

function mutation(revision, effect) {
  return { revision, source: "user", effect, history: { label: "Test" }, occurredAt: revision };
}

function withDom(callback) {
  const dom = new JSDOM("<!doctype html><body></body>");
  const previous = globalThis.DOMParser;
  globalThis.DOMParser = dom.window.DOMParser;
  try { return callback(dom); } finally { globalThis.DOMParser = previous; dom.window.close(); }
}

function regionFromFullHtml(html, region) {
  const dom = new JSDOM(html); const matches = [...dom.window.document.querySelectorAll("[data-preview-region]")].filter((element) => element.getAttribute("data-preview-region") === region);
  assert.equal(matches.length, 1); const outer = matches[0].outerHTML; dom.window.close(); return outer;
}

test("plain content changes use one latest text patch", () => withDom(() => {
  const draft = createDefaultDraft(); draft.copy.heroTitle = "Erster Stand"; draft.copy.heroTitle = "Jüngster Stand";
  const plan = planPreviewUpdate([
    mutation(1, { type: "field-set", field: "copy.heroTitle", previousPresence: "present", nextPresence: "present" }),
    mutation(2, { type: "field-set", field: "copy.heroTitle", previousPresence: "present", nextPresence: "present" }),
  ], draft, { ...renderOptions, revision: 2 });
  assert.equal(plan.kind, "patch");
  assert.deepEqual(plan.operations, [{ type: "patch-text", target: { kind: "field", field: "copy.heroTitle" }, value: "Jüngster Stand" }]);
}));

test("collection moves replace one shared region and supersede nested text patches", () => withDom(() => {
  const draft = createDefaultDraft(); const moved = draft.heroPoints.splice(1, 1)[0]; draft.heroPoints.splice(0, 0, moved);
  const plan = planPreviewUpdate([
    mutation(1, { type: "text-item-set", list: "heroPoints", itemId: moved.id, previousPresence: "present", nextPresence: "present" }),
    mutation(2, { type: "collection-move", collection: "heroPoints", itemId: moved.id, previousIndex: 1, nextIndex: 0 }),
  ], draft, { ...renderOptions, revision: 2 });
  assert.equal(plan.kind, "patch"); assert.equal(plan.operations.length, 1); assert.equal(plan.operations[0].type, "replace-region"); assert.equal(plan.operations[0].region, "hero");
  const full = buildWebsiteHtml(draft, { preview: true, previewInstanceId: renderOptions.previewInstanceId, parentOrigin: "*", previewRevision: 2, renderGeneration: 2 });
  assert.equal(plan.operations[0].html, regionFromFullHtml(full, "hero"));
}));

test("layout, metadata and preset changes require a complete render", () => withDom(() => {
  const draft = createDefaultDraft();
  assert.equal(planPreviewUpdate([mutation(2, { type: "section-move", section: "why", previousIndex: 1, nextIndex: 0 })], draft, { ...renderOptions, revision: 2 }).kind, "full");
  assert.equal(planPreviewUpdate([mutation(2, { type: "field-set", field: "site.name", previousPresence: "present", nextPresence: "present" })], draft, { ...renderOptions, revision: 2 }).kind, "full");
  assert.equal(planPreviewUpdate([mutation(2, { type: "theme-set", changed: ["preset", "primary", "accent"] })], draft, { ...renderOptions, revision: 2 }).kind, "full");
}));

test("direct color changes use a theme patch", () => withDom(() => {
  const draft = createDefaultDraft(); draft.theme.primary = "#112233"; draft.theme.accent = "#aabbcc";
  const plan = planPreviewUpdate([mutation(2, { type: "theme-set", changed: ["primary", "accent"] })], draft, { ...renderOptions, revision: 2 });
  assert.deepEqual(plan, { kind: "patch", revision: 2, operations: [{ type: "patch-theme", primary: "#112233", accent: "#aabbcc" }] });
}));
