"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AgentState, AgentType, PersistedEvent, RoundStage } from "@/types/domain";
import StanceBadge from "@/components/ui/StanceBadge";
import ConfidenceBadge from "@/components/ui/ConfidenceBadge";
import AgentStatusStream from "./AgentStatusStream";

export const agentColors: Record<AgentType, string> = {
  "senior-engineer": "#3b82f6",
  "security-engineer": "#ef4444",
  "performance-engineer": "#f59e0b",
  "product-engineer": "#8b5cf6",
};

export const agentBorderColors: Record<AgentType, string> = {
  "senior-engineer": "border-l-blue-500",
  "security-engineer": "border-l-red-500",
  "performance-engineer": "border-l-amber-500",
  "product-engineer": "border-l-violet-500",
};

export function getAgentStatus(
  agent: AgentState,
  currentStage: RoundStage | null,
  activeAgentId?: string,
): { label: string; className: string } {
  if (!currentStage || currentStage === "awaiting-intervention") {
    return { label: "Idle", className: "text-gray-500" };
  }
  if (activeAgentId === agent.id) {
    return { label: "Thinking...", className: "text-blue-400 animate-pulse" };
  }
  if (agent.hasCompletedCurrentStage) {
    return { label: "Done", className: "text-green-400" };
  }
  return { label: "Waiting", className: "text-gray-500" };
}

interface AgentCardProps {
  agent: AgentState;
  currentStage: RoundStage | null;
  activeAgentId?: string;
  /** When provided, the card is controlled by the parent (no internal toggle). */
  expanded?: boolean;
  /** When omitted, the card uses its own expand/collapse toggle. */
  onToggle?: () => void;
  /** Last persisted event for this agent — drives the live status pill in expanded mode. */
  lastEvent?: PersistedEvent;
}

export default function AgentCard({
  agent,
  currentStage,
  activeAgentId,
  expanded,
  onToggle,
  lastEvent,
}: AgentCardProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = expanded ?? internalExpanded;
  const handleToggle = () => {
    if (onToggle) onToggle();
    else setInternalExpanded((v) => !v);
  };

  const status = getAgentStatus(agent, currentStage, activeAgentId);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      aria-label={`${agent.displayName} - ${status.label}. ${isExpanded ? "Collapse" : "Expand"} details.`}
      className={`
        border-l-2 rounded-lg bg-gray-800/50 border border-gray-700
        transition-all duration-200 cursor-pointer hover:bg-gray-800
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-950
        ${agentBorderColors[agent.id]}
      `}
      onClick={handleToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleToggle();
        }
      }}
    >
      <div className="flex items-center justify-between px-3 py-2 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: agentColors[agent.id] }}
          />
          <span className="text-sm text-gray-200 truncate font-medium">
            {agent.displayName}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <StanceBadge stance={agent.currentStance} />
          <ConfidenceBadge confidence={agent.confidence} />
        </div>

        <span className={`text-xs whitespace-nowrap shrink-0 ${status.className}`}>
          {status.label}
        </span>
      </div>

      <AnimatePresence>
        {isExpanded && (agent.currentPosition || lastEvent) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-2 pt-1 border-t border-gray-700 space-y-2">
              {lastEvent && (
                <div className="flex items-center gap-2">
                  <AgentStatusStream
                    agent={agent.id}
                    lastEvent={lastEvent}
                    currentStage={currentStage}
                    variant="full"
                  />
                </div>
              )}
              {agent.currentPosition && (
                <p className="text-xs text-gray-400 leading-relaxed">
                  {agent.currentPosition}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
