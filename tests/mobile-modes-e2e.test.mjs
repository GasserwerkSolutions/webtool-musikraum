import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".webp": "image/webp" };
async function staticServer() {
  const root = new URL("../", import.meta.url).pathname;
  const server = createServer(async (request, response) => { try { const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://local").pathname); const relative = pathname === "/" ? "index.html" : pathname.slice(1); const path = normalize(join(root, relative)); if (!path.startsWith(root) || !(await stat(path)).isFile()) throw new Error("not found"); response.setHeader("content-type", MIME[extname(path)] ?? "application/octet-stream"); response.end(await readFile(path)); } catch { response.statusCode = 404; response.end("Not found"); } });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve)); const address = server.address(); return { server, url: `http://127.0.0.1:${address.port}` };
}

async function previewFrame(page) {
  await page.waitForFunction(() => (document.querySelector("#previewFrame")?.getAttribute("srcdoc")?.length ?? 0) > 100);
  const handle = await page.$("#previewFrame");
  const frame = await handle.contentFrame();
  if (!frame) throw new Error("Preview frame unavailable");
  await frame.waitForSelector(".hero");
  return frame;
}

async function waitForStablePreview(page) {
  let last = await page.$eval("#previewFrame", (frame) => frame.getAttribute("srcdoc"));
  for (;;) {
    await new Promise((resolve) => setTimeout(resolve, 2300));
    const next = await page.$eval("#previewFrame", (frame) => frame.getAttribute("srcdoc"));
    if (next === last) return;
    last = next;
  }
}

test("mobile edit and preview modes with separate scroll states", { timeout: 90000 }, async () => {
  const { server, url } = await staticServer();
  const browser = await puppeteer.launch({ args: chromium.args, defaultViewport: { width: 390, height: 740 }, executablePath: await chromium.executablePath(), headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".toast", { timeout: 8000 });
    assert.match(await page.$eval(".toast", (toast) => toast.textContent ?? ""), /Bearbeiten und Vorschau/);
    let preview = await previewFrame(page);
    await waitForStablePreview(page);
    preview = await previewFrame(page);

    const initial = await page.evaluate(() => {
      const workspace = document.querySelector(".workspace");
      const previewArea = document.querySelector(".preview-area");
      const modeSwitch = document.querySelector(".mode-switch");
      const targets = [...document.querySelectorAll("[data-mode], .surface-nav__item, .topbar .button")].map((element) => { const rect = element.getBoundingClientRect(); return { width: rect.width, height: rect.height, visible: getComputedStyle(element).display !== "none" && rect.width > 0 && rect.height > 0 }; });
      return {
        editMode: workspace.classList.contains("is-mode-edit"),
        modeSwitchVisible: getComputedStyle(modeSwitch).display === "flex",
        previewInert: previewArea.hasAttribute("inert"),
        previewHidden: getComputedStyle(previewArea).visibility === "hidden",
        editorVisible: getComputedStyle(document.querySelector(".control-surface")).display !== "none",
        targets,
        bodyHorizontal: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        viewportSwitchHidden: getComputedStyle(document.querySelector(".viewport-switch--topbar")).display === "none",
        topbarActionsOverflow: ((actions) => actions.scrollWidth - actions.clientWidth)(document.querySelector(".topbar__actions")),
        inputFontSize: getComputedStyle(document.querySelector('[data-bind="site.name"]')).fontSize,
      };
    });
    assert.equal(initial.viewportSwitchHidden, true);
    assert.ok(initial.topbarActionsOverflow <= 1, `Topbar-Aktionen scrollen: ${initial.topbarActionsOverflow}`);
    assert.equal(initial.inputFontSize, "16px");

    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".surface-nav")).display), "none");
    await page.click("[data-sheet-open]");
    await page.waitForFunction(() => !document.getElementById("sectionSheet").hidden);
    const sheet = await page.evaluate(() => ({
      entries: [...document.querySelectorAll("#sectionSheetList [data-panel-target]")].map((entry) => { const rect = entry.getBoundingClientRect(); return { key: entry.dataset.panelTarget, height: rect.height }; }),
      backgroundInert: document.querySelector(".workspace").hasAttribute("inert") && document.querySelector(".topbar").hasAttribute("inert"),
      focusInSheet: document.getElementById("sectionSheet").contains(document.activeElement),
    }));
    assert.equal(sheet.entries.length, 8);
    assert.ok(sheet.entries.every((entry) => entry.height >= 44), "Sheet-Einträge unter 44px");
    assert.equal(sheet.backgroundInert, true);
    assert.equal(sheet.focusInSheet, true);
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => document.getElementById("sectionSheet").hidden);
    assert.equal(await page.evaluate(() => document.querySelector(".workspace").hasAttribute("inert")), false);
    await page.click("[data-sheet-open]");
    await page.waitForFunction(() => !document.getElementById("sectionSheet").hidden);
    await page.click('#sectionSheetList [data-panel-target="services"]');
    await page.waitForFunction(() => document.getElementById("sectionSheet").hidden);
    assert.equal(await page.evaluate(() => document.querySelector('[data-panel="services"]')?.hidden), false);
    assert.match(await page.evaluate(() => document.querySelector("#panelStatus").textContent ?? ""), /Schritt 4 von 8/);
    await page.click("[data-sheet-open]");
    await page.waitForFunction(() => !document.getElementById("sectionSheet").hidden);
    await page.click('#sectionSheetList [data-panel-target="site"]');
    await page.waitForFunction(() => document.getElementById("sectionSheet").hidden && document.querySelector('[data-panel="site"]')?.hidden === false);
    assert.equal(initial.editMode, true);
    assert.equal(initial.modeSwitchVisible, true);
    assert.equal(initial.previewInert, true);
    assert.equal(initial.previewHidden, true);
    assert.equal(initial.editorVisible, true);
    assert.ok(initial.bodyHorizontal <= 1);
    assert.ok(initial.targets.length > 0);
    for (const target of initial.targets.filter((entry) => entry.visible)) { assert.ok(target.width >= 44, `Touch-Ziel zu schmal: ${target.width}`); assert.ok(target.height >= 44, `Touch-Ziel zu niedrig: ${target.height}`); }

    await page.evaluate(() => Object.defineProperty(window, "visualViewport", { value: { height: 320, offsetTop: 0, width: innerWidth, addEventListener() {}, removeEventListener() {} }, configurable: true }));
    await page.focus('[data-bind="site.name"]');
    await page.waitForFunction(() => getComputedStyle(document.querySelector(".mode-switch")).display === "none");
    await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); });
    await page.waitForFunction(() => getComputedStyle(document.querySelector(".mode-switch")).display === "flex");
    await page.evaluate(() => { delete window.visualViewport; });

    await page.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; scrollTo(0, 260); });
    await page.click('[data-mode="preview"]');
    const inPreview = await page.evaluate(() => {
      const workspace = document.querySelector(".workspace");
      const previewArea = document.querySelector(".preview-area");
      const frame = document.querySelector("#previewFrame");
      const frameRect = frame.getBoundingClientRect();
      return {
        previewMode: workspace.classList.contains("is-mode-preview"),
        editorInert: document.querySelector(".control-surface").hasAttribute("inert"),
        editorHidden: getComputedStyle(document.querySelector(".control-surface")).display === "none",
        previewReachable: !previewArea.hasAttribute("inert") && getComputedStyle(previewArea).visibility !== "hidden",
        frameVisible: frameRect.width > 320 && frameRect.height > 300,
        frameFillsWidth: frameRect.width >= innerWidth - 1,
        frameFillsHeight: frameRect.height >= (document.querySelector(".preview-desk")?.getBoundingClientRect().height ?? 0) - 1,
        frameOnScreen: frameRect.left >= 0 && frameRect.right <= innerWidth,
        pressedStates: [...document.querySelectorAll("[data-mode]")].map((button) => `${button.dataset.mode}:${button.getAttribute("aria-pressed")}`).join(","),
        returnHidden: document.querySelector("[data-return-preview]").hidden,
      };
    });
    assert.equal(inPreview.returnHidden, true, "Rückkehr-Knopf darf nach manuellem Wechsel nicht erscheinen");
    assert.equal(inPreview.previewMode, true);
    assert.equal(inPreview.editorInert, true);
    assert.equal(inPreview.editorHidden, true);
    assert.equal(inPreview.previewReachable, true);
    assert.equal(inPreview.frameVisible, true);
    assert.equal(inPreview.frameFillsWidth, true, "Vorschau nutzt die Breite nicht voll aus");
    assert.equal(inPreview.frameFillsHeight, true, "Vorschau nutzt die Höhe nicht voll aus");
    assert.equal(inPreview.frameOnScreen, true);
    assert.equal(inPreview.pressedStates, "edit:false,preview:true");

    const innerOverflow = await preview.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(innerOverflow <= 0, `Vorschau scrollt horizontal: ${innerOverflow}`);

    await preview.evaluate(() => { const root = document.documentElement; root.style.scrollBehavior = "auto"; scrollTo(0, 400); });
    await new Promise((resolve) => setTimeout(resolve, 250));
    const previewScroll = await preview.evaluate(() => scrollY);
    assert.ok(previewScroll > 300);

    await page.click('[data-mode="edit"]');
    await page.waitForFunction(() => document.querySelector(".workspace").classList.contains("is-mode-edit"));
    const editorScrollRestored = await page.evaluate(() => scrollY);
    assert.ok(Math.abs(editorScrollRestored - 260) <= 1, `Editor-Scroll nicht wiederhergestellt: ${editorScrollRestored}`);

    await page.click('[data-mode="preview"]');
    await page.waitForFunction(() => document.querySelector(".workspace").classList.contains("is-mode-preview"));
    preview = await previewFrame(page);
    const restoredPreviewScroll = await preview.evaluate(() => scrollY);
    assert.ok(Math.abs(restoredPreviewScroll - previewScroll) <= 1, `Preview-Scroll nicht erhalten: ${restoredPreviewScroll}`);

    await preview.evaluate(() => { const root = document.documentElement; root.style.scrollBehavior = "auto"; scrollTo(0, 0); });
    await preview.click("h1 .preview-edit-trigger");
    await page.waitForFunction(() => document.querySelector(".workspace").classList.contains("is-mode-edit"));
    await page.waitForFunction(() => document.activeElement?.getAttribute("data-bind") === "copy.heroTitle");
    assert.equal(await page.evaluate(() => document.querySelector('[data-panel="hero"]')?.hidden), false);
    assert.equal(await page.evaluate(() => location.hash), "");

    assert.equal(await page.evaluate(() => document.querySelector("[data-return-preview]").hidden), false, "Rückkehr-Knopf fehlt nach Vorschau-Navigation");
    await page.click("[data-return-preview]");
    await page.waitForFunction(() => document.querySelector(".workspace").classList.contains("is-mode-preview"));
    assert.equal(await page.evaluate(() => document.querySelector("[data-return-preview]").hidden), true);
    preview = await previewFrame(page);

    await page.setViewport({ width: 300, height: 640 });
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 250)));
    const scaled = await page.evaluate(() => {
      const frame = document.querySelector("#previewFrame");
      const rect = frame.getBoundingClientRect();
      return {
        transform: getComputedStyle(frame).transform,
        styleWidth: frame.style.width,
        right: rect.right,
        viewportWidth: innerWidth,
        bodyHorizontal: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    assert.notEqual(scaled.transform, "none", "Skalierung fehlt auf schmalem Display");
    assert.equal(scaled.styleWidth, "320px");
    assert.ok(scaled.right <= scaled.viewportWidth + .5, `Vorschau ragt seitlich hinaus: ${scaled.right}`);
    assert.ok(scaled.bodyHorizontal <= Math.max(1, 320 - scaled.viewportWidth + 1), `Seite breiter als die 320px-Untergrenze des Editors: ${scaled.bodyHorizontal}`);
    const narrowInner = await preview.evaluate(() => ({ width: document.documentElement.clientWidth, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth }));
    assert.equal(narrowInner.width, 320);
    assert.ok(narrowInner.overflow <= 0, `Innere Vorschau scrollt horizontal: ${narrowInner.overflow}`);

    await page.setViewport({ width: 390, height: 740 });
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 250)));
    assert.equal(await page.evaluate(() => document.querySelector("#previewFrame").style.width), "", "Skalierung muss auf normaler Breite entfallen");

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => (document.querySelector("#previewFrame")?.getAttribute("srcdoc")?.length ?? 0) > 100);
    assert.equal(await page.evaluate(() => document.querySelector(".toast")?.textContent ?? ""), "");
  } catch (error) { console.error("Mobile-E2E failure:", error); throw error; } finally { await browser.close(); await new Promise((resolve) => server.close(resolve)); }
});
