import { renderOffers, renderStructure, renderTextItems } from "./ui-render.js";
import { adjacentReorderIndex, moveArrayItem, pointerInsertionIndex } from "./reorder-core.js";
const SECTION_LABELS = { intro: "Über Franz", why: "Frei spielen", offers: "Klangabende", story: "Geschichte", contact: "Kontakt" };
const activeDrags = new WeakMap();
export function handleReorderClick(context, target) {
    const button = target.closest("[data-reorder-direction]");
    if (!button)
        return false;
    const direction = parseDirection(button.dataset.reorderDirection);
    const reorderTarget = resolveReorderTarget(button);
    if (!direction || !reorderTarget)
        return true;
    const currentIndex = targetIndex(context.store.snapshot, reorderTarget);
    const nextIndex = adjacentReorderIndex(currentIndex, direction, targetCount(context.store.snapshot, reorderTarget));
    if (nextIndex !== null)
        moveReorderTarget(context, reorderTarget, nextIndex, direction);
    return true;
}
export function handleReorderKeydown(context, event) {
    if (event.key === "Escape" && activeDrags.has(context)) {
        event.preventDefault();
        cancelActiveDrag(context, "Verschieben abgebrochen.");
        return true;
    }
    if (!event.altKey || (event.key !== "ArrowUp" && event.key !== "ArrowDown"))
        return false;
    const element = event.target instanceof Element ? event.target.closest("[data-reorder-handle]") : null;
    if (!element)
        return false;
    const target = resolveReorderTarget(element);
    if (!target)
        return false;
    event.preventDefault();
    const direction = event.key === "ArrowUp" ? "up" : "down";
    const currentIndex = targetIndex(context.store.snapshot, target);
    const nextIndex = adjacentReorderIndex(currentIndex, direction, targetCount(context.store.snapshot, target));
    if (nextIndex !== null)
        moveReorderTarget(context, target, nextIndex, "handle");
    return true;
}
export function handleReorderPointerDown(context, event) {
    if (event.button !== 0)
        return false;
    const handle = event.target instanceof Element ? event.target.closest("[data-reorder-handle]") : null;
    if (!handle)
        return false;
    const target = resolveReorderTarget(handle);
    const item = resolveReorderItem(handle);
    const container = item?.parentElement;
    if (!target || !item || !container || targetCount(context.store.snapshot, target) < 2)
        return true;
    const originalIndex = targetIndex(context.store.snapshot, target);
    if (originalIndex < 0)
        return true;
    cancelActiveDrag(context);
    activeDrags.set(context, { pointerId: event.pointerId, target, item, container, handle, originalIndex, targetIndex: originalIndex });
    item.classList.add("is-dragging");
    handle.classList.add("is-dragging-handle");
    try {
        handle.setPointerCapture(event.pointerId);
    }
    catch { /* unsupported capture is harmless */ }
    context.announcer.textContent = `${targetLabel(context.store.snapshot, target)} wird verschoben. Ziehe an die neue Position oder drücke Escape.`;
    event.preventDefault();
    return true;
}
export function handleReorderPointerMove(context, event) {
    const drag = activeDrags.get(context);
    if (!drag || drag.pointerId !== event.pointerId)
        return false;
    const candidates = reorderItems(drag.container).filter((item) => item !== drag.item);
    const insertion = pointerInsertionIndex(event.clientY, candidates.map((item) => { const rect = item.getBoundingClientRect(); return { top: rect.top, height: rect.height }; }));
    drag.targetIndex = insertion;
    clearDropMarkers(drag.container);
    if (candidates.length) {
        if (insertion < candidates.length)
            candidates[insertion]?.classList.add("is-drop-target-before");
        else
            candidates.at(-1)?.classList.add("is-drop-target-after");
    }
    event.preventDefault();
    return true;
}
export function handleReorderPointerEnd(context, event, cancelled = false) {
    const drag = activeDrags.get(context);
    if (!drag || drag.pointerId !== event.pointerId)
        return false;
    const { target, targetIndex: nextIndex, originalIndex } = drag;
    releasePointerCapture(drag);
    cleanupDrag(context, drag);
    if (cancelled)
        context.announcer.textContent = "Verschieben abgebrochen.";
    else if (nextIndex === originalIndex)
        context.announcer.textContent = "Reihenfolge unverändert.";
    else
        moveReorderTarget(context, target, nextIndex, "handle");
    event.preventDefault();
    return true;
}
export function moveReorderTarget(context, target, nextIndex, focus = "handle") {
    const draft = context.store.snapshot;
    const currentIndex = targetIndex(draft, target);
    const count = targetCount(draft, target);
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= count || currentIndex === nextIndex)
        return false;
    const label = targetLabel(draft, target);
    const descriptor = descriptorForTarget(target, label);
    context.store.flushHistoryGroup();
    const mutation = context.store.mutate((working) => moveDraftTarget(working, target, currentIndex, nextIndex), descriptor);
    if (!mutation)
        return false;
    renderTarget(context, target);
    context.announcer.textContent = `${label} an Position ${nextIndex + 1} von ${count} verschoben.`;
    requestAnimationFrame(() => focusMovedTarget(target, focus));
    return true;
}
function moveDraftTarget(draft, target, fromIndex, toIndex) {
    if (target.kind === "section") {
        moveArrayItem(draft.layout.order, fromIndex, toIndex);
        return;
    }
    if (target.collection === "offers") {
        moveArrayItem(draft.offers, fromIndex, toIndex);
        return;
    }
    moveArrayItem(draft[target.collection], fromIndex, toIndex);
}
function descriptorForTarget(target, label) {
    if (target.kind === "section")
        return { intent: { type: "move-section", section: target.section }, history: { label: `${label} verschoben`, target: { kind: "panel", panel: "structure" } } };
    if (target.collection === "offers")
        return { intent: { type: "move-collection-item", collection: target.collection, itemId: target.itemId }, history: { label: `${label} verschoben`, target: { kind: "offer", offerId: target.itemId, field: "title" } } };
    const list = target.collection;
    return { intent: { type: "move-collection-item", collection: target.collection, itemId: target.itemId }, history: { label: `${label} verschoben`, target: { kind: "text-item", list, itemId: target.itemId } } };
}
function renderTarget(context, target) {
    if (target.kind === "section") {
        renderStructure(context);
        return;
    }
    if (target.collection === "offers") {
        renderOffers(context);
        return;
    }
    renderTextItems(context, target.collection);
}
function focusMovedTarget(target, preference) {
    const row = document.querySelector(selectorForTarget(target));
    if (!row)
        return;
    const preferred = preference === "handle" ? row.querySelector("[data-reorder-handle]") : row.querySelector(`[data-reorder-direction="${preference}"]`);
    const fallback = row.querySelector("[data-reorder-handle]") ?? row.querySelector("[data-reorder-direction]:not(:disabled)");
    const control = preferred && !preferred.disabled ? preferred : fallback;
    control?.focus({ preventScroll: true });
}
function resolveReorderTarget(element) {
    const textCard = element.closest("[data-text-item-card]");
    if (textCard) {
        const collection = parseTextList(textCard.dataset.textList);
        const itemId = textCard.dataset.textItemId;
        return collection && itemId ? { kind: "collection", collection, itemId } : null;
    }
    const offerCard = element.closest("[data-offer-card]");
    if (offerCard?.dataset.offerId)
        return { kind: "collection", collection: "offers", itemId: offerCard.dataset.offerId };
    const sectionRow = element.closest("[data-section-key]");
    const section = parseSection(sectionRow?.dataset.sectionKey);
    return section ? { kind: "section", section } : null;
}
function resolveReorderItem(element) { return element.closest("[data-text-item-card], [data-offer-card], [data-section-key]"); }
function reorderItems(container) { return [...container.children].filter((child) => child instanceof HTMLElement && child.matches("[data-text-item-card], [data-offer-card], [data-section-key]")); }
function clearDropMarkers(container) { reorderItems(container).forEach((item) => item.classList.remove("is-drop-target-before", "is-drop-target-after")); }
function releasePointerCapture(drag) { try {
    drag.handle.releasePointerCapture(drag.pointerId);
}
catch { /* unsupported capture is harmless */ } }
function cleanupDrag(context, drag) { drag.item.classList.remove("is-dragging"); drag.handle.classList.remove("is-dragging-handle"); clearDropMarkers(drag.container); activeDrags.delete(context); }
function cancelActiveDrag(context, message) { const drag = activeDrags.get(context); if (!drag)
    return; releasePointerCapture(drag); cleanupDrag(context, drag); if (message)
    context.announcer.textContent = message; }
