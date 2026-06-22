"use client";

import { useMemo } from "react";
import useSWR from "swr";
import type { AgentType, PersistedEvent, RoundStage } from "@/types/domain";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface EventStreamResponse {
  events: PersistedEvent[];
  totalCount: number;
}

export interface StageTransition {
  round: number;
  stage: RoundStage;
  /** Wall-clock timestamp of the earliest event observed for this stage. */
  startedAt: string;
}

function deriveStageTransitions(events: PersistedEvent[]): StageTransition[] {
  const seen = new Map<string, StageTransition>();
  for (const event of events) {
    if (!event.stage || event.stage === "awaiting-intervention") continue;
    const key = `${event.round}:${event.stage}`;
    if (seen.has(key)) continue;
    seen.set(key, { round: event.round, stage: event.stage, startedAt: event.timestamp });
  }
  // Ensure deterministic order: round then stage order.
  const stageOrder: Record<RoundStage, number> = {
    proposal: 0,
    critique: 1,
    revision: 2,
    consensus: 3,
    "awaiting-intervention": 4,
  };
  return Array.from(seen.values()).sort((a, b) => {
    if (a.round !== b.round) return a.round - b.round;
    return stageOrder[a.stage] - stageOrder[b.stage];
  });
}

function deriveLastEventByAgent(events: PersistedEvent[]): Partial<Record<AgentType, PersistedEvent>> {
  const map: Partial<Record<AgentType, PersistedEvent>> = {};
  for (const event of events) {
    if (!event.agentId) continue;
    const current = map[event.agentId];
    if (!current || event.timestamp > current.timestamp) {
      map[event.agentId] = event;
    }
  }
  return map;
}

export function useEventStream(sessionId: string) {
  const { data, error, isLoading } = useSWR<EventStreamResponse>(
    sessionId ? `/api/sessions/${sessionId}/events` : null,
    fetcher,
    {
      refreshInterval: 1000,
    },
  );

  const events = useMemo(() => data?.events ?? [], [data]);

  const stageTransitions = useMemo(() => deriveStageTransitions(events), [events]);
  const lastEventByAgent = useMemo(() => deriveLastEventByAgent(events), [events]);

  return {
    events,
    totalCount: data?.totalCount ?? 0,
    isLoading,
    error,
    stageTransitions,
    lastEventByAgent,
  };
}
