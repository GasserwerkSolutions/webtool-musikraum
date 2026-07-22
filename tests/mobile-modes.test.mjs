import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { applyMobileMode, closeSectionSheet, ensureMobileEditMode, initMobileModes, markPreviewReturnAvailable, openSectionSheet, refreshModeBarForKeyboard, setMobileMode } from "../assets/mobile-modes.js";

function fixture({ mobile = true } = {}) {
  const dom = new JSDOM(`<!doctype html><body>
    <header class="topbar"></header>
    <main class="workspace"><aside class="control-surface"><nav class="surface-nav"><button class="surface-nav__item is-active" data-panel-target="site">Übersicht</button><button class="surface-nav__item" data-panel-target="hero">Einstieg</button></nav><input id="keyboardProbe"></aside><section class="preview-area"></section></main>
    <div class="mode-switch">
      <button class="mode-switch__return" data-return-preview hidden>Zurück zur Vorschau</button>
      <button class="mode-switch__button is-active" data-mode="edit" aria-pressed="true">Bearbeiten</button>
      <button class="mode-switch__button" data-sheet-open aria-expanded="false">Bereiche</button>
      <button class="mode-switch__button" data-mode="preview" aria-pressed="false">Vorschau</button>
    </div>
    <div id="sectionSheet" class="section-sheet" hidden><div class="section-sheet__backdrop" data-sheet-close></div><div class="section-sheet__card"><button data-sheet-close>×</button><div id="sectionSheetList"></div></div></div>
    <div id="announcer"></div>
  </body>`, { url: "https://editor.test", pretendToBeVisual: true });
  const state = { mobile };
  let scrollY = 0;
  dom.window.matchMedia = () => ({ matches: state.mobile, addEventListener: () => {}, addListener: () => {} });
  Object.defineProperty(dom.window, "scrollY", { get: () => scrollY, configurable: true });
  dom.window.scrollTo = (_x, y) => { scrollY = y; };
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage, requestAnimationFrame: (callback) => { callback(0); return 1; } });
  const context = {
    workspace: dom.window.document.querySelector(".workspace"),
    controlSurface: dom.window.document.querySelector(".control-surface"),
    announcer: dom.window.document.getElementById("announcer"),
    mobileMode: "edit",
    mobileEditorScroll: 0,
  };
  return { dom, context, state, setScroll: (value) => { scrollY = value; }, getScroll: () => scrollY };
}

test("mobile edit mode keeps the preview inactive and inert", () => {
  const { dom, context } = fixture();
  applyMobileMode(context);
  const preview = dom.window.document.querySelector(".preview-area");
  assert.equal(context.workspace.classList.contains("is-mode-edit"), true);
  assert.equal(context.workspace.classList.contains("is-mode-preview"), false);
  assert.equal(preview.hasAttribute("inert"), true);
  assert.equal(preview.getAttribute("aria-hidden"), "true");
  assert.equal(context.controlSurface.hasAttribute("inert"), false);
  assert.equal(context.controlSurface.hasAttribute("aria-hidden"), false);
  dom.window.close();
});

test("switching modes swaps inert targets, buttons and scroll positions", () => {
  const { dom, context, setScroll, getScroll } = fixture();
  applyMobileMode(context);
  setScroll(240);
  setMobileMode(context, "preview");
  const preview = dom.window.document.querySelector(".preview-area");
  const editButton = dom.window.document.querySelector('[data-mode="edit"]');
  const previewButton = dom.window.document.querySelector('[data-mode="preview"]');
  assert.equal(context.workspace.classList.contains("is-mode-preview"), true);
  assert.equal(context.controlSurface.hasAttribute("inert"), true);
  assert.equal(context.controlSurface.getAttribute("aria-hidden"), "true");
  assert.equal(preview.hasAttribute("inert"), false);
  assert.equal(previewButton.getAttribute("aria-pressed"), "true");
  assert.equal(previewButton.classList.contains("is-active"), true);
  assert.equal(editButton.getAttribute("aria-pressed"), "false");
  assert.equal(getScroll(), 0);
  assert.match(context.announcer.textContent, /Vorschau ist aktiv/);
  setMobileMode(context, "edit");
  assert.equal(context.workspace.classList.contains("is-mode-edit"), true);
  assert.equal(context.controlSurface.hasAttribute("inert"), false);
  assert.equal(getScroll(), 240);
  assert.match(context.announcer.textContent, /Bearbeitungsmodus ist aktiv/);
  dom.window.close();
});

test("ensureMobileEditMode leaves the preview mode without an announcement", () => {
  const { dom, context } = fixture();
  applyMobileMode(context);
  setMobileMode(context, "preview");
  context.announcer.textContent = "";
  ensureMobileEditMode(context);
  assert.equal(context.mobileMode, "edit");
  assert.equal(context.workspace.classList.contains("is-mode-edit"), true);
  assert.equal(context.announcer.textContent, "");
  ensureMobileEditMode(context);
  assert.equal(context.mobileMode, "edit");
  dom.window.close();
});

