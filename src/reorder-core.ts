export type ReorderDirection = "up" | "down";

export function moveArrayItem<T>(items: T[], fromIndex: number, toIndex: number): boolean {
  if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex) || fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length || fromIndex === toIndex) return false;
  const [item] = items.splice(fromIndex, 1);
  if (item === undefined) return false;
  items.splice(toIndex, 0, item);
  return true;
}

export function adjacentReorderIndex(currentIndex: number, direction: ReorderDirection, itemCount: number): number | null {
  if (!Number.isInteger(currentIndex) || itemCount < 1 || currentIndex < 0 || currentIndex >= itemCount) return null;
  const nextIndex = currentIndex + (direction === "up" ? -1 : 1);
  return nextIndex >= 0 && nextIndex < itemCount ? nextIndex : null;
}

export function pointerInsertionIndex(pointerY: number, candidates: readonly { top: number; height: number }[]): number {
  const index = candidates.findIndex((candidate) => pointerY < candidate.top + candidate.height / 2);
  return index < 0 ? candidates.length : index;
}
