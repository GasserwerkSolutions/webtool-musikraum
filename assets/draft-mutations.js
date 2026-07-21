import { normalizeEmail, normalizeInstagramUrl, normalizePhone } from "./domain.js";
export function draftsEqualIgnoringUpdatedAt(left, right) { return JSON.stringify(comparableDraft(left)) === JSON.stringify(comparableDraft(right)); }
export function createDraftEffect(before, after, intent) {
    if (draftsEqualIgnoringUpdatedAt(before, after))
        throw new Error("MUTATION_EFFECT_FOR_NOOP");
    if (intent.type === "set-field") {
        assertOnlyFieldChanged(before, after, intent.field);
        return { type: "field-set", field: intent.field, previousPresence: fieldPresence(intent.field, before), nextPresence: fieldPresence(intent.field, after) };
    }
    if (intent.type === "set-text-item") {
        const previous = before[intent.list].find((item) => item.id === intent.itemId);
        const next = after[intent.list].find((item) => item.id === intent.itemId);
        if (!previous || !next)
            throw new Error("INVALID_TEXT_ITEM_SET");
        const expected = copyDraft(before);
        const expectedItem = expected[intent.list].find((item) => item.id === intent.itemId);
        if (!expectedItem)
            throw new Error("INVALID_TEXT_ITEM_SET");
        expectedItem.text = next.text;
        assertExpectedDraft(expected, after, "UNEXPECTED_TEXT_ITEM_CHANGE");
        return { type: "text-item-set", list: intent.list, itemId: intent.itemId, previousPresence: stringPresence(previous.text), nextPresence: stringPresence(next.text) };
    }
    if (intent.type === "set-offer-field") {
        const previous = before.offers.find((offer) => offer.id === intent.offerId);
        const next = after.offers.find((offer) => offer.id === intent.offerId);
        if (!previous || !next)
            throw new Error("INVALID_OFFER_FIELD_SET");
        const expected = copyDraft(before);
        const expectedOffer = expected.offers.find((offer) => offer.id === intent.offerId);
        if (!expectedOffer)
            throw new Error("INVALID_OFFER_FIELD_SET");
        expectedOffer[intent.field] = next[intent.field];
        assertExpectedDraft(expected, after, "UNEXPECTED_OFFER_FIELD_CHANGE");
        return { type: "offer-field-set", offerId: intent.offerId, field: intent.field, previousPresence: stringPresence(previous[intent.field]), nextPresence: stringPresence(next[intent.field]) };
    }
    if (intent.type === "insert-collection-item")
        return createInsertEffect(before, after, intent.collection, intent.itemId);
    if (intent.type === "remove-collection-item")
        return createRemoveEffect(before, after, intent.collection, intent.itemId);
    if (intent.type === "move-collection-item")
        return createMoveEffect(before, after, intent.collection, intent.itemId);
    if (intent.type === "set-section-visibility") {
        const previousVisible = before.layout.visibility[intent.section];
        const nextVisible = after.layout.visibility[intent.section];
        if (previousVisible === nextVisible)
            throw new Error("INVALID_SECTION_VISIBILITY");
        const expected = copyDraft(before);
        expected.layout.visibility[intent.section] = nextVisible;
        assertExpectedDraft(expected, after, "UNEXPECTED_SECTION_VISIBILITY_CHANGE");
        return { type: "section-visibility", section: intent.section, previousVisible, nextVisible };
    }
    if (intent.type === "move-section") {
        const previousIndex = before.layout.order.indexOf(intent.section);
        const nextIndex = after.layout.order.indexOf(intent.section);
        if (previousIndex < 0 || nextIndex < 0 || previousIndex === nextIndex)
            throw new Error("INVALID_SECTION_MOVE");
        const expected = copyDraft(before);
        expected.layout.order.splice(previousIndex, 1);
        expected.layout.order.splice(nextIndex, 0, intent.section);
        assertExpectedDraft(expected, after, "UNEXPECTED_SECTION_MOVE_CHANGE");
        return { type: "section-move", section: intent.section, previousIndex, nextIndex };
    }
    if (intent.type === "set-theme") {
        const changed = ["preset", "primary", "accent", "font", "fontSize"].filter((key) => before.theme[key] !== after.theme[key]);
        if (!changed.length)
            throw new Error("INVALID_THEME_SET");
        const expected = copyDraft(before);
        expected.theme = { ...after.theme };
        assertExpectedDraft(expected, after, "UNEXPECTED_THEME_CHANGE");
        return { type: "theme-set", changed };
    }
    return { type: "draft-replace", reason: intent.reason };
}
export function invertDraftEffect(effect) {
    if (effect.type === "field-set")
        return { ...effect, previousPresence: effect.nextPresence, nextPresence: effect.previousPresence };
    if (effect.type === "text-item-set")
        return { ...effect, previousPresence: effect.nextPresence, nextPresence: effect.previousPresence };
    if (effect.type === "offer-field-set")
        return { ...effect, previousPresence: effect.nextPresence, nextPresence: effect.previousPresence };
    if (effect.type === "collection-insert")
        return { type: "collection-remove", collection: effect.collection, itemId: effect.itemId, previousIndex: effect.index };
    if (effect.type === "collection-remove")
        return { type: "collection-insert", collection: effect.collection, itemId: effect.itemId, index: effect.previousIndex };
    if (effect.type === "collection-move")
        return { ...effect, previousIndex: effect.nextIndex, nextIndex: effect.previousIndex };
    if (effect.type === "section-visibility")
        return { ...effect, previousVisible: effect.nextVisible, nextVisible: effect.previousVisible };
    if (effect.type === "section-move")
        return { ...effect, previousIndex: effect.nextIndex, nextIndex: effect.previousIndex };
    if (effect.type === "theme-set")
        throw new Error("THEME_EFFECT_REQUIRES_SNAPSHOT_VERIFICATION");
    throw new Error("DRAFT_REPLACE_EFFECT_IS_NOT_INVERTIBLE");
}
export function sameIntentTarget(left, right) { return intentIdentity(left) === intentIdentity(right); }
export function sourceForReplaceReason(reason) { return reason; }
function createInsertEffect(before, after, collection, itemId) {
    const previousItems = collectionItems(before, collection);
    const nextItems = collectionItems(after, collection);
    const index = nextItems.findIndex((item) => item.id === itemId);
    if (index < 0 || previousItems.some((item) => item.id === itemId) || nextItems.length !== previousItems.length + 1)
        throw new Error("INVALID_COLLECTION_INSERT");
    if (JSON.stringify(nextItems.filter((item) => item.id !== itemId)) !== JSON.stringify(previousItems))
        throw new Error("UNEXPECTED_COLLECTION_INSERT_CHANGE");
    const expected = copyDraft(before);
    setCollection(expected, collection, nextItems);
    assertExpectedDraft(expected, after, "UNEXPECTED_COLLECTION_INSERT_DRAFT_CHANGE");
    return { type: "collection-insert", collection, itemId, index };
}
function createRemoveEffect(before, after, collection, itemId) {
    const previousItems = collectionItems(before, collection);
    const nextItems = collectionItems(after, collection);
    const previousIndex = previousItems.findIndex((item) => item.id === itemId);
    if (previousIndex < 0 || nextItems.some((item) => item.id === itemId) || nextItems.length !== previousItems.length - 1)
        throw new Error("INVALID_COLLECTION_REMOVE");
    if (JSON.stringify(previousItems.filter((item) => item.id !== itemId)) !== JSON.stringify(nextItems))
        throw new Error("UNEXPECTED_COLLECTION_REMOVE_CHANGE");
    const expected = copyDraft(before);
    setCollection(expected, collection, nextItems);
    assertExpectedDraft(expected, after, "UNEXPECTED_COLLECTION_REMOVE_DRAFT_CHANGE");
    return { type: "collection-remove", collection, itemId, previousIndex };
}
function createMoveEffect(before, after, collection, itemId) {
    const previousItems = collectionItems(before, collection);
    const nextItems = collectionItems(after, collection);
    const previousIndex = previousItems.findIndex((item) => item.id === itemId);
    const nextIndex = nextItems.findIndex((item) => item.id === itemId);
    if (previousIndex < 0 || nextIndex < 0 || previousIndex === nextIndex || previousItems.length !== nextItems.length)
        throw new Error("INVALID_COLLECTION_MOVE");
    const expectedItems = structuredClone(previousItems);
    const [moved] = expectedItems.splice(previousIndex, 1);
    if (!moved)
        throw new Error("INVALID_COLLECTION_MOVE");
    expectedItems.splice(nextIndex, 0, moved);
    if (JSON.stringify(expectedItems) !== JSON.stringify(nextItems))
        throw new Error("UNEXPECTED_COLLECTION_MOVE_CHANGE");
    const expected = copyDraft(before);
    setCollection(expected, collection, expectedItems);
    assertExpectedDraft(expected, after, "UNEXPECTED_COLLECTION_MOVE_DRAFT_CHANGE");
    return { type: "collection-move", collection, itemId, previousIndex, nextIndex };
}
function assertOnlyFieldChanged(before, after, field) {
    const previousValue = fieldValue(field, before);
    const nextValue = fieldValue(field, after);
    if (previousValue === nextValue)
        throw new Error("INVALID_FIELD_SET");
    const expected = copyDraft(before);
    setFieldValue(field, expected, nextValue);
    assertExpectedDraft(expected, after, "UNEXPECTED_FIELD_CHANGE");
}
function collectionItems(draft, collection) { if (collection === "offers")
    return draft.offers; return draft[collection]; }