function targetIndex(draft, target) { if (target.kind === "section")
    return draft.layout.order.indexOf(target.section); return draft[target.collection].findIndex((item) => item.id === target.itemId); }
function targetCount(draft, target) { return target.kind === "section" ? draft.layout.order.length : draft[target.collection].length; }
function targetLabel(draft, target) {
    if (target.kind === "section")
        return `Bereich „${SECTION_LABELS[target.section]}“`;
    if (target.collection === "offers") {
        const offer = draft.offers.find((item) => item.id === target.itemId);
        return `Klangmoment „${offer?.title.trim() || "Ohne Titel"}“`;
    }
    const item = draft[target.collection].find((entry) => entry.id === target.itemId);
    const prefix = target.collection === "heroPoints" ? "Punkt im Titelbild" : "Punkt über Franz";
    return `${prefix} „${item?.text.trim() || "Ohne Text"}“`;
}
function selectorForTarget(target) { if (target.kind === "section")
    return `[data-section-key="${CSS.escape(target.section)}"]`; if (target.collection === "offers")
    return `[data-offer-card][data-offer-id="${CSS.escape(target.itemId)}"]`; return `[data-text-item-card][data-text-list="${target.collection}"][data-text-item-id="${CSS.escape(target.itemId)}"]`; }
function parseDirection(value) { return value === "up" || value === "down" ? value : null; }
function parseTextList(value) { return value === "heroPoints" || value === "introPoints" ? value : null; }
function parseSection(value) { return value === "intro" || value === "why" || value === "offers" || value === "story" || value === "contact" ? value : null; }
