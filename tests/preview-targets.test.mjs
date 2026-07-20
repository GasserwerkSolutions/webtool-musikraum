import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { createDefaultDraft } from "../assets/domain.js";
import { EDITOR_FIELD_REGISTRY } from "../assets/editor-registry.js";
import { buildWebsiteHtml } from "../assets/website.js";

const NON_RENDERED_CONFIGURATION_FIELDS = new Set(["site.instagram"]);

function completeDraft() {
  const draft = createDefaultDraft();
  for (const field of Object.keys(EDITOR_FIELD_REGISTRY)) {
    const [group, key] = field.split(".");
    if (field === "site.email") draft.site.email = "franz@example.test";
    else if (field === "site.phone") draft.site.phone = "+41321234567";
    else if (field === "site.instagram") draft.site.instagram = "https://instagram.com/musikraum";
    else if (!draft[group][key]) draft[group][key] = `Inhalt ${field}`;
  }
  for (const section of draft.layout.order) draft.layout.visibility[section] = true;
  return draft;
}

test("preview targets have unique occurrences and no nested editor targets", () => {
  const html = buildWebsiteHtml(completeDraft(), { preview: true, previewInstanceId: "targets", parentOrigin: "*", previewRevision: 0, renderGeneration: 1 });
  const dom = new JSDOM(html); const targets = [...dom.window.document.querySelectorAll("[data-preview-target]")];
  assert.ok(targets.length > 40);
  const pairs = targets.map((element) => `${element.getAttribute("data-preview-target")}|${element.getAttribute("data-preview-occurrence")}`);
  assert.equal(new Set(pairs).size, pairs.length);
  assert.ok(targets.every((element) => element.getAttribute("data-preview-occurrence")));
  assert.ok(targets.every((element) => !element.querySelector("[data-preview-target]")));
  for (const element of targets) {
    if (element.matches("a,button")) continue;
    assert.equal(element.getAttribute("role"), "button"); assert.equal(element.getAttribute("tabindex"), "0");
  }
  dom.window.close();
});

test("every visibly rendered field has a direct preview target", () => {
  const html = buildWebsiteHtml(completeDraft(), { preview: true, previewInstanceId: "coverage", parentOrigin: "*", previewRevision: 0, renderGeneration: 1 });
  const dom = new JSDOM(html); const fields = new Set([...dom.window.document.querySelectorAll("[data-preview-target]")].map((element) => { try { const target = JSON.parse(element.getAttribute("data-preview-target")); return target.kind === "field" ? target.field : null; } catch { return null; } }).filter(Boolean));
  const expected = Object.keys(EDITOR_FIELD_REGISTRY).filter((field) => !NON_RENDERED_CONFIGURATION_FIELDS.has(field)).sort();
  assert.deepEqual([...fields].filter((field) => field in EDITOR_FIELD_REGISTRY).sort(), expected);
  assert.equal(fields.has("copy.contactInstagramAction"), true);
  assert.equal(fields.has("site.instagram"), false);
  dom.window.close();
});

test("space activates non-interactive preview targets while export stays clean", async () => {
  const preview = buildWebsiteHtml(completeDraft(), { preview: true, previewInstanceId: "keyboard", parentOrigin: "*", previewRevision: 0, renderGeneration: 1 });
  const dom = new JSDOM(preview, { url: "https://preview.test", runScripts: "dangerously", pretendToBeVisual: true }); const messages = [];
  dom.window.addEventListener("message", (event) => { if (event.data?.action === "navigate-to-editor") messages.push(event.data); });
  const target = dom.window.document.querySelector("h1 [data-preview-target]"); target.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true }));
  await new Promise((resolve) => dom.window.setTimeout(resolve, 10)); assert.equal(messages.at(-1)?.target?.field, "copy.heroTitle"); dom.window.close();
  const exported = buildWebsiteHtml(completeDraft());
  assert.doesNotMatch(exported, /data-preview-target|data-preview-occurrence|preview-edit-trigger|navigate-to-editor/);
});


test("text-list editor targets are the visible list wrappers", () => {
  const html = buildWebsiteHtml(completeDraft(), { preview: true, previewInstanceId: "lists", parentOrigin: "*", previewRevision: 0, renderGeneration: 1 });
  const dom = new JSDOM(html);
  const heroItems = [...dom.window.document.querySelectorAll(".hero-notes > span")];
  const introItems = [...dom.window.document.querySelectorAll(".plain-list > li")];
  assert.ok(heroItems.length > 0); assert.ok(introItems.length > 0);
  assert.ok([...heroItems, ...introItems].every((element) => element.hasAttribute("data-preview-target")));
  assert.equal(dom.window.document.querySelector(".hero-notes > span > .preview-edit-trigger, .plain-list > li > .preview-edit-trigger"), null);
  dom.window.close();
});