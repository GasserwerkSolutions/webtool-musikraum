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

test("mobile edit and preview modes with separate scroll states", { timeout: 90000 }, async () => {
  const { server, url } = await staticServer();
  const browser = await puppeteer.launch({ args: chromium.args, defaultViewport: { width: 390, height: 740 }, executablePath: await chromium.executablePath(), headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded" });
    let preview = await previewFrame(page);

    const initial = await page.evaluate(() => {
      const workspace = document.querySelector(".workspace");
      const previewArea = document.querySelector(".preview-area");
      const modeSwitch = document.querySelector(".mode-switch");
      const targets = [...document.querySelectorAll("[data-mode], .surface-nav__item, .topbar .button")].map((element) => { const rect = element.getBoundingClientRect(); return { width: rect.width, height: rect.height, visible: getComputedStyle(element).display !== "none" }; });
      return {
        editMode: workspace.classList.contains("is-mode-edit"),
        modeSwitchVisible: getComputedStyle(modeSwitch).display === "flex",
        previewInert: previewArea.hasAttribute("inert"),
        previewHidden: getComputedStyle(previewArea).visibility === "hidden",
        editorVisible: getComputedStyle(document.querySelector(".control-surface")).display !== "none",
        targets,
        bodyHorizontal: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    assert.equal(initial.editMode, true);
    assert.equal(initial.modeSwitchVisible, true);
    assert.equal(initial.previewInert, true);
    assert.equal(initial.previewHidden, true);
    assert.equal(initial.editorVisible, true);
    assert.ok(initial.bodyHorizontal <= 1);
    assert.ok(initial.targets.length > 0);
    for (const target of initial.targets.filter((entry) => entry.visible)) { assert.ok(target.width >= 44, `Touch-Ziel zu schmal: ${target.width}`); assert.ok(target.height >= 44, `Touch-Ziel zu niedrig: ${target.height}`); }

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
        frameOnScreen: frameRect.left >= 0 && frameRect.right <= innerWidth,
        pressedStates: [...document.querySelectorAll("[data-mode]")].map((button) => `${button.dataset.mode}:${button.getAttribute("aria-pressed")}`).join(","),
      };
    });
    assert.equal(inPreview.previewMode, true);
    assert.equal(inPreview.editorInert, true);
    assert.equal(inPreview.editorHidden, true);
    assert.equal(inPreview.previewReachable, true);
    assert.equal(inPreview.frameVisible, true);
    assert.equal(inPreview.frameOnScreen, true);
    assert.equal(inPreview.pressedStates, "edit:false,preview:true");

    await preview.evaluate(() => { const root = document.documentElement; root.style.scrollBehavior = "auto"; scrollTo(0, 400); });
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
  } catch (error) { console.error("Mobile-E2E failure:", error); throw error; } finally { await browser.close(); await new Promise((resolve) => server.close(resolve)); }
});
