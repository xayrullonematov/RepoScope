export type TabNavigationKey =
  | "ArrowLeft"
  | "ArrowRight"
  | "ArrowUp"
  | "ArrowDown"
  | "Home"
  | "End";

export function getNextTabId<T extends string>(
  ids: readonly T[],
  currentId: T,
  key: string,
): T | null {
  if (ids.length === 0) return null;
  const currentIndex = ids.indexOf(currentId);
  if (currentIndex < 0) return null;

  switch (key as TabNavigationKey) {
    case "ArrowRight":
    case "ArrowDown":
      return ids[(currentIndex + 1) % ids.length];
    case "ArrowLeft":
    case "ArrowUp":
      return ids[(currentIndex - 1 + ids.length) % ids.length];
    case "Home":
      return ids[0];
    case "End":
      return ids[ids.length - 1];
    default:
      return null;
  }
}
