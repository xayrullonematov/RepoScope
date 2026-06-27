"use client";

interface StatCardProps {
  label: string;
  value: string | number;
  color?: string;
}

export default function StatCard({ label, value, color }: StatCardProps) {
  return (
    <div className="text-center">
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
      <p className={`text-sm font-semibold ${color ?? "text-[var(--text-primary)]"}`}>{value}</p>
    </div>
  );
}