test("mode bar hides only while a field has focus and the viewport is shrunk", () => {
  const { dom, context } = fixture();
  applyMobileMode(context);
  const bar = dom.window.document.querySelector(".mode-switch");
  const input = dom.window.document.getElementById("keyboardProbe");
  dom.window.visualViewport = { height: 300, offsetTop: 0, addEventListener: () => {}, removeEventListener: () => {} };
  refreshModeBarForKeyboard();
  assert.equal(bar.classList.contains("is-keyboard-hidden"), false);
  input.focus();
  refreshModeBarForKeyboard();
  assert.equal(bar.classList.contains("is-keyboard-hidden"), true);
  dom.window.visualViewport.height = dom.window.innerHeight;
  refreshModeBarForKeyboard();
  assert.equal(bar.classList.contains("is-keyboard-hidden"), false);
  dom.window.visualViewport.height = 300;
  input.blur();
  refreshModeBarForKeyboard();
  assert.equal(bar.classList.contains("is-keyboard-hidden"), false);
  dom.window.close();
});

test("legacy Android layout-resize keyboards also hide the mode bar", () => {
  const { dom, context } = fixture();
  initMobileModes(context);
  dom.window.document.querySelector(".toast")?.remove();
  const bar = dom.window.document.querySelector(".mode-switch");
  const input = dom.window.document.getElementById("keyboardProbe");
  assert.equal(dom.window.visualViewport, undefined);
  input.focus();
  refreshModeBarForKeyboard();
  assert.equal(bar.classList.contains("is-keyboard-hidden"), false, "voller Layout-Viewport darf die Leiste nicht verstecken");
  Object.defineProperty(dom.window, "innerHeight", { value: 320, configurable: true });
  refreshModeBarForKeyboard();
  assert.equal(bar.classList.contains("is-keyboard-hidden"), true, "geschrumpfter Layout-Viewport muss die Leiste verstecken");
  input.blur();
  refreshModeBarForKeyboard();
  assert.equal(bar.classList.contains("is-keyboard-hidden"), false);
  dom.window.close();
});

test("first mobile start shows the mode hint exactly once", () => {
  const { dom, context } = fixture();
  initMobileModes(context);
  const toast = dom.window.document.querySelector(".toast");
  assert.ok(toast, "Hinweis-Toast fehlt");
  assert.match(toast.textContent, /Bearbeiten und Vorschau/);
  toast.remove();
  initMobileModes(context);
  assert.equal(dom.window.document.querySelector(".toast"), null);
  dom.window.close();
});

test("section sheet lists the areas and makes the background inert", () => {
  const { dom, context } = fixture();
  applyMobileMode(context);
  openSectionSheet(context);
  const sheet = dom.window.document.getElementById("sectionSheet");
  const entries = [...dom.window.document.querySelectorAll("#sectionSheetList [data-panel-target]")];
  assert.equal(sheet.hidden, false);
  assert.deepEqual(entries.map((entry) => entry.dataset.panelTarget), ["site", "hero"]);
  assert.equal(entries[0].getAttribute("aria-current"), "step");
  assert.equal(context.workspace.hasAttribute("inert"), true);
  assert.equal(dom.window.document.querySelector(".mode-switch").hasAttribute("inert"), true);
  assert.equal(dom.window.document.querySelector("[data-sheet-open]").getAttribute("aria-expanded"), "true");
  closeSectionSheet(context);
  assert.equal(sheet.hidden, true);
  assert.equal(context.workspace.hasAttribute("inert"), false);
  assert.equal(dom.window.document.querySelector("[data-sheet-open]").getAttribute("aria-expanded"), "false");
  assert.equal(dom.window.document.activeElement, dom.window.document.querySelector("[data-sheet-open]"));
  dom.window.close();
});

test("preview return button appears after preview navigation and disappears on return", () => {
  const { dom, context } = fixture();
  applyMobileMode(context);
  const button = dom.window.document.querySelector("[data-return-preview]");
  assert.equal(button.hidden, true);
  markPreviewReturnAvailable();
  assert.equal(button.hidden, false);
  setMobileMode(context, "preview");
  assert.equal(button.hidden, true);
  dom.window.close();
});

test("desktop widths keep both areas reachable", () => {
  const { dom, context, state } = fixture({ mobile: false });
  state.mobile = false;
  context.mobileMode = "preview";
  applyMobileMode(context);
  const preview = dom.window.document.querySelector(".preview-area");
  assert.equal(context.workspace.classList.contains("is-mode-edit"), false);
  assert.equal(context.workspace.classList.contains("is-mode-preview"), false);
  assert.equal(preview.hasAttribute("inert"), false);
  assert.equal(context.controlSurface.hasAttribute("inert"), false);
  dom.window.close();
});
