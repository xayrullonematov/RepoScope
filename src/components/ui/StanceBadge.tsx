"use client";

import type { Stance } from "@/types/domain";

interface StanceBadgeProps {
  stance: Stance | null;
}

export default function StanceBadge({ stance }: StanceBadgeProps) {
  if (!stance) {
    return (
      <span className="px-1.5 py-0.5 text-xs rounded-md bg-gray-800 text-gray-500 border border-gray-700">
        --
      </span>
    );
  }

  const colors: Record<Stance, string> = {
    agree: "bg-green-500/15 text-green-400 border-green-600/50",
    disagree: "bg-red-500/15 text-red-400 border-red-600/50",
    "partially-concede": "bg-amber-500/15 text-amber-400 border-amber-600/50",
    strengthen: "bg-blue-500/15 text-blue-400 border-blue-600/50",
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-md border ${colors[stance]}`}>
      {stance}
    </span>
  );
}
