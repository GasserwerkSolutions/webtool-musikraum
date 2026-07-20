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
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://local").pathname);
      const relative = pathname === "/" ? "index.html" : pathname.slice(1);
      const path = normalize(join(root, relative));
      if (!path.startsWith(root) || !(await stat(path)).isFile()) throw new Error("not found");
      response.setHeader("content-type", MIME[extname(path)] ?? "application/octet-stream");
      response.end(await readFile(path));
    } catch {
      response.statusCode = 404;
      response.end("Not found");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return { server, url: `http://127.0.0.1:${address.port}` };
}

function closeEnough(actual, expected, tolerance = 0.75) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);
}

test("header remains compact, unwrapped and width-stable while saving", { timeout: 90000 }, async () => {
  const { server, url } = await staticServer();
  const browser = await puppeteer.launch({ args: chromium.args, defaultViewport: { width: 1051, height: 720 }, executablePath: await chromium.executablePath(), headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#previewFrame");
    await page.waitForFunction(() => (document.querySelector("#previewFrame")?.getAttribute("srcdoc")?.length ?? 0) > 100);
    await page.click('[data-panel-target="hero"]');

    const before = await headerSnapshot(page);
    assert.equal(before.statusWidth, 30);
    assert.equal(before.wrapViolations.length, 0);
    assert.ok(before.topbarOverflow <= 1);
    assert.ok(before.topbarHeight <= 57);
    assert.equal(before.undoText, "Rückgängig");
    assert.equal(before.redoText, "Wiederholen");

    await page.$eval('[data-bind="copy.heroTitle"]', (input) => {
      input.value = `${input.value}x`;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await page.waitForFunction(() => document.querySelector("#saveStatus")?.dataset.state === "saving");
    const saving = await headerSnapshot(page);
    assert.equal(saving.statusLabel, "Speichert auf diesem Gerät");
    assert.equal(saving.wrapViolations.length, 0);
    assert.ok(saving.topbarOverflow <= 1);
    assert.equal(saving.undoText, "Rückgängig");
    assert.match(saving.undoAria, /Rückgängig: Haupttitel geändert/);

    await page.waitForFunction(() => document.querySelector("#saveStatus")?.dataset.state === "saved", { timeout: 5000 });
    const saved = await headerSnapshot(page);
    assert.equal(saved.statusLabel, "Auf diesem Gerät gespeichert");
    assert.equal(saved.wrapViolations.length, 0);
    assert.ok(saved.topbarOverflow <= 1);

    for (const snapshot of [saving, saved]) {
      closeEnough(snapshot.topbarHeight, before.topbarHeight);
      closeEnough(snapshot.statusWidth, before.statusWidth);
      closeEnough(snapshot.statusLeft, before.statusLeft);
      closeEnough(snapshot.undoLeft, before.undoLeft);
      closeEnough(snapshot.redoLeft, before.redoLeft);
      closeEnough(snapshot.exportLeft, before.exportLeft);
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});

async function headerSnapshot(page) {
  return await page.evaluate(() => {
    const topbar = document.querySelector(".topbar");
    const status = document.querySelector("#saveStatus");
    const undo = document.querySelector('[data-action="undo"]');
    const redo = document.querySelector('[data-action="redo"]');
    const exportButton = document.querySelector('.topbar [data-action="export"]');
    const visibleTextElements = [...topbar.querySelectorAll("button, strong, span")].filter((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    });
    const wrapViolations = visibleTextElements.filter((element) => getComputedStyle(element).whiteSpace !== "nowrap").map((element) => element.outerHTML.slice(0, 100));
    const topbarRect = topbar.getBoundingClientRect();
    const statusRect = status.getBoundingClientRect();
    const undoRect = undo.getBoundingClientRect();
    const redoRect = redo.getBoundingClientRect();
    const exportRect = exportButton.getBoundingClientRect();
    return {
      topbarHeight: topbarRect.height,
      topbarOverflow: topbar.scrollHeight - topbar.clientHeight,
      statusWidth: statusRect.width,
      statusLeft: statusRect.left,
      statusLabel: status.getAttribute("aria-label"),
      undoLeft: undoRect.left,
      redoLeft: redoRect.left,
      exportLeft: exportRect.left,
      undoText: undo.querySelector("span")?.textContent?.trim(),
      redoText: redo.querySelector("span")?.textContent?.trim(),
      undoAria: undo.getAttribute("aria-label") ?? "",
      wrapViolations,
    };
  });
}
