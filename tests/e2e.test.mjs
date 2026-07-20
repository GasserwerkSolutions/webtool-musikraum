import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { createDefaultDraft } from "../assets/domain.js";
import { buildWebsiteHtml } from "../assets/website.js";

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".webp": "image/webp" };
async function staticServer() {
  const root = new URL("../", import.meta.url).pathname;
  const server = createServer(async (request, response) => { try { const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://local").pathname); const relative = pathname === "/" ? "index.html" : pathname.slice(1); const path = normalize(join(root, relative)); if (!path.startsWith(root) || !(await stat(path)).isFile()) throw new Error("not found"); response.setHeader("content-type", MIME[extname(path)] ?? "application/octet-stream"); response.end(await readFile(path)); } catch { response.statusCode = 404; response.end("Not found"); } });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve)); const address = server.address(); return { server, url: `http://127.0.0.1:${address.port}` };
}

test("real browser layout, live editing and sidebar contract", { timeout: 90000 }, async () => {
  const { server, url } = await staticServer(); const browser = await puppeteer.launch({ args: chromium.args, defaultViewport: { width: 1440, height: 900 }, executablePath: await chromium.executablePath(), headless: true });
  try {
    const page = await browser.newPage(); await page.goto(url, { waitUntil: "domcontentloaded" }); await page.waitForSelector("#previewFrame"); let preview = await waitForPreview(page);

    const desktop = await page.evaluate(() => {
      const frame = document.querySelector("#previewFrame"); const desk = document.querySelector(".preview-desk"); const header = document.querySelector(".topbar"); const viewportSwitch = document.querySelector(".viewport-switch--topbar"); const saveStatus = document.querySelector("#saveStatus"); const toggle = document.querySelector("#sidebarToggle"); const note = document.querySelector(".foundation-note"); const icon = note?.querySelector(".foundation-note__icon");
      const frameRect = frame.getBoundingClientRect(); const deskRect = desk.getBoundingClientRect(); const noteRect = note?.getBoundingClientRect(); const iconRect = icon?.getBoundingClientRect(); const toggleStyle = getComputedStyle(toggle);
      return { frameWidth: frameRect.width, frameTop: frameRect.top, frameRight: frameRect.right, deskWidth: deskRect.width, headerBottom: header.getBoundingClientRect().bottom, borderRadius: getComputedStyle(frame).borderRadius, outerVertical: desk.scrollHeight - desk.clientHeight, bodyVertical: document.documentElement.scrollHeight - document.documentElement.clientHeight, bodyHorizontal: document.documentElement.scrollWidth - document.documentElement.clientWidth, toolbarExists: Boolean(document.querySelector(".preview-toolbar")), controlsOrdered: viewportSwitch.getBoundingClientRect().right <= saveStatus.getBoundingClientRect().left, toggleWidth: toggle.getBoundingClientRect().width, toggleOpacity: Number(toggleStyle.opacity), iconOffset: noteRect && iconRect ? Math.abs((noteRect.top + noteRect.bottom - iconRect.top - iconRect.bottom) / 2) : 999 };
    });
    const previewGap = desktop.frameTop - desktop.headerBottom; assert.ok(desktop.frameWidth <= 1200); assert.ok(desktop.frameWidth <= desktop.deskWidth); assert.ok(previewGap >= 15 && previewGap <= 17); assert.equal(desktop.borderRadius, "12px"); assert.ok(desktop.frameRight <= 1440); assert.equal(desktop.toolbarExists, false); assert.equal(desktop.controlsOrdered, true); assert.equal(desktop.outerVertical, 0); assert.ok(desktop.bodyVertical <= 1); assert.ok(desktop.bodyHorizontal <= 1); assert.ok(desktop.toggleWidth <= 24); assert.ok(desktop.toggleOpacity < 1); assert.ok(desktop.iconOffset <= 1); assert.ok(await preview.evaluate(() => document.documentElement.scrollHeight > innerHeight));

    await page.click('[data-viewport="tablet"]'); await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 450))); assert.ok(Math.abs(await page.$eval("#previewFrame", (frame) => frame.getBoundingClientRect().width) - 768) < .1); assert.equal(await page.$eval('[data-viewport="tablet"]', (button) => button.getAttribute("aria-pressed")), "true");
    assert.notEqual(await preview.$eval(".menu-button", (button) => getComputedStyle(button).display), "none"); await preview.click(".menu-button"); assert.equal(await preview.$eval(".main-nav", (nav) => nav.classList.contains("is-open")), true);
    await preview.click('.main-nav a[href="#franz"]'); await preview.waitForFunction(() => scrollY > 0); assert.equal(await preview.$eval(".main-nav", (nav) => nav.classList.contains("is-open")), false);

    await page.click('[data-viewport="mobile"]'); await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 450))); assert.ok(Math.abs(await page.$eval("#previewFrame", (frame) => frame.getBoundingClientRect().width) - 390) < .1); await preview.click(".menu-button"); assert.equal(await preview.$eval(".main-nav", (nav) => nav.classList.contains("is-open")), true); await preview.click(".menu-button");

    const previousLocation = preview.url(); const mail = await preview.$('a[href^="mailto:"]'); if (mail) await mail.click(); assert.equal(preview.url(), previousLocation);

    await preview.click("h1 .preview-edit-trigger"); await page.waitForFunction(() => document.activeElement?.getAttribute("data-bind") === "copy.heroTitle"); assert.equal(await page.evaluate(() => document.querySelector('[data-panel="hero"]')?.hidden), false);
    assert.match(await page.$eval('[data-bind="copy.heroTitle"]', (input) => input.closest("label")?.querySelector("[data-policy-help]")?.textContent ?? ""), /vollständigen Einstieg erforderlich/);
    const liveTitle = "Sofort sichtbarer Titel";
    await page.$eval('[data-bind="copy.heroTitle"]', (input, value) => { input.value = value; input.dispatchEvent(new Event("input", { bubbles: true })); }, liveTitle);
    await page.waitForFunction((value) => document.querySelector("#previewFrame")?.getAttribute("srcdoc")?.includes(value), {}, liveTitle);
    preview = await waitForPreview(page); assert.equal(await preview.$eval("h1", (heading) => heading.textContent.trim()), liveTitle);
    assert.match(await page.$eval('[data-action="undo"]', (button) => button.getAttribute("aria-label") ?? ""), /Rückgängig: Haupttitel geändert/);
    await page.click('[data-action="undo"]'); await page.waitForFunction((value) => !document.querySelector("#previewFrame")?.getAttribute("srcdoc")?.includes(value), {}, liveTitle);
    assert.match(await page.$eval('[data-action="redo"]', (button) => button.getAttribute("aria-label") ?? ""), /Wiederholen: Haupttitel geändert/);
    await page.click('[data-action="redo"]'); await page.waitForFunction((value) => document.querySelector("#previewFrame")?.getAttribute("srcdoc")?.includes(value), {}, liveTitle);
    preview = await waitForPreview(page);

    const heroAdd = '[data-action="add-text-item"][data-list="heroPoints"]';
    assert.equal(await page.$$eval('#heroPointList [data-text-item-card]', (cards) => cards.length), 3);
    await page.click(heroAdd); assert.equal(await page.$$eval('#heroPointList [data-text-item-card]', (cards) => cards.length), 4);
    const lastHeroInput = '#heroPointList [data-text-item-card]:last-child [data-text-item-field]';
    await page.$eval(lastHeroInput, (input) => { input.value = "Vierter Punkt"; input.dispatchEvent(new Event("input", { bubbles: true })); });
    await page.waitForFunction(() => document.querySelector("#previewFrame")?.getAttribute("srcdoc")?.includes("Vierter Punkt"));
    await page.$eval(lastHeroInput, (input) => { input.value = ""; input.dispatchEvent(new Event("input", { bubbles: true })); });
    await page.click('#heroPointList [data-text-item-card]:last-child [data-action="remove-text-item"]'); assert.equal(await page.$$eval('#heroPointList [data-text-item-card]', (cards) => cards.length), 3);
    const previewBeforeLimit = await page.$eval("#previewFrame", (frame) => frame.getAttribute("srcdoc"));
    await page.click(heroAdd); await page.click(heroAdd); await page.click(heroAdd);
    assert.equal(await page.$$eval('#heroPointList [data-text-item-card]', (cards) => cards.length), 6); assert.equal(await page.$eval(heroAdd, (button) => button.disabled), true);
    await page.waitForFunction((previous) => document.querySelector("#previewFrame")?.getAttribute("srcdoc") !== previous, {}, previewBeforeLimit);
    preview = await waitForPreview(page);

    const heroOrderBefore = await page.$$eval('#heroPointList [data-text-item-field]', (inputs) => inputs.map((input) => input.value));
    await page.click('#heroPointList [data-text-item-card]:nth-child(2) [data-reorder-direction="up"]');
    assert.equal(await page.$eval('#heroPointList [data-text-item-card]:first-child [data-text-item-field]', (input) => input.value), heroOrderBefore[1]);
    assert.equal(await page.evaluate(() => document.activeElement?.hasAttribute("data-reorder-handle")), true);
    assert.match(await page.$eval("#editorAnnouncer", (node) => node.textContent), /Position 1 von 6/);
    const reorderSizes = await page.$$eval('#heroPointList [data-reorder-handle], #heroPointList [data-reorder-direction]', (controls) => controls.map((control) => { const rect = control.getBoundingClientRect(); return { width: rect.width, height: rect.height }; }));
    assert.ok(reorderSizes.length > 0); assert.ok(reorderSizes.every(({ width, height }) => width >= 44 && height >= 44));
    await page.focus('#heroPointList [data-text-item-card]:first-child [data-reorder-handle]'); await page.keyboard.down("Alt"); await page.keyboard.press("ArrowDown"); await page.keyboard.up("Alt");
    assert.deepEqual(await page.$$eval('#heroPointList [data-text-item-field]', (inputs) => inputs.map((input) => input.value)), heroOrderBefore);

    await page.click('[data-panel-target="services"]');
    const offerOrderBefore = await page.$$eval('#offerList [data-offer-field="title"]', (inputs) => inputs.map((input) => input.value));
    await page.click('#offerList [data-offer-card]:nth-child(2) [data-reorder-direction="up"]');
    assert.equal(await page.$eval('#offerList [data-offer-card]:first-child [data-offer-field="title"]', (input) => input.value), offerOrderBefore[1]);
    assert.match(await page.$eval('[data-action="undo"]', (button) => button.getAttribute("aria-label") ?? ""), /Klangmoment .* verschoben/);
    await page.click('[data-action="undo"]'); assert.deepEqual(await page.$$eval('#offerList [data-offer-field="title"]', (inputs) => inputs.map((input) => input.value)), offerOrderBefore);

    await page.click('[data-panel-target="structure"]'); const sectionOrderBefore = await page.$$eval('#structureList [data-section-key]', (rows) => rows.map((row) => row.getAttribute("data-section-key")));
    await page.click('#structureList [data-section-key]:nth-child(2) [data-reorder-direction="up"]');
    assert.equal(await page.$eval('#structureList [data-section-key]:first-child', (row) => row.getAttribute("data-section-key")), sectionOrderBefore[1]);
    assert.match(await page.$eval("#editorAnnouncer", (node) => node.textContent), /Bereich .* Position 1 von 5/);

    await page.click('[data-viewport="desktop"]'); await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 450))); const separator = await page.$("#sidebarResizer"); const separatorBox = await separator.boundingBox(); const beforeDrag = await page.$eval(".control-surface", (surface) => surface.getBoundingClientRect().width); await page.mouse.move(separatorBox.x + separatorBox.width / 2, separatorBox.y + 80); await page.mouse.down(); await page.mouse.move(separatorBox.x + separatorBox.width / 2 + 42, separatorBox.y + 80, { steps: 4 }); await page.mouse.up(); const afterDrag = await page.$eval(".control-surface", (surface) => surface.getBoundingClientRect().width); assert.ok(afterDrag > beforeDrag);
    await page.focus("#sidebarResizer"); await page.keyboard.press("End"); const resized = await page.evaluate(() => { const editor = document.querySelector(".control-surface").getBoundingClientRect().width; const frame = document.querySelector("#previewFrame").getBoundingClientRect(); return { editor, frameWidth: frame.width, frameRight: frame.right, viewportWidth: innerWidth, bodyHorizontal: document.documentElement.scrollWidth - document.documentElement.clientWidth }; }); assert.ok(resized.editor <= 720 && resized.editor >= 420); assert.ok(resized.frameWidth <= 1200); assert.ok(resized.frameRight <= resized.viewportWidth); assert.ok(resized.bodyHorizontal <= 1);

    await page.focus("#sidebarResizer"); await page.keyboard.press("Home"); await page.click('[data-panel-target="services"]');
    const addOfferContained = await page.evaluate(() => { const button = document.querySelector('[data-action="add-offer"]'); const stage = document.querySelector(".surface-stage"); const buttonRect = button.getBoundingClientRect(); const stageRect = stage.getBoundingClientRect(); return { visible: getComputedStyle(button).display !== "none" && buttonRect.width > 0 && buttonRect.height > 0, contained: buttonRect.left >= stageRect.left - .5 && buttonRect.right <= stageRect.right + .5 }; });
    assert.equal(addOfferContained.visible, true); assert.equal(addOfferContained.contained, true);

    await page.click("#sidebarToggle"); assert.equal(await page.$eval(".control-surface", (surface) => surface.classList.contains("is-collapsed")), true); preview = await waitForPreview(page); await preview.click("h1 .preview-edit-trigger"); await page.waitForFunction(() => !document.querySelector(".control-surface")?.classList.contains("is-collapsed"));

    await page.focus("#sidebarResizer"); await page.keyboard.press("Home"); await page.keyboard.press("ArrowRight"); const storedWidth = await page.$eval(".control-surface", (surface) => surface.getBoundingClientRect().width); await page.reload({ waitUntil: "domcontentloaded" }); const restoredWidth = await page.$eval(".control-surface", (surface) => surface.getBoundingClientRect().width); assert.ok(Math.abs(restoredWidth - storedWidth) <= 1);

    await page.setViewport({ width: 1051, height: 520 }); await page.waitForFunction(() => document.querySelector(".surface-nav").scrollHeight > document.querySelector(".surface-nav").clientHeight); const compactLayout = await page.evaluate(() => ({ bodyVertical: document.documentElement.scrollHeight - document.documentElement.clientHeight, bodyHorizontal: document.documentElement.scrollWidth - document.documentElement.clientWidth, previewContained: document.querySelector("#previewFrame").getBoundingClientRect().right <= innerWidth, navContained: (() => { const button = document.querySelector('[data-panel-target="services"]'); const span = button.querySelector("span"); const buttonRect = button.getBoundingClientRect(); const textRect = span.getBoundingClientRect(); return textRect.left >= buttonRect.left && textRect.right <= buttonRect.right + .5; })() })); assert.ok(compactLayout.bodyVertical <= 1); assert.ok(compactLayout.bodyHorizontal <= 1); assert.equal(compactLayout.previewContained, true); assert.equal(compactLayout.navContained, true);

    const exportedPage = await browser.newPage(); await exportedPage.setViewport({ width: 1200, height: 700 }); await exportedPage.setContent(buildWebsiteHtml(createDefaultDraft()), { waitUntil: "domcontentloaded" }); assert.equal(await exportedPage.$("[data-preview-target], .sidebar-resizer, .sidebar-toggle"), null); await exportedPage.click('.main-nav a[href="#franz"]'); await exportedPage.waitForFunction(() => location.hash === "#franz" && scrollY > 0);
    const footer = await exportedPage.evaluate(() => { const address = document.querySelector(".footer-address")?.getBoundingClientRect(); const email = document.querySelector(".footer-email")?.getBoundingClientRect(); return { separate: Boolean(address && email && email.top >= address.bottom), renderedText: document.querySelector(".footer-contact")?.innerText ?? "" }; }); assert.equal(footer.separate, true); assert.match(footer.renderedText, /Brügg\s+info@/); await exportedPage.close();
  } catch (error) { console.error("E2E failure:", error); throw error; } finally { await browser.close(); await new Promise((resolve) => server.close(resolve)); }
});

async function waitForPreview(page) { await page.waitForFunction(() => (document.querySelector("#previewFrame")?.getAttribute("srcdoc")?.length ?? 0) > 100); const handle = await page.$("#previewFrame"); const frame = await handle.contentFrame(); if (!frame) throw new Error("Preview frame unavailable"); await frame.waitForSelector(".hero"); return frame; }
