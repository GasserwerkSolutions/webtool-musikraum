import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { createDefaultDraft } from "../assets/domain.js";
import { MemoryDraftRepository } from "../assets/persistence.js";
import { PREVIEW_CHANNEL, PREVIEW_PROTOCOL_VERSION } from "../assets/preview-contract.js";
import { PreviewRuntime } from "../assets/preview-runtime.js";
import { BuilderStore } from "../assets/store.js";

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function fixture() {
  const dom = new JSDOM("<!doctype html><body></body>", { url: "https://editor.test" });
  const previousParser = globalThis.DOMParser; globalThis.DOMParser = dom.window.DOMParser;
  const store = new BuilderStore(createDefaultDraft(), new MemoryDraftRepository(), 0);
  const sent = []; const srcdocs = []; const contentWindow = { postMessage: (message) => sent.push(message) };
  const frame = { contentWindow, get srcdoc() { return srcdocs.at(-1) ?? ""; }, set srcdoc(value) { srcdocs.push(value); } };
  let id = 0;
  const runtime = new PreviewRuntime({ frame, readDraft: () => store.snapshot, readRevision: () => store.revision, readScroll: () => null, writeInstanceId: () => {}, parentOrigin: "https://editor.test", createId: () => `id-${++id}` });
  const unsubscribe = store.subscribe((event) => runtime.enqueue(event));
  const message = (data) => ({ source: contentWindow, origin: "null", data });
  const ready = () => runtime.handleMessage(message({ channel: PREVIEW_CHANNEL, version: PREVIEW_PROTOCOL_VERSION, instanceId: runtime.instanceId, renderGeneration: runtime.renderGeneration, revision: store.revision, action: "ready" }));
  const close = () => { unsubscribe(); runtime.destroy(); globalThis.DOMParser = previousParser; dom.window.close(); };
  return { store, runtime, sent, srcdocs, message, ready, close };
}

function setHeroTitle(store, value) {
  return store.mutate((draft) => { draft.copy.heroTitle = value; }, { intent: { type: "set-field", field: "copy.heroTitle" }, history: { label: "Haupttitel geändert" } });
}

test("coalesces rapid mutations and permits exactly one in-flight request", async () => {
  const { store, runtime, sent, srcdocs, message, ready, close } = fixture();
  runtime.start(); assert.equal(srcdocs.length, 1); assert.equal(ready(), true);
  setHeroTitle(store, "Erster Stand"); setHeroTitle(store, "Jüngster Stand");
  await wait(70);
  assert.equal(sent.length, 1); const first = sent[0]; assert.equal(first.baseRevision, 0); assert.equal(first.revision, 2); assert.equal(first.operations.length, 1); assert.equal(first.operations[0].value, "Jüngster Stand");
  setHeroTitle(store, "Dritter Stand"); await wait(70); assert.equal(sent.length, 1);
  runtime.handleMessage(message({ channel: PREVIEW_CHANNEL, version: PREVIEW_PROTOCOL_VERSION, instanceId: runtime.instanceId, renderGeneration: runtime.renderGeneration, revision: 2, action: "update-result", requestId: "wrong", success: true }));
  assert.equal(runtime.hasInFlightRequest, true); assert.equal(runtime.appliedRevision, 0);
  runtime.handleMessage(message({ channel: PREVIEW_CHANNEL, version: PREVIEW_PROTOCOL_VERSION, instanceId: runtime.instanceId, renderGeneration: runtime.renderGeneration, revision: 2, action: "update-result", requestId: first.requestId, success: true }));
  await wait(20); assert.equal(runtime.appliedRevision, 2); assert.equal(sent.length, 2); const second = sent[1]; assert.equal(second.baseRevision, 2); assert.equal(second.revision, 3);
  runtime.handleMessage(message({ channel: PREVIEW_CHANNEL, version: PREVIEW_PROTOCOL_VERSION, instanceId: runtime.instanceId, renderGeneration: runtime.renderGeneration, revision: 2, action: "update-result", requestId: first.requestId, success: true }));
  assert.equal(runtime.hasInFlightRequest, true);
  runtime.handleMessage(message({ channel: PREVIEW_CHANNEL, version: PREVIEW_PROTOCOL_VERSION, instanceId: runtime.instanceId, renderGeneration: runtime.renderGeneration, revision: 3, action: "update-result", requestId: second.requestId, success: true }));
  assert.equal(runtime.appliedRevision, 3); close();
});

test("patch timeout rebuilds the newest draft and ignores the expired response", async () => {
  const { store, runtime, sent, srcdocs, message, ready, close } = fixture();
  runtime.start(); ready(); const expiredInstance = runtime.instanceId; const expiredGeneration = runtime.renderGeneration;
  setHeroTitle(store, "Timeout-Titel"); await wait(70); const request = sent[0]; assert.ok(request);
  await wait(370); assert.equal(srcdocs.length, 2); assert.notEqual(runtime.instanceId, expiredInstance); assert.equal(runtime.renderGeneration, expiredGeneration + 1); assert.match(srcdocs.at(-1), /Timeout-Titel/);
  assert.equal(runtime.handleMessage(message({ channel: PREVIEW_CHANNEL, version: PREVIEW_PROTOCOL_VERSION, instanceId: expiredInstance, renderGeneration: expiredGeneration, revision: 1, action: "update-result", requestId: request.requestId, success: true })), false);
  assert.equal(ready(), true); assert.equal(runtime.appliedRevision, 1); close();
});

test("layout effects bypass patches and perform a full render", async () => {
  const { store, runtime, sent, srcdocs, ready, close } = fixture(); runtime.start(); ready();
  store.mutate((draft) => { const [section] = draft.layout.order.splice(1, 1); draft.layout.order.splice(0, 0, section); }, { intent: { type: "move-section", section: "why" }, history: { label: "Bereich verschoben" } });
  await wait(70); assert.equal(sent.length, 0); assert.equal(srcdocs.length, 2); assert.match(srcdocs.at(-1), /data-preview-region="header"/); close();
});

test("ready timeout retries one full render and never loops", { timeout: 6000 }, async () => {
  const { runtime, srcdocs, close } = fixture(); runtime.start(); assert.equal(srcdocs.length, 1);
  await wait(2050); assert.equal(srcdocs.length, 2);
  await wait(2050); assert.equal(srcdocs.length, 2); close();
});
