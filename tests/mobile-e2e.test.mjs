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

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const closeEnough = (actual, expected, tolerance = 2) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);

test("mobile edit and preview modes preserve state and exact navigation", { timeout: 90000 }, async () => {
  const { server, url } = await staticServer();
  const browser = await puppeteer.launch({ args: chromium.args, defaultViewport: { width: 390, height: 844 }, executablePath: await chromium.executablePath(), headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#mobileModeSwitch:not([hidden])");
    await page.waitForFunction(() => getComputedStyle(document.querySelector("#mobileModeSwitch")).display === "grid");
    let preview = await waitForPreview(page);
    const initialUrl = page.url();
    const initialHistory = await page.evaluate(() => history.length);

    const initial = await page.evaluate(() => {
      const workspace = document.querySelector(".workspace"); const editor = document.querySelector(".control-surface"); const previewArea = document.querySelector(".preview-area");
      const buttons = [...document.querySelectorAll("[data-mobile-mode]")]; const rect = workspace.getBoundingClientRect();
      return { edit: buttons[0].getAttribute("aria-pressed"), preview: buttons[1].getAttribute("aria-pressed"), editorHidden: editor.getAttribute("aria-hidden"), editorInert: editor.inert, previewHidden: previewArea.getAttribute("aria-hidden"), previewInert: previewArea.inert, workspaceHeight: rect.height, horizontal: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    assert.equal(initial.edit, "true"); assert.equal(initial.preview, "false"); assert.equal(initial.editorHidden, null); assert.equal(initial.editorInert, false); assert.equal(initial.previewHidden, "true"); assert.equal(initial.previewInert, true); assert.ok(initial.workspaceHeight > 500); assert.ok(initial.horizontal <= 1);

    await page.click('[data-panel-target="content"]');
    await page.waitForFunction(() => document.querySelector('[data-panel="content"]')?.hidden === false);
    const editorScroll = await page.$eval("#surfaceStage", (stage) => { stage.scrollTop = Math.min(360, stage.scrollHeight - stage.clientHeight); stage.dispatchEvent(new Event("scroll")); return stage.scrollTop; });
    assert.ok(editorScroll > 100);

    await page.click('[data-mobile-mode="preview"]');
    await page.waitForFunction(() => document.querySelector(".workspace")?.classList.contains("is-mobile-preview"));
    const previewMode = await page.evaluate(() => ({ editorInert: document.querySelector(".control-surface").inert, previewInert: document.querySelector(".preview-area").inert, editorHidden: document.querySelector(".control-surface").getAttribute("aria-hidden"), previewHidden: document.querySelector(".preview-area").getAttribute("aria-hidden") }));
    assert.equal(previewMode.editorInert, true); assert.equal(previewMode.previewInert, false); assert.equal(previewMode.editorHidden, "true"); assert.equal(previewMode.previewHidden, null);

    await preview.evaluate(() => { const root = document.documentElement; const previous = root.style.scrollBehavior; root.style.scrollBehavior = "auto"; scrollTo(0, document.querySelector("#angebote")?.offsetTop ?? 700); root.style.scrollBehavior = previous; });
    await wait(80);
    const previewScroll = await preview.evaluate(() => scrollY);
    assert.ok(previewScroll > 300);

    await page.click('[data-mobile-mode="edit"]');
    await page.waitForFunction(() => document.querySelector(".workspace")?.classList.contains("is-mobile-edit"));
    await wait(40);
    closeEnough(await page.$eval("#surfaceStage", (stage) => stage.scrollTop), editorScroll);

    await page.click('[data-mobile-mode="preview"]');
    await page.waitForFunction(() => document.querySelector(".workspace")?.classList.contains("is-mobile-preview"));
    closeEnough(await preview.evaluate(() => scrollY), previewScroll);

    await preview.evaluate(() => document.querySelector("h1 [data-preview-target]")?.click());
    await page.waitForFunction(() => document.activeElement?.getAttribute("data-bind") === "copy.heroTitle");
    assert.equal(await page.$eval(".workspace", (workspace) => workspace.classList.contains("is-mobile-edit")), true);
    const focusVisibility = await page.evaluate(() => { const target = document.activeElement.getBoundingClientRect(); const stage = document.querySelector("#surfaceStage").getBoundingClientRect(); return { top: target.top, bottom: target.bottom, stageTop: stage.top, stageBottom: stage.bottom }; });
    assert.ok(focusVisibility.top >= focusVisibility.stageTop - 1); assert.ok(focusVisibility.bottom <= focusVisibility.stageBottom + 1);

    await page.click('[data-mobile-mode="preview"]');
    await page.waitForFunction(() => document.querySelector(".workspace")?.classList.contains("is-mobile-preview"));
    closeEnough(await preview.evaluate(() => scrollY), previewScroll);
    assert.equal(page.url(), initialUrl); assert.equal(await page.evaluate(() => history.length), initialHistory);

    await page.click('[data-mobile-mode="edit"]');
    await page.click('[data-panel-target="hero"]');
    await page.$eval('[data-bind="copy.heroTitle"]', (input) => { input.value = ""; input.dispatchEvent(new Event("input", { bubbles: true })); });
    await page.click('[data-mobile-mode="preview"]');
    await page.click('.topbar [data-action="export"]');
    await page.waitForFunction(() => document.querySelector('[data-panel="publish"]')?.hidden === false && document.querySelector(".workspace")?.classList.contains("is-mobile-edit"));
    const heroBlocker = await page.evaluate(() => [...document.querySelectorAll('#readinessList [data-editor-target]')].find((element) => element.getAttribute('data-editor-target')?.includes('copy.heroTitle'))?.getAttribute('data-editor-target') ?? null);
    assert.ok(heroBlocker);
    await page.click(`#readinessList [data-editor-target='${heroBlocker.replaceAll("'", "\\'")}']`);
    await page.waitForFunction(() => document.activeElement?.getAttribute("data-bind") === "copy.heroTitle");

    await page.setViewport({ width: 320, height: 700 });
    await page.waitForFunction(() => document.documentElement.clientWidth === 320);
    await page.click('[data-panel-target="publish"]');
    const compact = await page.evaluate(() => {
      const selectors = "#mobileModeSwitch button, .topbar button, .surface-nav__item, [data-panel].is-active input, [data-panel].is-active textarea, [data-panel].is-active button";
      const controls = [...document.querySelectorAll(selectors)].filter((element) => { const style = getComputedStyle(element); const rect = element.getBoundingClientRect(); return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0; }).map((element) => { const rect = element.getBoundingClientRect(); return { width: rect.width, height: rect.height, label: element.getAttribute("aria-label") || element.textContent.trim().slice(0, 40) }; });
      const stage = document.querySelector("#surfaceStage"); const exportButton = document.querySelector('[data-panel="publish"] [data-action="export"]'); const exportRect = exportButton.getBoundingClientRect(); const stageRect = stage.getBoundingClientRect();
      return { bodyHorizontal: document.documentElement.scrollWidth - document.documentElement.clientWidth, stageHorizontal: stage.scrollWidth - stage.clientWidth, controls, exportContained: exportRect.left >= stageRect.left - 1 && exportRect.right <= stageRect.right + 1, exportHeight: exportRect.height };
    });
    assert.ok(compact.bodyHorizontal <= 1); assert.ok(compact.stageHorizontal <= 1); assert.ok(compact.controls.length > 10); assert.ok(compact.controls.every((control) => control.width >= 44 && control.height >= 44), JSON.stringify(compact.controls.filter((control) => control.width < 44 || control.height < 44))); assert.equal(compact.exportContained, true); assert.ok(compact.exportHeight >= 44);
  } catch (error) { console.error("Mobile E2E failure:", error); throw error; } finally { await browser.close(); await new Promise((resolve) => server.close(resolve)); }
});

async function waitForPreview(page) { await page.waitForFunction(() => (document.querySelector("#previewFrame")?.getAttribute("srcdoc")?.length ?? 0) > 100); const handle = await page.$("#previewFrame"); const frame = await handle.contentFrame(); if (!frame) throw new Error("Preview frame unavailable"); await frame.waitForSelector(".hero"); return frame; }
