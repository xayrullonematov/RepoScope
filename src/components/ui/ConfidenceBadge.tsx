"use client";

interface ConfidenceBadgeProps {
  confidence: number | null;
}

export default function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  if (confidence === null) {
    return null;
  }

  const percentage = Math.round(confidence * 100);

  const getBarColor = (pct: number): string => {
    if (pct >= 70) return "bg-green-500";
    if (pct >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getTextColor = (pct: number): string => {
    if (pct >= 70) return "text-green-400";
    if (pct >= 40) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs font-mono ${getTextColor(percentage)}`}>
        {percentage}%
      </span>
      <div className="h-1 w-16 rounded-full bg-gray-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${getBarColor(percentage)}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
