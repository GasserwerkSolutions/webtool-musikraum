import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { createDefaultDraft } from "../assets/domain.js";
import { MemoryDraftRepository } from "../assets/persistence.js";
import { BuilderStore } from "../assets/store.js";
import { navigateToPreviewTarget } from "../assets/preview-navigation.js";
import { buildWebsiteHtml } from "../assets/website.js";
import { handleInput } from "../assets/ui-actions.js";

function editorFixture() {
  const dom = new JSDOM(`<!doctype html><body>
    <button data-panel-target="hero"></button><button data-panel-target="services"></button>
    <aside class="control-surface"><div class="surface-stage"><div id="surfaceCard">
      <section data-panel="hero" hidden><h2>Einstieg</h2><textarea data-bind="copy.heroTitle"></textarea></section>
      <section data-panel="services" hidden><h2>Klangmomente</h2><article data-offer-card data-offer-id="offer-1"><input data-offer-field="title"></article><article data-offer-card data-offer-id="offer-2"><textarea data-offer-field="text"></textarea></article></section>
    </div></div></aside><section class="preview-area"></section><span id="panelStatus"></span><div id="announcer"></div>
  </body>`, { url: "https://editor.test" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, location: dom.window.location, Element: dom.window.Element, HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement, HTMLTextAreaElement: dom.window.HTMLTextAreaElement, HTMLSelectElement: dom.window.HTMLSelectElement, CSS: { escape: (value) => String(value).replaceAll('"', '\\"') }, matchMedia: () => ({ matches: true }) });
  globalThis.requestAnimationFrame = (callback) => { callback(0); return 1; }; dom.window.HTMLElement.prototype.scrollTo = () => {}; dom.window.HTMLElement.prototype.scrollIntoView = () => {};
  const draft = createDefaultDraft(); draft.offers = [{ id: "offer-1", title: "Eins", text: "Text eins" }, { id: "offer-2", title: "Zwei", text: "Text zwei" }]; const store = new BuilderStore(draft, new MemoryDraftRepository());
  const context = { store, surfaceCard: document.getElementById("surfaceCard"), panelStatus: document.getElementById("panelStatus"), announcer: document.getElementById("announcer") };
  return { dom, store, context };
}

test("preview navigation focuses the exact static field without changing history", () => {
  const { dom, store, context } = editorFixture(); navigateToPreviewTarget(context, { kind: "field", field: "copy.heroTitle" });
  assert.equal(dom.window.document.activeElement?.getAttribute("data-bind"), "copy.heroTitle"); assert.equal(store.canUndo, false); dom.window.close();
});

test("preview navigation resolves the second offer instead of the first", () => {
  const { dom, context } = editorFixture(); navigateToPreviewTarget(context, { kind: "offer", offerId: "offer-2", field: "text" });
  assert.equal(dom.window.document.activeElement?.closest("[data-offer-card]")?.getAttribute("data-offer-id"), "offer-2"); dom.window.close();
});

test("stale offer navigation falls back calmly to the offers heading", () => {
  const { dom, context } = editorFixture(); navigateToPreviewTarget(context, { kind: "offer", offerId: "deleted", field: "title" });
  assert.equal(dom.window.document.activeElement?.textContent, "Klangmomente"); assert.match(context.announcer.textContent, /nicht mehr vorhanden/); dom.window.close();
});

test("preview uses native buttons and prevents its links from navigating", () => {
  const draft = createDefaultDraft(); const html = buildWebsiteHtml(draft, { preview: true, previewInstanceId: "browser", parentOrigin: "*" }); const dom = new JSDOM(html, { url: "https://preview.test", runScripts: "dangerously", pretendToBeVisual: true });
  const link = dom.window.document.querySelector(".main-nav a"); const before = dom.window.location.hash; const event = new dom.window.MouseEvent("click", { bubbles: true, cancelable: true }); link.dispatchEvent(event);
  assert.equal(event.defaultPrevented, true); assert.equal(dom.window.location.hash, before); assert.ok(dom.window.document.querySelector('h1 > button.preview-edit-trigger[type="button"]')); dom.window.close();
});

test("typing saves without rebuilding preview and change rebuilds exactly once", () => {
  const { dom, store } = editorFixture(); const input = dom.window.document.querySelector('[data-bind="copy.heroTitle"]'); let rebuilds = 0;
  const context = { store, suppressPreview: false, previewTimer: null, previewScroll: null, previewInstanceId: "", previewFrame: { set srcdoc(_) { rebuilds += 1; } } };
  store.subscribe(() => { if (!context.suppressPreview) rebuilds += 1; }); input.value = "Ein neuer Titel";
  const typing = new dom.window.Event("input", { bubbles: true }); Object.defineProperty(typing, "target", { value: input }); handleInput(context, typing); assert.equal(rebuilds, 0);
  const finished = new dom.window.Event("change", { bubbles: true }); Object.defineProperty(finished, "target", { value: input }); handleInput(context, finished); assert.equal(rebuilds, 1); dom.window.close();
});
