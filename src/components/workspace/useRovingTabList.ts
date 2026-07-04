"use client";

import { useRef, type KeyboardEvent } from "react";
import { getNextTabId } from "./tab-navigation";

interface TabLike<T extends string> {
  id: T;
}

export function useRovingTabList<T extends string>(
  tabs: readonly TabLike<T>[],
  activeId: T,
  onChange: (id: T) => void,
) {
  const tabRefs = useRef<Partial<Record<T, HTMLButtonElement | null>>>({});
  const tabIds = tabs.map(({ id }) => id);

  return (id: T) => ({
    ref: (node: HTMLButtonElement | null) => {
      tabRefs.current[id] = node;
    },
    role: "tab" as const,
    "aria-selected": activeId === id,
    "aria-controls": "workspace-tabpanel",
    tabIndex: activeId === id ? 0 : -1,
    onClick: () => onChange(id),
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
      const nextId = getNextTabId(tabIds, id, event.key);
      if (!nextId) return;
      event.preventDefault();
      onChange(nextId);
      tabRefs.current[nextId]?.focus();
    },
  });
}
