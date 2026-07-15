"use client";

import { motion } from "framer-motion";
import { Bot, UserCircle } from "lucide-react";
import type { AgentState, RoundStage } from "@/types/domain";

interface TeamRoomPanelProps {
  agents: AgentState[];
  currentStage: RoundStage | null;
}

const agentColors: Record<string, string> = {
  "senior-engineer": "#14b8a6",
  "security-engineer": "#ef4444",
  "performance-engineer": "#f59e0b",
  "product-engineer": "#38bdf8",
};

const HUMAN_COLOR = "#7C3AED";

function getAgentStatusLabel(
  agent: AgentState,
  currentStage: RoundStage | null,
): string {
  if (!currentStage || currentStage === "awaiting-intervention") {
    return "waiting";
  }
  if (agent.hasCompletedCurrentStage) {
    return "completed";
  }
  switch (currentStage) {
    case "proposal":
      return "proposing";
    case "critique":
      return "critiquing";
    case "revision":
      return "revising";
    case "consensus":
      return "consensus";
    default:
      return "waiting";
  }
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "active":
      return "bg-violet-500/20 text-violet-300";
    case "completed":
      return "bg-green-500/20 text-green-300";
    case "proposing":
    case "critiquing":
    case "revising":
    case "consensus":
      return "bg-amber-500/20 text-amber-300";
    case "waiting":
    default:
      return "bg-gray-500/20 text-gray-400";
  }
}

export default function TeamRoomPanel({
  agents,
  currentStage,
}: TeamRoomPanelProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
        Team Members
      </h3>

      {/* Human member - always first */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex items-center gap-3 rounded-lg border border-violet-500/30 bg-violet-500/5 px-3 py-2.5"
      >
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `${HUMAN_COLOR}20` }}
        >
          <UserCircle size={18} style={{ color: HUMAN_COLOR }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--text-primary)] truncate">
            You / Human Engineer
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${getStatusBadgeClass("active")}`}
        >
          active
        </span>
      </motion.div>

      {/* AI agent members */}
      {agents.map((agent, index) => {
        const status = getAgentStatusLabel(agent, currentStage);
        const color = agentColors[agent.id] ?? "#6b7280";

        return (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: (index + 1) * 0.05 }}
            className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5"
          >
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `${color}20` }}
            >
              <Bot size={18} style={{ color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                {agent.displayName}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${getStatusBadgeClass(status)}`}
            >
              {status}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
