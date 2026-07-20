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
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return { server, url: `http://127.0.0.1:${address.port}` };
}

test("readiness results control preflight and download only after preparation", { timeout: 90000 }, async () => {
  const { server, url } = await staticServer();
  const browser = await puppeteer.launch({ args: chromium.args, defaultViewport: { width: 1280, height: 820 }, executablePath: await chromium.executablePath(), headless: true });
  try {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => {
      const originalFetch = window.fetch.bind(window);
      window.fetch = (input, init) => String(input).includes("hero-klangraum-wood-1200w.webp")
        ? Promise.resolve(new Response(new Uint8Array([137, 80, 78, 71]), { status: 200, headers: { "content-type": "image/png", "content-length": "4" } }))
        : originalFetch(input, init);
      window.__exportDownloads = [];
      window.__revokedExportUrls = [];
      URL.createObjectURL = () => "blob:prepared-export";
      URL.revokeObjectURL = (value) => window.__revokedExportUrls.push(value);
      const originalClick = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function click() {
        if (this.download) { window.__exportDownloads.push({ href: this.href, download: this.download }); return; }
        return originalClick.call(this);
      };
    });
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-panel-target="publish"]');
    await page.click('[data-panel-target="publish"]');
    await page.waitForFunction(() => document.querySelector("#exportStatus")?.classList.contains("is-ready"));
    assert.equal(await page.$eval("#readinessSummary", (node) => node.classList.contains("is-ready")), true);
    assert.equal(await page.$eval('[data-panel="publish"] [data-export-label]', (node) => node.textContent.trim()), "HTML-Datei herunterladen");
    assert.equal(await page.evaluate(() => window.__exportDownloads.length), 0);

    await page.click('[data-panel="publish"] [data-action="export"]');
    assert.deepEqual(await page.evaluate(() => window.__exportDownloads), [{ href: "blob:prepared-export", download: "musikraum.html" }]);

    await page.$eval('[data-bind="site.name"]', (input) => { input.value = ""; input.dispatchEvent(new Event("input", { bubbles: true })); });
    await page.waitForFunction(() => document.querySelector("#readinessSummary")?.classList.contains("is-blocked"));
    assert.equal(await page.$eval('[data-panel="publish"] [data-action="export"]', (button) => button.disabled), true);
    const blocker = await page.$('#readinessList [data-editor-target*="site.name"]');
    assert.ok(blocker);
    const blockerSemantics = await blocker.evaluate((node) => ({
      ariaLabel: node.getAttribute("aria-label"),
      text: node.textContent.replace(/\s+/g, " ").trim(),
      action: node.querySelector(".visually-hidden")?.textContent.trim(),
    }));
    assert.equal(blockerSemantics.ariaLabel, null);
    assert.match(blockerSemantics.text, /Trage einen Namen ein/);
    assert.equal(blockerSemantics.action, "bearbeiten");
    await blocker.click();
    await page.waitForFunction(() => document.activeElement?.getAttribute("data-bind") === "site.name");
    assert.equal(await page.$eval('[data-panel="site"]', (panel) => panel.hidden), false);

    await page.$eval('[data-bind="site.name"]', (input) => { input.value = "Neuer Musikraum"; input.dispatchEvent(new Event("input", { bubbles: true })); });
    await page.click('[data-panel-target="publish"]');
    await page.waitForFunction(() => document.querySelector("#exportStatus")?.classList.contains("is-ready"));
    assert.match(await page.$eval("#exportStatus", (node) => node.textContent), /Titelbild eingebettet/);
    assert.equal(await page.$eval('.topbar [data-export-label]', (node) => node.textContent.trim()), "HTML exportieren");
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
