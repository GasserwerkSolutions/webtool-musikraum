import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { adaptMusicraumDraft, BUILD_EDIT_CORE_SCHEMA_VERSION, MUSICRAUM_ADAPTER_ID, MUSICRAUM_ADAPTER_VERSION } from "../assets/build-edit-adapter.js";
import { createDefaultDraft } from "../assets/domain.js";

function fixture() {
  const draft = createDefaultDraft("2026-08-20T10:00:00.000Z");
  draft.draftId = "musicraum-fixture-v1";
  draft.updatedAt = "2026-08-20T11:00:00.000Z";
  return draft;
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

test("adapter is pure, deterministic and records every contract version", () => {
  const draft = deepFreeze(fixture());
  const before = JSON.stringify(draft);
  const first = adaptMusicraumDraft(draft);
  const second = adaptMusicraumDraft(draft);
  assert.deepEqual(first, second);
  assert.equal(JSON.stringify(draft), before);
  assert.deepEqual(first.provenance, {
    adapterId: MUSICRAUM_ADAPTER_ID,
    adapterVersion: MUSICRAUM_ADAPTER_VERSION,
    sourceSchemaVersion: 1,
    coreSchemaVersion: BUILD_EDIT_CORE_SCHEMA_VERSION,
    sourceDraftId: "musicraum-fixture-v1",
  });
  assert.deepEqual(JSON.parse(JSON.stringify(first)), first);
});

test("adapter maps ordered vertical content into one domain-neutral page", () => {
  const draft = fixture();
  draft.layout.order = ["offers", "intro", "why", "story", "contact"];
  draft.layout.visibility.why = false;
  const result = adaptMusicraumDraft(draft);
  const page = result.input.pages[0];
  assert.equal(result.input.documentType, "raw-site-input");
  assert.equal(result.input.site.industry, "creative-service");
  assert.equal(page.slug, "/");
  assert.deepEqual(page.sections.map((section) => section.extensions?.musicraumKey).filter(Boolean), [
    "hero", "offers", "intro", "why", "story", "contact",
  ]);
  assert.equal(page.sections.find((section) => section.extensions?.musicraumKey === "why").enabled, false);
  assert.deepEqual(page.sections.find((section) => section.extensions?.musicraumKey === "offers").items, draft.offers);
  assert.deepEqual(result.input.shared.navigation.map((item) => item.link.fragment), ["angebote", "franz", "geschichte", "kontakt"]);
});

test("vertical readiness becomes structured diagnostics with editable targets", () => {
  const draft = fixture();
  draft.copy.heroTitle = "";
  draft.site.email = "not-an-email";
  draft.site.phone = "";
  const diagnostics = adaptMusicraumDraft(draft).diagnostics;
  assert.ok(diagnostics.some((item) => item.code === "musicraum.hero:title:missing" && item.targetId === "field:copy.heroTitle"));
  assert.ok(diagnostics.some((item) => item.code === "musicraum.contact:methods:missing" && item.severity === "error"));
  assert.ok(diagnostics.every((item) => item.code && item.message && Array.isArray(item.path)));
});

test("adapter source has no DOM, persistence or network side effects", async () => {
  const source = await readFile(new URL("../src/build-edit-adapter.ts", import.meta.url), "utf8");
  for (const forbidden of ["document.", "window.", "indexedDB", "fetch(", "XMLHttpRequest"]) {
    assert.equal(source.includes(forbidden), false, `adapter must not contain ${forbidden}`);
  }
});
