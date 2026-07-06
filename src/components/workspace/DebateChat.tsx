"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare } from "lucide-react";
import type { RoundStage, PersistedEvent, AgentType } from "@/types/domain";
import { useEventStream } from "@/hooks/useEventStream";
import DebateMessage from "./DebateMessage";
import ToolCallTrace from "./ToolCallTrace";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import AgentStatusStream from "./AgentStatusStream";

const ALL_AGENTS: AgentType[] = [
  "senior-engineer",
  "security-engineer",
  "performance-engineer",
  "product-engineer",
];

const agentLabel: Record<AgentType, string> = {
  "senior-engineer": "Senior Engineer",
  "security-engineer": "Security Engineer",
  "performance-engineer": "Performance Engineer",
  "product-engineer": "Product Engineer",
};

interface DebateChatProps {
  sessionId: string;
  currentRound: number;
  currentStage: RoundStage | null;
}

const relevantEventTypes = ["proposal", "critique", "revision", "consensus-update"];

const stageLabels: Record<string, string> = {
  proposal: "Reading code",
  critique: "Checking findings",
  revision: "Refining results",
  consensus: "Building report",
};

function mapEventToMessageType(
  eventType: string
): "proposal" | "critique" | "revision" | "consensus" {
  if (eventType === "consensus-update") return "consensus";
  return eventType as "proposal" | "critique" | "revision";
}

function getTargetAgent(event: PersistedEvent): AgentType | undefined {
  if (event.type !== "critique") return undefined;
  try {
    const data = JSON.parse(event.content);
    return data.targetAgentId || undefined;
  } catch {
    return undefined;
  }
}

interface GroupedEvents {
  stage: RoundStage;
  events: PersistedEvent[];
}

function groupEventsByStage(events: PersistedEvent[]): GroupedEvents[] {
  const groups: GroupedEvents[] = [];
  let currentGroup: GroupedEvents | null = null;

  for (const event of events) {
    const stage = event.stage || "proposal";
    if (!currentGroup || currentGroup.stage !== stage) {
      currentGroup = { stage, events: [] };
      groups.push(currentGroup);
    }
    currentGroup.events.push(event);
  }

  return groups;
}

