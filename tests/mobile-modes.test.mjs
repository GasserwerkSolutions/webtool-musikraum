import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { applyMobileMode, ensureMobileEditMode, setMobileMode } from "../assets/mobile-modes.js";

function fixture({ mobile = true } = {}) {
  const dom = new JSDOM(`<!doctype html><body>
    <header class="topbar"></header>
    <main class="workspace"><aside class="control-surface"></aside><section class="preview-area"></section></main>
    <div class="mode-switch">
      <button class="mode-switch__button is-active" data-mode="edit" aria-pressed="true">Bearbeiten</button>
      <button class="mode-switch__button" data-mode="preview" aria-pressed="false">Vorschau</button>
    </div>
    <div id="announcer"></div>
  </body>`, { url: "https://editor.test", pretendToBeVisual: true });
  const state = { mobile };
  let scrollY = 0;
  dom.window.matchMedia = () => ({ matches: state.mobile, addEventListener: () => {}, addListener: () => {} });
  Object.defineProperty(dom.window, "scrollY", { get: () => scrollY, configurable: true });
  dom.window.scrollTo = (_x, y) => { scrollY = y; };
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement });
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
