"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`flex h-full items-center justify-center p-8 ${className}`}>
      <div className="text-center max-w-sm">
        {Icon && (
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--text-muted)]">
            <Icon size={22} />
          </div>
        )}
        <h3 className="text-sm font-medium text-[var(--text-primary)]">{title}</h3>
        {description && (
          <div className="mt-1.5 text-xs leading-relaxed text-[var(--text-muted)]">{description}</div>
        )}
        {action && <div className="mt-4 flex justify-center">{action}</div>}
      </div>
    </div>
  );
}
