"use client";

type BadgeVariant = "success" | "warning" | "error" | "info" | "neutral";

interface StatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
  dot?: boolean;
}

const variants: Record<BadgeVariant, { bg: string; text: string; dot: string }> = {
  success: { bg: "bg-green-500/10 border-green-500/30", text: "text-green-400", dot: "bg-green-400" },
  warning: { bg: "bg-amber-500/10 border-amber-500/30", text: "text-amber-400", dot: "bg-amber-400" },
  error: { bg: "bg-red-500/10 border-red-500/30", text: "text-red-400", dot: "bg-red-400" },
  info: { bg: "bg-violet-500/10 border-violet-500/30", text: "text-violet-400", dot: "bg-violet-400" },
  neutral: { bg: "bg-[var(--surface-elevated)] border-[var(--border)]", text: "text-[var(--text-secondary)]", dot: "bg-[var(--text-muted)]" },
};

export default function StatusBadge({ label, variant = "neutral", dot = true }: StatusBadgeProps) {
  const v = variants[variant];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium ${v.bg} ${v.text}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${v.dot}`} />}
      {label}
    </span>
  );
}
