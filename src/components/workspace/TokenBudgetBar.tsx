"use client";

interface TokenBudgetBarProps {
  used: number;
  total: number;
  estimatedCost: number;
}

export default function TokenBudgetBar({
  used,
  total,
  estimatedCost,
}: TokenBudgetBarProps) {
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
      <div className="h-1.5 w-full rounded-full bg-gray-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${getBarColor(percentage)}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className={`mt-1 text-xs ${getTextColor(percentage)}`}>
        {formatNumber(used)} / {formatNumber(total)} tokens{" "}
        <span className="text-gray-500">&bull; ${estimatedCost.toFixed(2)}</span>
      </p>
    </div>
  );
}
