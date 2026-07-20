import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { createDefaultDraft } from "../assets/domain.js";
import { PREVIEW_CHANNEL, PREVIEW_PROTOCOL_VERSION } from "../assets/preview-contract.js";
import { buildWebsiteHtml } from "../assets/website.js";

const instanceId = "bridge-instance";
const renderGeneration = 5;

async function bridgeFixture(revision = 0) {
  const draft = createDefaultDraft();
  const html = buildWebsiteHtml(draft, { preview: true, previewInstanceId: instanceId, parentOrigin: "*", previewRevision: revision, renderGeneration });
  const dom = new JSDOM(html, { url: "https://preview.test", runScripts: "dangerously", pretendToBeVisual: true });
  const results = [];
  dom.window.addEventListener("message", (event) => { if (event.data?.action === "update-result") results.push(event.data); });
  await new Promise((resolve) => dom.window.setTimeout(resolve, 10));
  return { dom, draft, results };
}

function request(revision, operations, baseRevision = revision - 1, requestId = `request-${revision}`) {
  return { channel: PREVIEW_CHANNEL, version: PREVIEW_PROTOCOL_VERSION, instanceId, renderGeneration, requestId, baseRevision, revision, action: "apply-update", operations };
}

function dispatch(dom, value) {
  dom.window.dispatchEvent(new dom.window.MessageEvent("message", { data: value, source: dom.window, origin: "https://editor.test" }));
}

function exactTarget(document, target) {
  const key = JSON.stringify(target); const matches = [...document.querySelectorAll("[data-preview-target]")].filter((element) => element.getAttribute("data-preview-target") === key);
  assert.equal(matches.length, 1); return matches[0];
}

function regionHtml(draft, region, revision) {
  const html = buildWebsiteHtml(draft, { preview: true, previewInstanceId: instanceId, parentOrigin: "*", previewRevision: revision, renderGeneration });
  const parsed = new JSDOM(html); const matches = [...parsed.window.document.querySelectorAll("[data-preview-region]")].filter((element) => element.getAttribute("data-preview-region") === region);
  assert.equal(matches.length, 1); const outer = matches[0].outerHTML; parsed.window.close(); return outer;
}

test("multi-operation validation is atomic", async () => {
  const { dom, results } = await bridgeFixture();
  const heroTarget = { kind: "field", field: "copy.heroTitle" }; const title = exactTarget(dom.window.document, heroTarget); const original = title.textContent;
  dispatch(dom, request(1, [
    { type: "patch-text", target: heroTarget, value: "Darf nicht sichtbar werden" },
    { type: "patch-text", target: { kind: "field", field: "copy.unknown" }, value: "Ungültig" },
  ]));
  await new Promise((resolve) => dom.window.setTimeout(resolve, 10));
  assert.equal(title.textContent, original); assert.equal(results.at(-1)?.success, false); assert.equal(results.at(-1)?.reason, "unknown-target");
  dom.window.close();
});

test("valid text and theme operations commit together and advance revision", async () => {
  const { dom, results } = await bridgeFixture();
  const target = { kind: "field", field: "copy.heroTitle" };
  dispatch(dom, request(1, [
    { type: "patch-theme", primary: "#112233", accent: "#aabbcc" },
    { type: "patch-text", target, value: "Inkrementeller Titel" },
  ]));
  await new Promise((resolve) => dom.window.setTimeout(resolve, 10));
  assert.equal(exactTarget(dom.window.document, target).textContent, "Inkrementeller Titel");
  assert.equal(dom.window.document.documentElement.style.getPropertyValue("--primary"), "#112233");
  assert.equal(dom.window.document.documentElement.style.getPropertyValue("--accent"), "#aabbcc");
  assert.equal(results.at(-1)?.success, true); assert.equal(results.at(-1)?.revision, 1);
  dom.window.close();
});

test("region replacement restores focus to the same preview target", async () => {
  const { dom, draft, results } = await bridgeFixture();
  const target = { kind: "field", field: "copy.heroTitle" }; exactTarget(dom.window.document, target).focus();
  draft.copy.heroTitle = "Neu gerenderter Titel";
  dispatch(dom, request(1, [{ type: "replace-region", region: "hero", html: regionHtml(draft, "hero", 1) }]));
  await new Promise((resolve) => dom.window.setTimeout(resolve, 10));
  assert.equal(exactTarget(dom.window.document, target).textContent, "Neu gerenderter Titel");
  assert.equal(dom.window.document.activeElement?.getAttribute("data-preview-target"), JSON.stringify(target));
  assert.equal(results.at(-1)?.success, true);
  dom.window.close();
});

test("stale and gapped revisions never mutate the DOM", async () => {
  const { dom, results } = await bridgeFixture(3); const target = { kind: "field", field: "copy.heroTitle" }; const original = exactTarget(dom.window.document, target).textContent;
  dispatch(dom, request(3, [{ type: "patch-text", target, value: "Stale" }], 3, "stale"));
  dispatch(dom, request(5, [{ type: "patch-text", target, value: "Gap" }], 2, "gap"));
  await new Promise((resolve) => dom.window.setTimeout(resolve, 10));
  assert.equal(exactTarget(dom.window.document, target).textContent, original);
  assert.deepEqual(results.slice(-2).map((result) => result.reason), ["stale-revision", "revision-gap"]);
  dom.window.close();
});
