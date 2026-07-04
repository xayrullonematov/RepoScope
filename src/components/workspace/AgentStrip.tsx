"use client";

import { useState } from "react";
import type { AgentState, AgentType, PersistedEvent, RoundStage } from "@/types/domain";
import Sheet from "@/components/ui/Sheet";
import AgentCard, { agentColors, getAgentStatus } from "./AgentCard";

interface AgentStripProps {
  agents: AgentState[];
  currentStage: RoundStage | null;
  activeAgentId?: string;
  lastEventByAgent?: Partial<Record<AgentType, PersistedEvent>>;
}

export default function AgentStrip({
  agents,
  currentStage,
  activeAgentId,
  lastEventByAgent = {},
}: AgentStripProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const selected = selectedIdx !== null ? agents[selectedIdx] : null;

  return (
    <>
      <div
        role="group"
        aria-label="AI reviewers"
        className="flex gap-2 overflow-x-auto border-b border-gray-800 bg-gray-950/60 px-3 py-2.5 [scrollbar-width:none] [-ms-overflow-style:none] [&amp;::-webkit-scrollbar]:hidden"
      >
        {agents.map((agent, i) => {
          const status = getAgentStatus(agent, currentStage, activeAgentId);
          return (
            <button
              key={agent.id}
              type="button"
              aria-haspopup="dialog"
              aria-label={`${agent.displayName}: ${status.label}. Open details`}
              onClick={() => setSelectedIdx(i)}
              className="flex shrink-0 items-center gap-2 rounded-full border border-gray-700 bg-gray-800/60 px-3 py-2 text-xs min-h-11 text-gray-200 transition-colors hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: agentColors[agent.id] }}
              />
              <span className="font-medium whitespace-nowrap">
                {agent.displayName.split(" ").pop()}
              </span>
              <span className={`whitespace-nowrap ${status.className}`}>
                {status.label}
              </span>
            </button>
          );
        })}
      </div>

      <Sheet
        open={selected !== null}
        onOpenChange={(v) => !v && setSelectedIdx(null)}
        title={selected ? selected.displayName : ""}
      >
        {selected && (
          <div className="px-3 py-3">
            <AgentCard
              agent={selected}
              currentStage={currentStage}
              activeAgentId={activeAgentId}
              lastEvent={lastEventByAgent[selected.id]}
              expanded
            />
          </div>
        )}
      </Sheet>
    </>
  );
}