export default function DebateChat({
  sessionId,
  currentRound,
  currentStage,
}: DebateChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { events, isLoading, lastEventByAgent } = useEventStream(sessionId);
  const [selectedRoundOverride, setSelectedRound] = useState<number | null>(null);
  const [allExpanded, setAllExpanded] = useState<boolean | undefined>(undefined);
  const [showDeveloperDetails, setShowDeveloperDetails] = useState(false);
  const selectedRound = selectedRoundOverride === null || selectedRoundOverride > currentRound
    ? currentRound
    : selectedRoundOverride;

  // Determine available rounds from events
  const availableRounds = useMemo(() => {
    const rounds = new Set<number>();
    for (const e of events) {
      if (relevantEventTypes.includes(e.type) && e.round > 0) {
        rounds.add(e.round);
      }
    }
    // Always include current round even if no events yet
    if (currentRound > 0) rounds.add(currentRound);
    return Array.from(rounds).sort((a, b) => a - b);
  }, [events, currentRound]);

  // Filter events for selected round and relevant types
  const filteredEvents = useMemo(() => {
    return events.filter(
      (e) =>
        e.round === selectedRound && relevantEventTypes.includes(e.type)
    );
  }, [events, selectedRound]);

  // Group events by stage
  const groupedEvents = useMemo(
    () => groupEventsByStage(filteredEvents),
    [filteredEvents]
  );

  // Auto-scroll to bottom when new messages arrive (only if user is near bottom)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || selectedRound !== currentRound) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (isNearBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }, [filteredEvents.length, selectedRound, currentRound]);

  if (isLoading && filteredEvents.length === 0) {
    return (
      <div className="flex flex-col h-full p-4 space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-3/4 rounded-lg" />
        <Skeleton className="h-20 w-5/6 rounded-lg" />
      </div>
    );
  }

  const isLiveRound =
    selectedRound === currentRound &&
    currentStage !== null &&
    currentStage !== "awaiting-intervention";

  if (filteredEvents.length === 0 && selectedRound === currentRound) {
    return (
      <div className="flex flex-col h-full">
        {/* Round selector even in empty state */}
        {availableRounds.length > 1 && (
          <RoundSelector
            availableRounds={availableRounds}
            selectedRound={selectedRound}
            currentRound={currentRound}
            onRoundChange={setSelectedRound}
          />
        )}
        {isLiveRound ? (
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            <p className="text-sm font-medium uppercase tracking-wide text-gray-400">
              AI reviewers are analyzing — pass {selectedRound}…
            </p>
            {ALL_AGENTS.map((agentId) => (
              <div
                key={agentId}
                className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-2"
              >
                <span className="text-sm text-gray-200">{agentLabel[agentId]}</span>
                <AgentStatusStream
                  agent={agentId}
                  lastEvent={lastEventByAgent[agentId]}
                  currentStage={currentStage}
                  variant="full"
                />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={MessageSquare}
            title={`No activity yet for pass ${selectedRound}.`}
            description="Activity appears here as AI reviewers analyze your repo."
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Round selector dropdown */}
      {availableRounds.length > 1 && (
        <RoundSelector
          availableRounds={availableRounds}
          selectedRound={selectedRound}
          currentRound={currentRound}
          onRoundChange={setSelectedRound}
        />
      )}

      {/* Expand All / Collapse All toggle */}
      {filteredEvents.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-2 border-b border-gray-800 shrink-0">
          <button
            type="button"
            onClick={() => setAllExpanded(allExpanded === true ? false : true)}
            className="min-h-11 rounded px-2 text-sm text-blue-300 transition-colors hover:text-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70"
            aria-label={allExpanded === true ? "Collapse all messages" : "Expand all messages"}
          >
            {allExpanded === true ? "Collapse All" : "Expand All"}
          </button>
          <button
            type="button"
            onClick={() => setShowDeveloperDetails((value) => !value)}
            className="min-h-11 rounded px-2 text-sm text-gray-300 transition-colors hover:text-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70"
            aria-pressed={showDeveloperDetails}
          >
            {showDeveloperDetails ? "Hide Qwen evidence" : "Qwen evidence"}
          </button>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Judge-verifiable Qwen tool evidence from persisted stage-progress events. */}
        {showDeveloperDetails && (
          <ToolCallTrace events={events} currentStage={currentStage} />
        )}

        <AnimatePresence mode="popLayout">
          {groupedEvents.map((group, groupIdx) => (
            <div key={`${group.stage}-${groupIdx}`}>
              {/* Stage separator */}
              {groupIdx > 0 && (
                <div className="flex items-center gap-3 py-3">
                  <div className="flex-1 h-px bg-gray-700" />
                  <span className="text-xs uppercase font-medium text-gray-400 tracking-wide">
                    {stageLabels[group.stage] || group.stage}
                  </span>
                  <div className="flex-1 h-px bg-gray-700" />
                </div>
              )}

              {/* Messages in this stage */}
              {group.events.map((event, eventIdx) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: eventIdx * 0.05,
                  }}
                  className="mb-4"
                >
                  <DebateMessage
                    type={mapEventToMessageType(event.type)}
                    agent={event.agentId || "senior-engineer"}
                    content={event.content}
                    timestamp={event.timestamp}
                    targetAgent={getTargetAgent(event)}
                    forceExpanded={allExpanded}
                  />
                </motion.div>
              ))}
            </div>
          ))}
        </AnimatePresence>

        {/* Live progress strip — shows when round is active and we don't yet have
            messages from every agent for the current stage. */}
        {isLiveRound && currentStage && (
          <LiveAgentProgress
            currentStage={currentStage}
            currentRound={currentRound}
            filteredEvents={filteredEvents}
            lastEventByAgent={lastEventByAgent}
          />
        )}
      </div>
    </div>
  );
}

/** Per-agent status row shown while a round is actively executing. */
function LiveAgentProgress({
  currentStage,
  filteredEvents,
  lastEventByAgent,
}: {
  currentStage: RoundStage;
  currentRound: number;
  filteredEvents: PersistedEvent[];
  lastEventByAgent: Partial<Record<AgentType, PersistedEvent>>;
}) {
  // Agents that have already produced a structured event for this stage are "done".
  const stageMessageTypes = new Set(["proposal", "critique", "revision", "consensus-update"]);
  const doneAgents = new Set<AgentType>();
  for (const event of filteredEvents) {
    if (event.stage === currentStage && event.agentId && stageMessageTypes.has(event.type)) {
      doneAgents.add(event.agentId);
    }
  }
  const pending = ALL_AGENTS.filter((a) => !doneAgents.has(a));
  if (pending.length === 0) return null;

  return (
    <div className="mt-2 rounded-lg border border-dashed border-gray-700 bg-gray-900/30 p-3">
      <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">
        Waiting on {pending.length} {pending.length === 1 ? "reviewer" : "reviewers"}
      </p>
      <div className="space-y-1.5">
        {pending.map((agentId) => (
          <div key={agentId} className="flex items-center justify-between text-sm">
            <span className="text-gray-300">{agentLabel[agentId]}</span>
            <AgentStatusStream
              agent={agentId}
              lastEvent={lastEventByAgent[agentId]}
              currentStage={currentStage}
              variant="full"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Round selector dropdown for viewing prior rounds */
function RoundSelector({
  availableRounds,
  selectedRound,
  currentRound,
  onRoundChange,
}: {
  availableRounds: number[];
  selectedRound: number;
  currentRound: number;
  onRoundChange: (round: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-800 shrink-0">
      <label htmlFor="round-selector" className="text-sm text-gray-400">
        Viewing:
      </label>
      <select
        id="round-selector"
        value={selectedRound}
        onChange={(e) => onRoundChange(Number(e.target.value))}
        className="min-h-10 px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-md text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
      >
        {availableRounds.map((round) => (
          <option key={round} value={round}>
            Pass {round}{round === currentRound ? " (current)" : ""}
          </option>
        ))}
      </select>
      {selectedRound !== currentRound && (
        <button
          onClick={() => onRoundChange(currentRound)}
          className="min-h-10 text-sm text-blue-300 hover:text-blue-200 transition-colors ml-1"
        >
          Jump to latest
        </button>
      )}
    </div>
  );
}
