import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultDraft } from "../assets/domain.js";
import { MemoryDraftRepository } from "../assets/persistence.js";
import { BuilderStore } from "../assets/store.js";

const fieldDescriptor = (field, label = "Feld geändert") => ({ intent: { type: "set-field", field }, history: { key: `field:${field}`, label, target: { kind: "field", field } } });

test("serializes writes and preserves stable offer ids", async () => {
  const repository = new MemoryDraftRepository(); const draft = createDefaultDraft(); const id = draft.offers[0].id; const store = new BuilderStore(draft, repository, 1);
  store.mutate((next) => { next.offers[0].title = "Instrumente entdecken"; }, { intent: { type: "set-offer-field", offerId: id, field: "title" }, history: { label: "Klangmoment-Titel geändert" } }); await store.flush();
  const saved = await repository.getDraft(draft.draftId);
  assert.equal(saved.offers[0].id, id);
  assert.equal(saved.offers[0].title, "Instrumente entdecken");
});

test("surfaces durability failures and later saves recover", async () => {
  const repository = new MemoryDraftRepository(); const draft = createDefaultDraft(); const originalPut = repository.putDraft.bind(repository); let fail = true;
  repository.putDraft = async (value) => { if (fail) throw new Error("quota"); await originalPut(value); };
  const store = new BuilderStore(draft, repository, 1000); store.mutate((next) => { next.site.name = "Erster Versuch"; }, fieldDescriptor("site.name")); await assert.rejects(() => store.flush(), /quota/);
  fail = false; store.mutate((next) => { next.site.name = "Zweiter Versuch"; }, fieldDescriptor("site.name")); await store.flush();
  assert.equal((await repository.getDraft(draft.draftId)).site.name, "Zweiter Versuch");
});

test("increments the runtime revision only for accepted state changes", () => {
  const store = new BuilderStore(createDefaultDraft(), new MemoryDraftRepository(), 1000);
  assert.equal(store.revision, 0);
  assert.equal(store.mutate(() => {}, fieldDescriptor("site.name")), null);
  assert.equal(store.revision, 0);
  const mutation = store.mutate((next) => { next.site.name = "Neu"; }, fieldDescriptor("site.name", "Website-Name geändert"));
  assert.equal(mutation.revision, 1);
  assert.equal(store.revision, 1);
  assert.equal(mutation.effect.type, "field-set");
});

test("rejects an intent that does not describe the actual change", () => {
  const store = new BuilderStore(createDefaultDraft(), new MemoryDraftRepository(), 1000);
  assert.throws(() => store.mutate((next) => { next.site.name = "Neu"; }, fieldDescriptor("copy.heroTitle")), /INVALID_FIELD_SET|UNEXPECTED_FIELD_CHANGE/);
  assert.equal(store.revision, 0);
  assert.equal(store.canUndo, false);
});

test("undoes with an inverse effect and redoes with a verified forward effect", () => {
  const draft = createDefaultDraft(); const original = draft.site.name; const store = new BuilderStore(draft, new MemoryDraftRepository(), 1000);
  store.mutate((next) => { next.site.name = "Musikraum neu"; }, fieldDescriptor("site.name", "Website-Name geändert"));
  assert.equal(store.nextUndoAction.label, "Website-Name geändert");
  const undo = store.undo();
  assert.equal(undo.source, "undo");
  assert.deepEqual(undo.effect, { type: "field-set", field: "site.name", previousPresence: "present", nextPresence: "present" });
  assert.equal(store.snapshot.site.name, original);
  assert.equal(store.nextRedoAction.label, "Website-Name geändert");
  const redo = store.redo();
  assert.equal(redo.source, "redo");
  assert.equal(redo.effect.type, "field-set");
  assert.equal(store.snapshot.site.name, "Musikraum neu");
  assert.equal(store.revision, 3);
});

test("undo inverts collection insertion into removal", () => {
  const store = new BuilderStore(createDefaultDraft(), new MemoryDraftRepository(), 1000); const itemId = "hero-point-added";
  store.mutate((next) => { next.heroPoints.splice(1, 0, { id: itemId, text: "Neu" }); }, { intent: { type: "insert-collection-item", collection: "heroPoints", itemId }, history: { label: "Punkt hinzugefügt" } });
  const mutation = store.undo();
  assert.deepEqual(mutation.effect, { type: "collection-remove", collection: "heroPoints", itemId, previousIndex: 1 });
  assert.equal(store.snapshot.heroPoints.some((item) => item.id === itemId), false);
});

