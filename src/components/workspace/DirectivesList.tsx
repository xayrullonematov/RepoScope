"use client";

import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import type { HumanDirective } from "@/types/domain";

interface DirectivesListProps {
  humanDirectives: HumanDirective[];
}

function formatShortDate(timestamp: string): string {
  const date = new Date(timestamp);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function DirectivesList({
  humanDirectives,
}: DirectivesListProps) {
  const activeDirectives = humanDirectives.filter((d) => d.active);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <FileText size={14} className="text-[var(--text-muted)]" />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Active Directives
        </h3>
        {activeDirectives.length > 0 && (
          <span className="ml-auto text-[10px] font-medium text-violet-300 bg-violet-500/15 rounded-full px-2 py-0.5">
            {activeDirectives.length}
          </span>
        )}
      </div>

      {/* List */}
      {activeDirectives.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)] py-4 text-center">
          No active directives yet
        </p>
      ) : (
        <div className="space-y-2">
          {activeDirectives.map((directive, index) => (
            <motion.div
              key={directive.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              className="rounded-md border border-violet-500/20 bg-violet-500/5 px-3 py-2"
            >
              <p className="text-xs text-[var(--text-primary)] leading-relaxed break-words">
                {directive.text}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="inline-flex items-center gap-1 text-[10px] text-green-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                  Active
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  {formatShortDate(directive.createdAt)}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
