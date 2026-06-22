// Canonical keyboard shortcuts. Both the hook (dispatcher) and the help
// modal read from this list so the shown shortcuts never drift from the wired
// handlers.

export type ShortcutScope = "global" | "workspace";

export interface ShortcutDescriptor {
  id: string;
  // Display string (e.g. "?", "g s", "⌘/Ctrl+Enter"). Not parsed.
  display: string;
  // Match string interpreted by the dispatcher:
  //   single char: "?"
  //   chord:       "g s"
  //   modified:    "mod+enter" (mod = ctrl on win/linux, meta on mac)
  match: string;
  description: string;
  scope: ShortcutScope;
}

export const KEYBOARD_SHORTCUTS: readonly ShortcutDescriptor[] = [
  { id: "help",           display: "?",            match: "?",         description: "Show this shortcuts list",       scope: "global"    },
  { id: "goto-sessions",  display: "g then s",     match: "g s",       description: "Jump to My Sessions",            scope: "global"    },
  { id: "goto-settings",  display: "g then ,",     match: "g ,",       description: "Jump to Settings",               scope: "global"    },
  { id: "start-round",    display: "⌘/Ctrl + Enter", match: "mod+enter", description: "Start the next round",           scope: "workspace" },
  { id: "export",         display: "e",            match: "e",         description: "Open the export menu",           scope: "workspace" },
] as const;

export type ShortcutId = (typeof KEYBOARD_SHORTCUTS)[number]["id"];
