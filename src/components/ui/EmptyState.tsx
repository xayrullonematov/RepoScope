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
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-gray-700 bg-gray-800/70 text-gray-400">
            <Icon size={22} />
          </div>
        )}
        <h3 className="text-sm font-medium text-gray-200">{title}</h3>
        {description && (
          <div className="mt-1 text-xs leading-relaxed text-gray-500">{description}</div>
        )}
        {action && <div className="mt-4 flex justify-center">{action}</div>}
      </div>
    </div>
  );
}
