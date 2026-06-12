"use client";

import useSWR from "swr";
import type { PersistedEvent } from "@/types/domain";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface RoundProgressResponse {
  stageProgress: {
    stage: string;
    completedAgents: string[];
    totalAgents: number;
  };
  events: PersistedEvent[];
}

export function useRoundProgress(sessionId: string, round: number | null) {
  const { data, error, isLoading } = useSWR<RoundProgressResponse>(
    sessionId && round ? `/api/sessions/${sessionId}/rounds/${round}` : null,
    fetcher,
    {
      refreshInterval: 500,
    }
  );

  return {
    stageProgress: data?.stageProgress ?? null,
    events: data?.events ?? [],
    isLoading,
    error,
  };
}
