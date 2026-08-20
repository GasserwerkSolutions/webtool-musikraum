import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { adaptMusicraumDraft } from "../assets/build-edit-adapter.js";

const fixture = JSON.parse(await readFile(new URL("./fixtures/musicraum-draft-v1.json", import.meta.url), "utf8"));

test("canonical Musikraum v1 fixture converts reproducibly", () => {
  const first = adaptMusicraumDraft(structuredClone(fixture));
  const second = adaptMusicraumDraft(structuredClone(fixture));
  assert.deepEqual(first, second);
  assert.equal(first.input.pages.length, 1);
  assert.equal(first.input.pages[0].sections.length, 8);
  assert.equal(first.input.shared.navigation.length, 5);
  assert.equal(first.diagnostics.length, 0);
  assert.deepEqual(first.input.assets.slots.map((slot) => slot.role), ["hero", "portrait", "detail"]);
});

test("canonical fixture produces stable controlled diagnostics when required content is removed", () => {
  const incomplete = structuredClone(fixture);
  incomplete.copy.heroTitle = "";
  incomplete.site.email = "ungueltig";
  incomplete.site.phone = "";
  const diagnostics = adaptMusicraumDraft(incomplete).diagnostics;
  assert.ok(diagnostics.some((entry) => entry.code === "musicraum.hero:title:missing" && entry.targetId === "field:copy.heroTitle"));
  assert.ok(diagnostics.some((entry) => entry.code === "musicraum.contact:methods:missing" && entry.severity === "error"));
});
