"use client";

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import useSWR from "swr";
import type { AgentType, PersistedEvent, RoundStage } from "@/types/domain";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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

export function useEventStream(sessionId: string, active: boolean = true) {
  const [events, setEvents] = useState<PersistedEvent[]>([]);
  const lastIdRef = useRef<string | null>(null);
  const eventCountRef = useRef(0);

  // Use SWR for polling with cursor-based incremental fetch
  const swrKey = sessionId && active
    ? `/api/sessions/${sessionId}/events${lastIdRef.current ? `?after=${lastIdRef.current}` : ""}`
    : null;

  const { data, error, isLoading } = useSWR<EventStreamResponse>(
    // Always fetch full list via SWR key (cursor in ref doesn't work with SWR key stability)
    sessionId && active ? `/api/sessions/${sessionId}/events` : null,
    fetcher,
    { refreshInterval: active ? 2000 : 0 },
  );

  // Only update events state when totalCount actually changes (avoids unstable references)
  useEffect(() => {
    if (!data?.events) return;
    if (data.totalCount === eventCountRef.current) return;
    eventCountRef.current = data.totalCount;
    setEvents(data.events);
    const last = data.events[data.events.length - 1];
    if (last) lastIdRef.current = last.id;
  }, [data]);

  const stageTransitions = useMemo(() => deriveStageTransitions(events), [events]);
  const lastEventByAgent = useMemo(() => deriveLastEventByAgent(events), [events]);

  return {
    events,
    totalCount: eventCountRef.current,
    isLoading,
    error,
    stageTransitions,
    lastEventByAgent,
  };
}
