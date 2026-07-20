import { createId, type MusicraumTextItem } from "./domain.js";
import type { TextListKey } from "./preview-contract.js";
import type { UiContext } from "./ui-shared.js";
import { renderTextItems, showToast } from "./ui-render.js";

export const MAX_TEXT_ITEMS = 6;

export function handleTextListAction(context: UiContext, button: HTMLElement): boolean {
  const action = button.dataset.action;
  if (action === "add-text-item") {
    const list = parseList(button.dataset.list); if (!list) return true;
    if (context.store.snapshot[list].length >= MAX_TEXT_ITEMS) { showToast(`Du kannst höchstens ${MAX_TEXT_ITEMS} Punkte anlegen.`); return true; }
    context.store.mutate((draft) => { draft[list].push({ id: createId(list === "heroPoints" ? "hero-point" : "intro-point"), text: "Neuer Punkt" }); });
    renderTextItems(context, list);
    requestAnimationFrame(() => listElement(context, list).querySelector<HTMLInputElement>("[data-text-item-card]:last-child [data-text-item-field]")?.select());
    return true;
  }
  if (action !== "remove-text-item") return false;
  const card = button.closest<HTMLElement>("[data-text-item-card]"); const list = parseList(card?.dataset.textList); const itemId = card?.dataset.textItemId; if (!list || !itemId) return true;
  const item = context.store.snapshot[list].find((entry) => entry.id === itemId); if (!item) return true;
  if (item.text.trim() && !window.confirm(`„${item.text.trim()}“ wirklich entfernen? Du kannst den Schritt danach rückgängig machen.`)) return true;
  context.store.mutate((draft) => { draft[list] = draft[list].filter((entry) => entry.id !== itemId); });
  renderTextItems(context, list); showToast("Punkt entfernt. Rückgängig ist weiterhin möglich."); return true;
}

export function handleTextListInput(context: UiContext, target: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): boolean {
  if (!target.matches("[data-text-item-field]")) return false;
  const card = target.closest<HTMLElement>("[data-text-item-card]"); const list = parseList(card?.dataset.textList); const itemId = card?.dataset.textItemId; if (!list || !itemId) return true;
  context.store.mutate((draft) => { const item = draft[list].find((entry) => entry.id === itemId); if (item) item.text = target.value; }, `text-item:${list}:${itemId}`);
  const number = card.querySelector<HTMLElement>("[data-text-item-number]"); const index = context.store.snapshot[list].findIndex((item) => item.id === itemId); if (number) number.textContent = `${index + 1}. ${target.value || "Punkt"}`;
  return true;
}

export function normalizeTextItem(value: MusicraumTextItem): MusicraumTextItem { return { id: value.id, text: value.text }; }
function parseList(value: string | undefined): TextListKey | null { return value === "heroPoints" || value === "introPoints" ? value : null; }
function listElement(context: UiContext, list: TextListKey): HTMLElement { return list === "heroPoints" ? context.heroPointList : context.introPointList; }
