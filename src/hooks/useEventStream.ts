"use client";

import { useMemo } from "react";
import useSWR from "swr";
import type { AgentType, PersistedEvent, RoundStage } from "@/types/domain";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const EMPTY_EVENTS: PersistedEvent[] = [];

interface EventStreamResponse {
  events: PersistedEvent[];
  totalCount: number;
  incremental?: boolean;
}

export interface StageTransition {
  round: number;
  stage: RoundStage;
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

export function useEventStream(sessionId: string, polling: boolean = true) {
  // Always fetch the full list via a stable SWR key. The `compare` option keeps
  // the previous response reference whenever the server's totalCount is
  // unchanged, so `data.events` stays referentially stable across polls that
  // returned no new events — the downstream memos below then don't recompute.
  // This avoids the effect/setState-mirror pattern (and its cascading-render
  // and ref-in-render lint hazards) entirely.
  const { data, error, isLoading } = useSWR<EventStreamResponse>(
    sessionId ? `/api/sessions/${sessionId}/events` : null,
    fetcher,
    {
      refreshInterval: polling ? 2000 : 0,
      compare: (a, b) => a?.totalCount === b?.totalCount,
    },
  );

  const events = data?.events ?? EMPTY_EVENTS;
  const totalCount = data?.totalCount ?? 0;

  const stageTransitions = useMemo(() => deriveStageTransitions(events), [events]);
  const lastEventByAgent = useMemo(() => deriveLastEventByAgent(events), [events]);

  return {
    events,
    totalCount,
    isLoading,
    error,
    stageTransitions,
    lastEventByAgent,
  };
}
