import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { compileMusicraumSite } from "../assets/musicraum-compiler.js";
import { buildWebsiteHtml } from "../assets/website.js";

const fixture = JSON.parse(await readFile(new URL("./fixtures/musicraum-draft-v1.json", import.meta.url), "utf8"));

test("canonical fixture renders byte-equivalent HTML through build-edit", () => {
  const before = structuredClone(fixture);
  const legacy = buildWebsiteHtml(fixture);
  const compiled = compileMusicraumSite(fixture, { sourceRevision: 17 });
  assert.equal(compiled.html, legacy);
  assert.deepEqual(fixture, before);
  assert.equal(compiled.bundle.manifest.compilerVersion, "0.3.0");
  assert.deepEqual(compiled.bundle.manifest.adapter, { id: "ch.gasserwerk.musicraum", version: "1.0.0", sourceSchemaVersion: 1 });
  assert.equal(compiled.bundle.manifest.source.revision, 17);
  assert.equal(compiled.bundle.manifest.readiness.status, "ready");
  assert.equal(compiled.bundle.documents.length, 1);
  assert.equal(compiled.bundle.integrity.algorithm, "sha256");
});

test("preview carries source targets, revision and generation through the same compiler", () => {
  const { html, bundle } = compileMusicraumSite(fixture, {
    preview: true,
    previewInstanceId: "preview-fixture",
    parentOrigin: "https://editor.example.test",
    previewRevision: 23,
    renderGeneration: 7,
    sourceRevision: 23,
  });
  assert.match(html, /data-preview-target=/);
  assert.match(html, new RegExp(fixture.offers[0].id));
  assert.match(html, /preview-fixture/);
  assert.match(html, /"revision":23/);
  assert.match(html, /"renderGeneration":7/);
  assert.equal(bundle.manifest.source.revision, 23);
});

test("vertical blockers remain navigable while tolerant preview still renders", () => {
  const invalid = structuredClone(fixture);
  invalid.copy.heroTitle = "";
  const { html, bundle } = compileMusicraumSite(invalid, { preview: true, sourceRevision: 24 });
  assert.match(html, /<!doctype html>/i);
  assert.equal(bundle.manifest.readiness.status, "blocked");
  assert.ok(bundle.diagnostics.some((entry) => entry.targetId === "field:copy.heroTitle" && entry.severity === "error"));
});
