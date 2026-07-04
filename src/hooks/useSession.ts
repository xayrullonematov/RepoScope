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
        if (!latestData) return 2000;
        const session = latestData as SessionState;
        if (session.status === "completed") return 0;
        // Fast poll when a stage is actively executing
        if (session.currentStage && session.currentStage !== "awaiting-intervention") {
          return 500;
        }
        // Medium poll when active but between stages
        if (session.status === "active" && session.currentRound > 0) {
          return 2000;
        }
        // Baseline poll so we never miss an external state change
        return 5000;
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
