"use client";

import { useEffect, useRef } from "react";
import { KEYBOARD_SHORTCUTS, type ShortcutId } from "@/lib/shortcuts";

type Handlers = Partial<Record<ShortcutId, () => void>>;

const CHORD_TIMEOUT_MS = 1500;

// Guard: ignore the press if the user is typing in an editable surface.
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

function eventToKey(e: KeyboardEvent): string {
  // Single printable char or Enter — also note modifiers.
  const mod = e.metaKey || e.ctrlKey;
  const key = e.key;
  if (mod && key === "Enter") return "mod+enter";
  // Ignore lone modifier keypresses.
  if (key === "Meta" || key === "Control" || key === "Shift" || key === "Alt") return "";
  // For "?" the browser usually reports e.key === "?" already (shift+/).
  return key.toLowerCase();
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
}

export function useKeyboardShortcuts(handlers: Handlers, options: UseKeyboardShortcutsOptions = {}) {
  const { enabled = true } = options;
  const handlersRef = useRef(handlers);
  // Keep the ref in sync without writing during render — React 19 rule.
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    if (!enabled) return;

    let pendingPrefix: string | null = null;
    let pendingTimer: ReturnType<typeof setTimeout> | null = null;

    function clearPending() {
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        pendingTimer = null;
      }
      pendingPrefix = null;
    }

    function handle(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      const key = eventToKey(e);
      if (!key) return;

      // First check chord prefixes if we have a pending one.
      if (pendingPrefix) {
        const combined = `${pendingPrefix} ${key}`;
        const chord = KEYBOARD_SHORTCUTS.find((s) => s.match === combined);
        clearPending();
        if (chord) {
          const fn = handlersRef.current[chord.id as ShortcutId];
          if (fn) {
            e.preventDefault();
            fn();
            return;
          }
        }
        // Fall through — the second key may still be a single-key match.
      }

      // Exact single-key / modified match.
      const exact = KEYBOARD_SHORTCUTS.find((s) => s.match === key);
      if (exact) {
        const fn = handlersRef.current[exact.id as ShortcutId];
        if (fn) {
          e.preventDefault();
          fn();
          return;
        }
      }

      // Is this key a known chord prefix? If so, queue it.
      const startsChord = KEYBOARD_SHORTCUTS.some((s) => s.match.startsWith(`${key} `));
      if (startsChord) {
        pendingPrefix = key;
        pendingTimer = setTimeout(clearPending, CHORD_TIMEOUT_MS);
      }
    }

    window.addEventListener("keydown", handle);
    return () => {
      window.removeEventListener("keydown", handle);
      clearPending();
    };
  }, [enabled]);
}
