import test from "node:test";
import assert from "node:assert/strict";
import { adjacentReorderIndex, moveArrayItem, pointerInsertionIndex } from "../assets/reorder-core.js";

test("moves an array item without changing identities", () => {
  const first = { id: "first" }; const second = { id: "second" }; const third = { id: "third" }; const items = [first, second, third];
  assert.equal(moveArrayItem(items, 1, 0), true);
  assert.deepEqual(items.map((item) => item.id), ["second", "first", "third"]);
  assert.equal(items[0], second);
});

test("rejects boundary and no-op moves", () => {
  const items = ["a", "b"];
  assert.equal(moveArrayItem(items, 0, 0), false);
  assert.equal(moveArrayItem(items, 0, -1), false);
  assert.equal(moveArrayItem(items, 1, 2), false);
  assert.deepEqual(items, ["a", "b"]);
  assert.equal(adjacentReorderIndex(0, "up", 2), null);
  assert.equal(adjacentReorderIndex(0, "down", 2), 1);
  assert.equal(adjacentReorderIndex(1, "down", 2), null);
});

test("calculates pointer insertion positions deterministically", () => {
  const candidates = [{ top: 0, height: 80 }, { top: 100, height: 80 }, { top: 200, height: 80 }];
  assert.equal(pointerInsertionIndex(10, candidates), 0);
  assert.equal(pointerInsertionIndex(90, candidates), 1);
  assert.equal(pointerInsertionIndex(260, candidates), 3);
});
