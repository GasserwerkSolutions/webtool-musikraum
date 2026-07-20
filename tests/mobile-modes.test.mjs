import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { correctMobileEditorFocus, initMobileModes, setMobileMode } from "../assets/mobile-modes.js";

function fixture() {
  const dom = new JSDOM(`<!doctype html><html><head></head><body><header class="topbar"><button data-action="export">Export</button></header><div id="switch"><button data-mobile-mode="edit" aria-pressed="true">Bearbeiten</button><button data-mobile-mode="preview" aria-pressed="false">Vorschau</button></div><main class="workspace"><aside class="control-surface"><div class="surface-stage"><section data-panel class="is-active"><h1>Editor</h1><input id="field"></section></div></aside><section class="preview-area"><iframe id="frame"></iframe></section></main><div id="announcer"></div></body></html>`, { url: "https://editor.test", pretendToBeVisual: true });
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    Element: globalThis.Element,
    HTMLElement: globalThis.HTMLElement,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    matchMedia: globalThis.matchMedia,
  };
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.Element = dom.window.Element;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
  let listener = null;
  const media = {
    matches: true,
    addEventListener: (_type, next) => { listener = next; },
    removeEventListener: () => {},
    set(value) { this.matches = value; listener?.({ matches: value }); },
  };
  globalThis.matchMedia = () => media;
  const workspace = dom.window.document.querySelector(".workspace");
  const controlSurface = dom.window.document.querySelector(".control-surface");
  const previewArea = dom.window.document.querySelector(".preview-area");
  const surfaceStage = dom.window.document.querySelector(".surface-stage");
  const previewFrame = dom.window.document.querySelector("#frame");
  const mobileModeSwitch = dom.window.document.querySelector("#switch");
  const mobileModeButtons = [...mobileModeSwitch.querySelectorAll("[data-mobile-mode]")];
  const context = { workspace, controlSurface, previewArea, surfaceStage, previewFrame, mobileModeSwitch, mobileModeButtons, mobileMode: "edit", mobileModesActive: false, mobileEditorScroll: 0, announcer: dom.window.document.querySelector("#announcer") };
  const close = () => {
    dom.window.close();
    globalThis.window = previous.window;
    globalThis.document = previous.document;
    globalThis.Element = previous.Element;
    globalThis.HTMLElement = previous.HTMLElement;
    globalThis.requestAnimationFrame = previous.requestAnimationFrame;
    globalThis.matchMedia = previous.matchMedia;
  };
  return { dom, media, context, close };
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

test("mobile modes expose only the active surface and preserve editor scroll", async () => {
  const { context, media, close } = fixture();
  try {
    initMobileModes(context);
    assert.equal(context.mobileModesActive, true);
    assert.equal(context.mobileModeSwitch.hidden, false);
    assert.equal(context.workspace.classList.contains("is-mobile-edit"), true);
    assert.equal(context.controlSurface.inert, false);
    assert.equal(context.previewArea.inert, true);
    assert.equal(context.previewArea.getAttribute("aria-hidden"), "true");

    context.surfaceStage.scrollTop = 240;
    context.surfaceStage.dispatchEvent(new window.Event("scroll"));
    setMobileMode(context, "preview", { focus: false });
    assert.equal(context.mobileEditorScroll, 240);
    assert.equal(context.controlSurface.inert, true);
    assert.equal(context.previewArea.inert, false);
    assert.equal(context.mobileModeButtons[1].getAttribute("aria-pressed"), "true");

    context.surfaceStage.scrollTop = 0;
    setMobileMode(context, "edit", { focus: false });
    await wait(30);
    assert.equal(context.surfaceStage.scrollTop, 240);
    assert.match(context.announcer.textContent, /Bearbeiten/);

    media.set(false);
    assert.equal(context.mobileModeSwitch.hidden, true);
    assert.equal(context.controlSurface.inert, false);
    assert.equal(context.previewArea.inert, false);
    assert.equal(context.controlSurface.hasAttribute("aria-hidden"), false);
    assert.equal(context.previewArea.hasAttribute("aria-hidden"), false);
  } finally { close(); }
});

test("350 ms focus fallback works without visualViewport resize", async () => {
  const { context, close } = fixture();
  try {
    context.mobileModesActive = true;
    context.mobileMode = "edit";
    const target = document.querySelector("#field");
    context.surfaceStage.scrollTop = 20;
    context.surfaceStage.getBoundingClientRect = () => ({ top: 100, bottom: 500, left: 0, right: 320, width: 320, height: 400, x: 0, y: 100, toJSON() {} });
    target.getBoundingClientRect = () => ({ top: 520, bottom: 570, left: 10, right: 300, width: 290, height: 50, x: 10, y: 520, toJSON() {} });
    globalThis.requestAnimationFrame = () => 0;
    Object.defineProperty(window, "visualViewport", { configurable: true, value: undefined });
    assert.equal(correctMobileEditorFocus(context, target), true);
    await wait(380);
    assert.ok(context.surfaceStage.scrollTop > 20);
  } finally { close(); }
});
