import test from "node:test";
import assert from "node:assert/strict";
import { ACTIVE_DRAFT_POINTER_KEY, createDefaultDraft } from "../assets/domain.js";
import { MemoryDraftRepository, loadOrCreateDraft, replaceWithFreshDraft } from "../assets/persistence.js";

class FakeStorage {
  data = new Map();
  get length() { return this.data.size; }
  clear() { this.data.clear(); }
  getItem(key) { return this.data.has(key) ? this.data.get(key) : null; }
  key(index) { return [...this.data.keys()][index] ?? null; }
  removeItem(key) { this.data.delete(key); }
  setItem(key, value) { this.data.set(key, String(value)); }
}

test("creates one local Musikraum draft and stores only its pointer", async () => {
  const storage = new FakeStorage(); const repository = new MemoryDraftRepository();
  const result = await loadOrCreateDraft(repository, storage);
  assert.equal(result.draft.site.name, "Musikraum");
  assert.equal(storage.getItem(ACTIVE_DRAFT_POINTER_KEY), result.draft.draftId);
  assert.deepEqual([...storage.data.keys()], [ACTIVE_DRAFT_POINTER_KEY]);
});

test("reloads the active draft without replacing it", async () => {
  const storage = new FakeStorage(); const repository = new MemoryDraftRepository();
  const first = await loadOrCreateDraft(repository, storage); first.draft.copy.heroTitle = "Mein Klang"; await repository.putDraft(first.draft);
  const second = await loadOrCreateDraft(repository, storage);
  assert.equal(second.draft.draftId, first.draft.draftId);
  assert.equal(second.draft.copy.heroTitle, "Mein Klang");
});

test("propagates operational read failures without moving the pointer", async () => {
  const storage = new FakeStorage(); storage.setItem(ACTIVE_DRAFT_POINTER_KEY, "musikraum-existing"); const repository = new MemoryDraftRepository(); repository.getDraft = async () => { throw new Error("read failed"); };
  await assert.rejects(() => loadOrCreateDraft(repository, storage), /read failed/);
  assert.equal(storage.getItem(ACTIVE_DRAFT_POINTER_KEY), "musikraum-existing");
});

test("reset atomically replaces the current draft", async () => {
  const storage = new FakeStorage(); const repository = new MemoryDraftRepository(); const first = createDefaultDraft(); await repository.putDraft(first); storage.setItem(ACTIVE_DRAFT_POINTER_KEY, first.draftId);
  const fresh = await replaceWithFreshDraft(repository, first, storage);
  assert.equal(await repository.getDraft(first.draftId), null);
  assert.ok(await repository.getDraft(fresh.draftId));
});
