"use client";

import useSWR from "swr";
import type { PersistedEvent } from "@/types/domain";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface EventStreamResponse {
  events: PersistedEvent[];
  totalCount: number;
}

export function useEventStream(sessionId: string) {
  const { data, error, isLoading } = useSWR<EventStreamResponse>(
    sessionId ? `/api/sessions/${sessionId}/events` : null,
    fetcher,
    {
      refreshInterval: 1000,
    }
  );

  return {
    events: data?.events ?? [],
    totalCount: data?.totalCount ?? 0,
    isLoading,
    error,
  };
}
