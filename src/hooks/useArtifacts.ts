"use client";

import useSWR from "swr";
import type { ArtifactState } from "@/types/domain";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface ArtifactsResponse {
  artifacts: ArtifactState[];
}

export function useArtifacts(sessionId: string, active: boolean = true) {
  const { data, error, isLoading, mutate } = useSWR<ArtifactsResponse>(
    sessionId ? `/api/sessions/${sessionId}/artifacts` : null,
    fetcher,
    { refreshInterval: active ? 2000 : 0 }
  );

  return {
    artifacts: data?.artifacts ?? [],
    isLoading,
    error,
    mutate,
  };
}
