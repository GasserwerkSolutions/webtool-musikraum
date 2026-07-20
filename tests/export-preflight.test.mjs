import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultDraft } from "../assets/domain.js";
import {
  EXPORT_ASSET_MAX_BYTES,
  ExportAssetError,
  ExportPreflightController,
  fetchPinnedHeroImage,
} from "../assets/export-preflight.js";
import { MUSICRAUM_HERO_URL } from "../assets/website.js";

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const imageResponse = (body = new Uint8Array([1, 2, 3]), type = "image/png", headers = {}) => new Response(body, { status: 200, headers: { "content-type": type, ...headers } });

function controllerFixture(overrides = {}) {
  const draft = createDefaultDraft();
  let revision = 0;
  const states = [];
  const builds = [];
  const clicks = [];
  const revoked = [];
  const controller = new ExportPreflightController({
    readDraft: () => draft,
    readRevision: () => revision,
    onState: (state) => states.push(state),
    fetchAsset: overrides.fetchAsset ?? (async () => imageResponse()),
    buildHtml: overrides.buildHtml ?? ((current, options) => { builds.push({ current, options }); return `<!doctype html><img src="${options.heroImageUrl}">`; }),
    createObjectUrl: () => "blob:prepared",
    revokeObjectUrl: (url) => revoked.push(url),
    clickDownload: (url, filename) => clicks.push({ url, filename }),
    assetTimeoutMs: overrides.assetTimeoutMs ?? 50,
    quietWindowMs: overrides.quietWindowMs ?? 10,
  });
  return { draft, controller, states, builds, clicks, revoked, get revision() { return revision; }, set revision(value) { revision = value; } };
}

test("successful preparation pins revision and creates no object URL before download", async () => {
  const fixture = controllerFixture();
  const state = await fixture.controller.prepare();
  assert.equal(state.status, "ready");
  assert.equal(state.revision, 0);
  assert.equal(state.result.imageEmbedded, true);
  assert.match(fixture.builds[0].options.heroImageUrl, /^data:image\/png;base64,/);
  assert.equal(fixture.clicks.length, 0);
  assert.equal(fixture.revoked.length, 0);
  const downloaded = fixture.controller.download();
  assert.ok(downloaded);
  assert.deepEqual(fixture.clicks, [{ url: "blob:prepared", filename: "musikraum.html" }]);
  fixture.controller.destroy();
  assert.deepEqual(fixture.revoked, ["blob:prepared"]);
});

test("older generation cannot overwrite a newer ready result", async () => {
  const pending = [];
  const fixture = controllerFixture({ fetchAsset: () => new Promise((resolve) => pending.push(resolve)) });
  const first = fixture.controller.prepare();
  const second = fixture.controller.prepare();
  assert.equal(pending.length, 2);
  pending[1](imageResponse(new Uint8Array([2])));
  const secondState = await second;
  assert.equal(secondState.status, "ready");
  assert.equal(secondState.generation, 2);
  pending[0](imageResponse(new Uint8Array([1])));
  await first;
  assert.equal(fixture.controller.state.status, "ready");
  assert.equal(fixture.controller.state.generation, 2);
  assert.equal(fixture.builds.length, 1);
  fixture.controller.destroy();
});

test("mutation aborts generation and never falls back to an online export", async () => {
  let resolveFetch;
  const fixture = controllerFixture({ fetchAsset: () => new Promise((resolve) => { resolveFetch = resolve; }) });
  const preparing = fixture.controller.prepare();
  fixture.revision = 1;
  fixture.controller.notifyMutation(1);
  resolveFetch(imageResponse());
  await preparing;
  assert.equal(fixture.controller.state.status, "stale");
  assert.equal(fixture.builds.length, 0);
  fixture.controller.destroy();
});

test("asset error may complete the current generation with the pinned online source", async () => {
  const fixture = controllerFixture({ fetchAsset: async () => new Response("no", { status: 503, headers: { "content-type": "text/plain" } }) });
  const state = await fixture.controller.prepare();
  assert.equal(state.status, "ready");
  assert.equal(state.result.imageEmbedded, false);
  assert.equal(fixture.builds[0].options.heroImageUrl, MUSICRAUM_HERO_URL);
  fixture.controller.destroy();
});

test("prepared data becomes stale and restarts only after the visible-panel quiet window", async () => {
  const fixture = controllerFixture();
  fixture.controller.setPanelVisible(true);
  await wait(20);
  assert.equal(fixture.controller.state.status, "ready");
  fixture.revision = 1;
  fixture.draft.copy.heroTitle = "Neue Revision";
  fixture.controller.notifyMutation(1);
  assert.equal(fixture.controller.state.status, "stale");
  await wait(4);
  assert.equal(fixture.controller.state.status, "stale");
  await wait(20);
  assert.equal(fixture.controller.state.status, "ready");
  assert.equal(fixture.controller.state.revision, 1);
  fixture.controller.destroy();
});

test("readiness blockers prevent asset fetching and HTML generation", async () => {
  let fetched = 0;
  const fixture = controllerFixture({ fetchAsset: async () => { fetched += 1; return imageResponse(); } });
  fixture.draft.site.name = "";
  const state = await fixture.controller.prepare();
  assert.equal(state.status, "failed");
  assert.match(state.message, /Blocker/);
  assert.equal(fetched, 0);
  assert.equal(fixture.builds.length, 0);
  fixture.controller.destroy();
});

test("asset loader enforces MIME and both declared and actual size limits", async () => {
  const signal = new AbortController().signal;
  await assert.rejects(() => fetchPinnedHeroImage(async () => imageResponse(new Uint8Array([1]), "image/svg+xml"), signal), (error) => error instanceof ExportAssetError && error.code === "mime");
  await assert.rejects(() => fetchPinnedHeroImage(async () => imageResponse(new Uint8Array([1]), "image/png", { "content-length": String(EXPORT_ASSET_MAX_BYTES + 1) }), signal), (error) => error instanceof ExportAssetError && error.code === "size");
  const oversized = new Uint8Array(EXPORT_ASSET_MAX_BYTES + 1);
  await assert.rejects(() => fetchPinnedHeroImage(async () => imageResponse(oversized), signal), (error) => error instanceof ExportAssetError && error.code === "size");
});

test("asset timeout is an asset failure while parent abort remains a generation abort", async () => {
  await assert.rejects(() => fetchPinnedHeroImage(() => new Promise(() => {}), new AbortController().signal, { timeoutMs: 5 }), (error) => error instanceof ExportAssetError && error.code === "timeout");
  const controller = new AbortController();
  const operation = fetchPinnedHeroImage((_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true })), controller.signal, { timeoutMs: 100 });
  controller.abort();
  await assert.rejects(() => operation, (error) => error instanceof DOMException && error.name === "AbortError");
});
