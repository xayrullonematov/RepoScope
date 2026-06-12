"use client";

import useSWR from "swr";
import type { SessionTokenUsage, BudgetStatus, CostEstimate } from "@/types/domain";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface TokenUsageResponse {
  usage: SessionTokenUsage;
  budgetStatus: BudgetStatus;
  nextRoundEstimate: CostEstimate | null;
}

export function useTokenUsage(sessionId: string) {
  const { data, error, isLoading } = useSWR<TokenUsageResponse>(
    sessionId ? `/api/sessions/${sessionId}/token-usage` : null,
    fetcher,
    {
      refreshInterval: 5000,
    }
  );

  return {
    usage: data?.usage ?? null,
    budgetStatus: data?.budgetStatus ?? null,
    nextRoundEstimate: data?.nextRoundEstimate ?? null,
    isLoading,
    error,
  };
}
