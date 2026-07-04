"use client";

import useSWR from "swr";
import type { ModelTierConfig } from "@/types/domain";

export interface AppConfig {
  baseUrl: string;
  model: string;
  modelTiers: ModelTierConfig;
  temperature: number;
  maxTokens: number;
  defaultTokenBudget: number | null;
}

interface ConfigResponse {
  config: AppConfig;
}

const fetcher = async (url: string): Promise<AppConfig> => {
  const res = await fetch(url);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Request failed with ${res.status}`);
  }
  const data = (await res.json()) as ConfigResponse;
  return data.config;
};

export function useConfig() {
  const { data, error, isLoading, mutate } = useSWR<AppConfig>(
    "/api/config",
    fetcher,
    { revalidateOnFocus: false },
  );

  async function update(patch: Partial<AppConfig>): Promise<AppConfig> {
    const previous = data;
    const optimistic = previous
      ? {
          ...previous,
          ...patch,
          modelTiers: patch.modelTiers
            ? { ...previous.modelTiers, ...patch.modelTiers }
            : previous.modelTiers,
        }
      : undefined;

    const next = await mutate(
      async () => {
        const res = await fetch("/api/config", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `Save failed with ${res.status}`);
        }
        const json = (await res.json()) as ConfigResponse;
        return json.config;
      },
      {
        optimisticData: optimistic,
        rollbackOnError: true,
        revalidate: false,
        populateCache: true,
      },
    );
    if (!next) throw new Error("Save returned no config");
    return next;
  }

  return { config: data, isLoading, error, mutate, update };
}
