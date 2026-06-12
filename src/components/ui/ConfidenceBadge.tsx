"use client";

interface ConfidenceBadgeProps {
  confidence: number | null;
}

export default function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  if (confidence === null) {
    return null;
  }

  const percentage = Math.round(confidence * 100);
  const color =
    confidence > 0.7
      ? "text-green-400"
      : confidence > 0.4
      ? "text-yellow-400"
      : "text-red-400";

  return (
    <span className={`text-xs font-mono ${color}`}>
      {percentage}%
    </span>
  );
}
