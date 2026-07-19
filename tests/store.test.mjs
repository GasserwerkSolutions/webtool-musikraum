import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultDraft } from "../assets/domain.js";
import { MemoryDraftRepository } from "../assets/persistence.js";
import { BuilderStore } from "../assets/store.js";

test("serializes writes and preserves stable offer ids", async () => {
  const repository = new MemoryDraftRepository(); const draft = createDefaultDraft(); const id = draft.offers[0].id; const store = new BuilderStore(draft, repository, 1);
  store.mutate((next) => { next.offers[0].title = "Instrumente entdecken"; }); await store.flush();
  const saved = await repository.getDraft(draft.draftId);
  assert.equal(saved.offers[0].id, id);
  assert.equal(saved.offers[0].title, "Instrumente entdecken");
});

test("surfaces durability failures and later saves recover", async () => {
  const repository = new MemoryDraftRepository(); const draft = createDefaultDraft(); const originalPut = repository.putDraft.bind(repository); let fail = true;
  repository.putDraft = async (value) => { if (fail) throw new Error("quota"); await originalPut(value); };
  const store = new BuilderStore(draft, repository, 1000); store.mutate((next) => { next.site.name = "Erster Versuch"; }); await assert.rejects(() => store.flush(), /quota/);
  fail = false; store.mutate((next) => { next.site.name = "Zweiter Versuch"; }); await store.flush();
  assert.equal((await repository.getDraft(draft.draftId)).site.name, "Zweiter Versuch");
});

test("undoes, redoes and clears redo after a new change", () => {
  const repository = new MemoryDraftRepository(); const draft = createDefaultDraft(); const original = draft.site.name; const store = new BuilderStore(draft, repository, 1000);
  store.mutate((next) => { next.site.name = "Musikraum neu"; });
  assert.equal(store.canUndo, true); assert.equal(store.undo(), true); assert.equal(store.snapshot.site.name, original); assert.equal(store.canRedo, true);
  assert.equal(store.redo(), true); assert.equal(store.snapshot.site.name, "Musikraum neu");
  store.undo(); store.mutate((next) => { next.site.name = "Anderer Name"; }); assert.equal(store.canRedo, false);
});

test("groups consecutive edits to the same field into one undo step", () => {
  const repository = new MemoryDraftRepository(); const draft = createDefaultDraft(); const original = draft.site.tagline; const store = new BuilderStore(draft, repository, 1000);
  store.mutate((next) => { next.site.tagline = "A"; }, "field:site.tagline"); store.mutate((next) => { next.site.tagline = "Ab"; }, "field:site.tagline"); store.mutate((next) => { next.site.tagline = "Abc"; }, "field:site.tagline");
  store.undo(); assert.equal(store.snapshot.site.tagline, original); assert.equal(store.canUndo, false);
});
