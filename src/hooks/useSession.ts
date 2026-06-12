"use client";

import useSWR from "swr";
import type { SessionState } from "@/types/domain";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useSession(sessionId: string) {
  const { data, error, isLoading, mutate } = useSWR<SessionState>(
    sessionId ? `/api/sessions/${sessionId}` : null,
    fetcher,
    {
      refreshInterval: (latestData) => {
        if (!latestData) return 0;
        const session = latestData as SessionState;
        // 500ms when stage is executing
        if (session.currentStage && session.currentStage !== "awaiting-intervention") {
          return 500;
        }
        // 2s when round is active
        if (session.status === "active" && session.currentRound > 0) {
          return 2000;
        }
        // No polling when idle
        return 0;
      },
    }
  );

  return {
    session: data,
    isLoading,
    error,
    mutate,
  };
}
