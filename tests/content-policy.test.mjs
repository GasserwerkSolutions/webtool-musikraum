import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultDraft } from "../assets/domain.js";
import { contentHelpText, contentPresence, evaluateContentCompleteness, resolveContentPolicy, shouldRenderContent } from "../assets/content-policy.js";

test("required content can be omitted from rendering while remaining incomplete", () => {
  const draft = createDefaultDraft();
  draft.copy.heroTitle = "";
  const target = { kind: "field", field: "copy.heroTitle" };
  assert.equal(resolveContentPolicy(target, draft).requirement, "required");
  assert.equal(contentPresence(target, draft), "empty");
  assert.equal(shouldRenderContent(target, draft), false);
  assert.equal(evaluateContentCompleteness(target, draft), "incomplete");
});

test("optional text items and collections use dynamic policies", () => {
  const draft = createDefaultDraft();
  draft.heroPoints = [{ id: "empty", text: "" }];
  assert.equal(contentPresence({ kind: "text-item", list: "heroPoints", itemId: "empty" }, draft), "empty");
  assert.equal(shouldRenderContent({ kind: "text-item", list: "heroPoints", itemId: "empty" }, draft), false);
  assert.equal(evaluateContentCompleteness({ kind: "collection", collection: "heroPoints" }, draft), "optional-empty");
});

test("an offer without a title hides its container", () => {
  const draft = createDefaultDraft();
  const offerId = draft.offers[0].id;
  draft.offers[0].title = "";
  const target = { kind: "offer", offerId, field: "title" };
  assert.equal(resolveContentPolicy(target, draft).emptyBehavior, "omit-container");
  assert.equal(shouldRenderContent(target, draft), false);
  assert.equal(evaluateContentCompleteness(target, draft), "incomplete");
});

test("conditional contact actions require a valid destination", () => {
  const draft = createDefaultDraft();
  draft.site.email = "keine-adresse";
  const target = { kind: "field", field: "copy.contactEmailAction" };
  assert.equal(contentPresence(target, draft), "present");
  assert.equal(shouldRenderContent(target, draft), false);
  assert.equal(evaluateContentCompleteness(target, draft), "incomplete");
  assert.match(contentHelpText(target, draft), /gültigen E-Mail-Adresse/);
});

test("content in a hidden section reports hidden completeness", () => {
  const draft = createDefaultDraft();
  draft.layout.visibility.story = false;
  assert.equal(evaluateContentCompleteness({ kind: "field", field: "copy.storyTitle" }, draft), "hidden");
  assert.equal(evaluateContentCompleteness({ kind: "section", section: "story" }, draft), "hidden");
});
