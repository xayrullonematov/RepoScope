"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Settings, User } from "lucide-react";
import { useCurrentUser } from "@/lib/auth/user-context";

const colorMap: Record<string, string> = {
  violet: "bg-violet-500/90 ring-violet-400/40",
  blue: "bg-blue-500/90 ring-blue-400/40",
  emerald: "bg-emerald-500/90 ring-emerald-400/40",
  amber: "bg-amber-500/90 ring-amber-400/40",
};

export default function AccountMenu() {
  const user = useCurrentUser();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const avatarColor = colorMap[user.avatarColor] ?? colorMap.violet;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white ring-2 ring-offset-2 ring-offset-gray-950 transition-shadow hover:ring-offset-gray-900 ${avatarColor}`}
      >
        {user.initials}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 origin-top-right rounded-lg border border-gray-800 bg-gray-900/95 p-1.5 shadow-xl backdrop-blur"
        >
          <div className="px-3 py-2 border-b border-gray-800">
            <div className="text-sm font-medium text-gray-100 truncate">{user.displayName}</div>
            <div className="text-xs text-gray-500 truncate">{user.email}</div>
          </div>
          <Link
            href="/sessions"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="mt-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-200 transition-colors hover:bg-white/5"
          >
            <User size={14} /> My sessions
          </Link>
          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-200 transition-colors hover:bg-white/5"
          >
            <Settings size={14} /> Settings
          </Link>
        </div>
      )}
    </div>
  );
}