test("undo verifies theme effects from the actual snapshots", () => {
  const draft = createDefaultDraft(); const original = structuredClone(draft.theme); const store = new BuilderStore(draft, new MemoryDraftRepository(), 1000);
  store.mutate((next) => { next.theme.preset = "waldton"; next.theme.primary = "#3f514e"; next.theme.accent = "#748b81"; }, { intent: { type: "set-theme" }, history: { label: "Farbwelt geändert" } });
  const mutation = store.undo();
  assert.deepEqual(mutation.effect, { type: "theme-set", changed: ["preset", "primary", "accent"] });
  assert.deepEqual(store.snapshot.theme, original);
});

test("groups consecutive edits to the same field into one undo step", () => {
  const draft = createDefaultDraft(); const original = draft.site.tagline; const store = new BuilderStore(draft, new MemoryDraftRepository(), 1000); const descriptor = fieldDescriptor("site.tagline", "Leitsatz geändert");
  store.mutate((next) => { next.site.tagline = "A"; }, descriptor); store.mutate((next) => { next.site.tagline = "Ab"; }, descriptor); store.mutate((next) => { next.site.tagline = "Abc"; }, descriptor);
  store.undo(); assert.equal(store.snapshot.site.tagline, original); assert.equal(store.canUndo, false);
});

test("returning a grouped edit to its origin closes the group safely", () => {
  const draft = createDefaultDraft(); const original = draft.site.tagline; const store = new BuilderStore(draft, new MemoryDraftRepository(), 1000); const descriptor = fieldDescriptor("site.tagline", "Leitsatz geändert");
  store.mutate((next) => { next.site.tagline = "Zwischenstand"; }, descriptor);
  store.mutate((next) => { next.site.tagline = original; }, descriptor);
  assert.equal(store.canUndo, false);
  assert.doesNotThrow(() => store.mutate((next) => { next.site.tagline = "Neuer Anfang"; }, descriptor));
  assert.equal(store.canUndo, true);
  store.undo();
  assert.equal(store.snapshot.site.tagline, original);
});

test("flushHistoryGroup separates later edits in the same field", () => {
  const draft = createDefaultDraft(); const store = new BuilderStore(draft, new MemoryDraftRepository(), 1000); const descriptor = fieldDescriptor("site.tagline", "Leitsatz geändert");
  store.mutate((next) => { next.site.tagline = "A"; }, descriptor); store.flushHistoryGroup(); store.mutate((next) => { next.site.tagline = "B"; }, descriptor);
  store.undo(); assert.equal(store.snapshot.site.tagline, "A"); assert.equal(store.canUndo, true);
});

test("authoritative replacements clear history and emit a replacement mutation", () => {
  const draft = createDefaultDraft(); const store = new BuilderStore(draft, new MemoryDraftRepository(), 1000);
  store.mutate((next) => { next.site.name = "Vor dem Import"; }, fieldDescriptor("site.name"));
  const restored = createDefaultDraft(); restored.draftId = draft.draftId; restored.site.name = "Importiert";
  const mutation = store.replace(restored, false, "import");
  assert.equal(mutation.source, "import");
  assert.deepEqual(mutation.effect, { type: "draft-replace", reason: "import" });
  assert.equal(store.snapshot.site.name, "Importiert");
  assert.equal(store.canUndo, false);
  assert.equal(store.canRedo, false);
  assert.equal(store.undo(), null);
});

test("authoritative replacements cancel pending stale saves", async () => {
  const repository = new MemoryDraftRepository(); const draft = createDefaultDraft(); const store = new BuilderStore(draft, repository, 20);
  store.mutate((next) => { next.site.name = "Veraltet"; }, fieldDescriptor("site.name"));
  const restored = createDefaultDraft(); restored.draftId = draft.draftId; restored.site.name = "Wiederhergestellt";
  await repository.putDraft(restored);
  store.replace(restored, false, "recovery");
  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.equal((await repository.getDraft(draft.draftId)).site.name, "Wiederhergestellt");
});
