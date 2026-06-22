"use client";

import { useState, useRef, useEffect } from "react";
import { MoreVertical } from "lucide-react";

interface TokenBudgetBarProps {
  used: number;
  total: number;
  estimatedCost: number;
  onEditBudget?: () => void;
}

export default function TokenBudgetBar({
  used,
  total,
  estimatedCost,
  onEditBudget,
}: TokenBudgetBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const percentage = total > 0 ? Math.min((used / total) * 100, 100) : 0;

  const getBarColor = (pct: number): string => {
    if (pct >= 80) return "bg-red-500";
    if (pct >= 50) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getTextColor = (pct: number): string => {
    if (pct >= 80) return "text-red-400";
    if (pct >= 50) return "text-yellow-400";
    return "text-green-400";
  };

  const formatNumber = (n: number): string => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-1.5">
        <div className="h-1.5 flex-1 rounded-full bg-gray-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${getBarColor(percentage)}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {onEditBudget && (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Budget actions"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="-mr-1 rounded p-0.5 text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-200"
            >
              <MoreVertical size={12} />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-md border border-gray-700 bg-gray-900 shadow-xl"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onEditBudget();
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs text-gray-200 transition-colors hover:bg-gray-800"
                >
                  Edit budget…
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <p className={`mt-1 text-xs ${getTextColor(percentage)}`}>
        {formatNumber(used)} / {formatNumber(total)} tokens{" "}
        <span className="text-gray-500">&bull; ${estimatedCost.toFixed(2)}</span>
      </p>
    </div>
  );
}