function setCollection(draft, collection, items) { if (collection === "offers") {
    draft.offers = structuredClone(items);
    return;
} draft[collection] = structuredClone(items); }
function assertExpectedDraft(expected, actual, code) { if (!draftsEqualIgnoringUpdatedAt(expected, actual))
    throw new Error(code); }
function copyDraft(draft) { return structuredClone(draft); }
function comparableDraft(draft) { const copy = copyDraft(draft); copy.updatedAt = ""; return copy; }
function fieldValue(field, draft) { const [group, key] = field.split("."); return String(draft[group][key] ?? ""); }
function setFieldValue(field, draft, value) { const [group, key] = field.split("."); draft[group][key] = value; }
function stringPresence(value) { return value.trim() ? "present" : "empty"; }
function fieldPresence(field, draft) { const value = fieldValue(field, draft); if (!value.trim())
    return "empty"; if (field === "site.email")
    return normalizeEmail(value) ? "present" : "invalid"; if (field === "site.phone")
    return normalizePhone(value) ? "present" : "invalid"; if (field === "site.instagram")
    return normalizeInstagramUrl(value) ? "present" : "invalid"; return "present"; }
function intentIdentity(intent) {
    if (intent.type === "set-field")
        return `${intent.type}:${intent.field}`;
    if (intent.type === "set-text-item")
        return `${intent.type}:${intent.list}:${intent.itemId}`;
    if (intent.type === "set-offer-field")
        return `${intent.type}:${intent.offerId}:${intent.field}`;
    if (intent.type === "insert-collection-item" || intent.type === "remove-collection-item" || intent.type === "move-collection-item")
        return `${intent.type}:${intent.collection}:${intent.itemId}`;
    if (intent.type === "set-section-visibility" || intent.type === "move-section")
        return `${intent.type}:${intent.section}`;
    if (intent.type === "replace-draft")
        return `${intent.type}:${intent.reason}`;
    return intent.type;
}
