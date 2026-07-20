import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { createDefaultDraft } from "../assets/domain.js";
import { MemoryDraftRepository } from "../assets/persistence.js";
import { BuilderStore } from "../assets/store.js";
import { renderOffers, renderStructure, renderTextItems } from "../assets/ui-render.js";
import { handleReorderClick, handleReorderKeydown, handleReorderPointerDown, handleReorderPointerEnd, handleReorderPointerMove } from "../assets/reorder-actions.js";

function fixture() {
  const dom = new JSDOM(`<!doctype html><body>
    <div id="editorAnnouncer"></div>
    <button data-action="add-text-item" data-list="heroPoints"></button><button data-action="add-text-item" data-list="introPoints"></button><button data-action="add-offer"></button>
    <div id="heroPointList" class="item-list"></div><div id="introPointList" class="item-list"></div><div id="offerList" class="item-list"></div><div id="structureList" class="structure-list"></div>
    <template id="textItemTemplate"><article class="item-card" data-text-item-card><div class="item-card__topline"><strong data-text-item-number></strong><div class="reorder-actions"><button type="button" data-reorder-direction="up">↑</button><button type="button" data-reorder-handle>⠿</button><button type="button" data-reorder-direction="down">↓</button></div><button type="button" data-action="remove-text-item">×</button></div><label><input data-text-item-field></label></article></template>
    <template id="offerTemplate"><article class="item-card" data-offer-card><div class="item-card__topline"><strong data-offer-number></strong><div class="reorder-actions"><button type="button" data-reorder-direction="up">↑</button><button type="button" data-reorder-handle>⠿</button><button type="button" data-reorder-direction="down">↓</button></div><button type="button" data-action="remove-offer">×</button></div><input data-offer-field="title"><textarea data-offer-field="text"></textarea></article></template>
  </body>`, { url: "https://editor.test" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, Element: dom.window.Element, HTMLElement: dom.window.HTMLElement, HTMLButtonElement: dom.window.HTMLButtonElement, HTMLInputElement: dom.window.HTMLInputElement, HTMLTextAreaElement: dom.window.HTMLTextAreaElement, HTMLSelectElement: dom.window.HTMLSelectElement, CSS: { escape: (value) => String(value).replaceAll('"', '\\"') } });
  globalThis.requestAnimationFrame = (callback) => { callback(0); return 1; };
  const draft = createDefaultDraft(); const store = new BuilderStore(draft, new MemoryDraftRepository(), 1000); const mutations = []; store.subscribe((event) => mutations.push(event.mutation));
  const context = { store, announcer: document.getElementById("editorAnnouncer"), heroPointList: document.getElementById("heroPointList"), introPointList: document.getElementById("introPointList"), offerList: document.getElementById("offerList"), structureList: document.getElementById("structureList"), textItemTemplate: document.getElementById("textItemTemplate"), offerTemplate: document.getElementById("offerTemplate") };
  return { dom, store, context, mutations };
}

test("arrow controls move text items with one canonical collection effect and stable focus", () => {
  const { dom, store, context, mutations } = fixture(); renderTextItems(context, "heroPoints");
  const secondId = store.snapshot.heroPoints[1].id; const button = document.querySelectorAll('#heroPointList [data-text-item-card]')[1].querySelector('[data-reorder-direction="up"]');
  assert.equal(handleReorderClick(context, button), true);
  assert.equal(store.snapshot.heroPoints[0].id, secondId); assert.equal(store.revision, 1); assert.equal(mutations.length, 1);
  assert.deepEqual(mutations[0].effect, { type: "collection-move", collection: "heroPoints", itemId: secondId, previousIndex: 1, nextIndex: 0 });
  assert.equal(document.activeElement?.hasAttribute("data-reorder-handle"), true); assert.match(context.announcer.textContent, /Position 1 von 3/); dom.window.close();
});

test("Alt plus arrow uses the same kernel for sections", () => {
  const { dom, store, context, mutations } = fixture(); renderStructure(context); const section = store.snapshot.layout.order[1]; const handle = document.querySelectorAll('#structureList [data-section-key]')[1].querySelector('[data-reorder-handle]'); let prevented = false;
  const handled = handleReorderKeydown(context, { key: "ArrowDown", altKey: true, target: handle, preventDefault() { prevented = true; } });
  assert.equal(handled, true); assert.equal(prevented, true); assert.equal(store.snapshot.layout.order[2], section); assert.equal(mutations[0].effect.type, "section-move"); assert.equal(mutations[0].effect.previousIndex, 1); assert.equal(mutations[0].effect.nextIndex, 2); dom.window.close();
});

test("Escape releases pointer capture without creating a revision", () => {
  const { dom, store, context, mutations } = fixture(); renderOffers(context); const handle = document.querySelector('#offerList [data-offer-card]:nth-child(2) [data-reorder-handle]'); let captured = 0; let released = 0;
  handle.setPointerCapture = () => { captured += 1; }; handle.releasePointerCapture = () => { released += 1; };
  const pointer = { button: 0, pointerId: 4, clientY: 10, target: handle, preventDefault() {} };
  assert.equal(handleReorderPointerDown(context, pointer), true); assert.equal(captured, 1);
  let prevented = false; assert.equal(handleReorderKeydown(context, { key: "Escape", altKey: false, target: handle, preventDefault() { prevented = true; } }), true);
  assert.equal(prevented, true); assert.equal(released, 1); assert.equal(store.revision, 0); assert.equal(mutations.length, 0); assert.match(context.announcer.textContent, /abgebrochen/); dom.window.close();
});

test("pointer cancellation creates no revision and drop commits exactly once", () => {
  const { dom, store, context, mutations } = fixture(); renderOffers(context); let cards = [...document.querySelectorAll('#offerList [data-offer-card]')]; cards.forEach((card, index) => { card.getBoundingClientRect = () => ({ top: index * 100, height: 80, left: 0, right: 300, bottom: index * 100 + 80, width: 300, x: 0, y: index * 100, toJSON() {} }); });
  const secondId = store.snapshot.offers[1].id; let handle = cards[1].querySelector('[data-reorder-handle]'); const pointer = (target, extra = {}) => ({ button: 0, pointerId: 7, clientY: 10, target, preventDefault() {}, ...extra });
  assert.equal(handleReorderPointerDown(context, pointer(handle)), true); assert.equal(handleReorderPointerMove(context, pointer(handle)), true); assert.equal(handleReorderPointerEnd(context, pointer(handle), true), true);
  assert.equal(store.revision, 0); assert.equal(store.snapshot.offers[1].id, secondId); assert.equal(mutations.length, 0);
  cards = [...document.querySelectorAll('#offerList [data-offer-card]')]; cards.forEach((card, index) => { card.getBoundingClientRect = () => ({ top: index * 100, height: 80, left: 0, right: 300, bottom: index * 100 + 80, width: 300, x: 0, y: index * 100, toJSON() {} }); }); handle = cards[1].querySelector('[data-reorder-handle]');
  handleReorderPointerDown(context, pointer(handle)); handleReorderPointerMove(context, pointer(handle)); handleReorderPointerEnd(context, pointer(handle));
  assert.equal(store.revision, 1); assert.equal(store.snapshot.offers[0].id, secondId); assert.equal(mutations.length, 1); assert.deepEqual(mutations[0].effect, { type: "collection-move", collection: "offers", itemId: secondId, previousIndex: 1, nextIndex: 0 }); dom.window.close();
});
