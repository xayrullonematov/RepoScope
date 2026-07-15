"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import type { PersistedEvent, HumanDirective, AgentType } from "@/types/domain";

interface TeamActivityFeedProps {
  events: PersistedEvent[];
  humanDirectives: HumanDirective[];
}

interface ActivityItem {
  id: string;
  description: string;
  detail?: string;
  timestamp: string;
}

const agentDisplayNames: Record<AgentType, string> = {
  "senior-engineer": "Senior Engineer",
  "security-engineer": "Security Engineer",
  "performance-engineer": "Performance Engineer",
  "product-engineer": "Product Engineer",
};

function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export default function TeamActivityFeed({
  events,
  humanDirectives,
}: TeamActivityFeedProps) {
  const activeDirectiveCount = useMemo(
    () => humanDirectives.filter((d) => d.active).length,
    [humanDirectives],
  );

  const activityItems: ActivityItem[] = useMemo(() => {
    const items: ActivityItem[] = [];

    for (const event of events) {
      switch (event.type) {
        case "human-directive": {
          let preview = "";
          try {
            const content = JSON.parse(event.content);
            preview = typeof content.text === "string" ? content.text.slice(0, 80) : "";
          } catch {
            // ignore parse errors
          }
          items.push({
            id: event.id,
            description: "You added a team directive",
            detail: preview || undefined,
            timestamp: event.timestamp,
          });
          break;
        }
        case "proposal": {
          const agentName = event.agentId
            ? agentDisplayNames[event.agentId]
            : "An agent";
          const directiveSuffix =
            activeDirectiveCount > 0
              ? ` with ${activeDirectiveCount} active directive${activeDirectiveCount > 1 ? "s" : ""}`
              : "";
          items.push({
            id: event.id,
            description: `${agentName} completed proposal${directiveSuffix}`,
            timestamp: event.timestamp,
          });
          break;
        }
        case "critique": {
          const agentName = event.agentId
            ? agentDisplayNames[event.agentId]
            : "An agent";
          items.push({
            id: event.id,
            description: `${agentName} completed critique with ${activeDirectiveCount} active directive${activeDirectiveCount !== 1 ? "s" : ""}`,
            timestamp: event.timestamp,
          });
          break;
        }
        case "revision": {
          const agentName = event.agentId
            ? agentDisplayNames[event.agentId]
            : "An agent";
          items.push({
            id: event.id,
            description: `${agentName} revised position with ${activeDirectiveCount} active directive${activeDirectiveCount !== 1 ? "s" : ""}`,
            timestamp: event.timestamp,
          });
          break;
        }
        case "round-started": {
          items.push({
            id: event.id,
            description: `Round ${event.round} started`,
            timestamp: event.timestamp,
          });
          break;
        }
        case "consensus-update": {
          items.push({
            id: event.id,
            description: "Consensus synthesized",
            timestamp: event.timestamp,
          });
          break;
        }
        default:
          break;
      }
    }

    // Return most recent 15 items
    return items.slice(-15).reverse();
  }, [events, activeDirectiveCount]);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Activity size={14} className="text-[var(--text-muted)]" />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Team Activity
        </h3>
      </div>

      {/* Feed */}
      <div className="max-h-72 overflow-y-auto space-y-1.5">
        {activityItems.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] py-4 text-center">
            No activity yet. Start a review to see team updates.
          </p>
        ) : (
          activityItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.15, delay: index * 0.02 }}
              className="flex items-start gap-2 py-1.5 border-b border-[var(--border)] last:border-b-0"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {item.description}
                </p>
                {item.detail && (
                  <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">
                    {item.detail}
                  </p>
                )}
              </div>
              <span className="shrink-0 text-[10px] text-[var(--text-muted)] pt-0.5">
                {formatRelativeTime(item.timestamp)}
              </span>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
