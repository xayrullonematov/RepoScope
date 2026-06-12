"use client";

import type { Stance } from "@/types/domain";

interface StanceBadgeProps {
  stance: Stance | null;
}

export default function StanceBadge({ stance }: StanceBadgeProps) {
  if (!stance) {
    return (
      <span className="px-1.5 py-0.5 text-xs rounded bg-gray-800 text-gray-500 border border-gray-700">
        —
      </span>
    );
  }

  const colors: Record<Stance, string> = {
    agree: "bg-green-900/50 text-green-400 border-green-700",
    disagree: "bg-red-900/50 text-red-400 border-red-700",
    "partially-concede": "bg-yellow-900/50 text-yellow-400 border-yellow-700",
    strengthen: "bg-blue-900/50 text-blue-400 border-blue-700",
  };

  return (
    <span className={`px-1.5 py-0.5 text-xs rounded border ${colors[stance]}`}>
      {stance}
    </span>
  );
}
