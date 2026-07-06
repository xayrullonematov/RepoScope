"use client";

import { useEffect, useRef } from "react";
import { toast } from "@/hooks/useToast";
import type { StageTransition } from "@/hooks/useEventStream";
import type { RoundStage } from "@/types/domain";

interface StageTransitionToastProps {
  transitions: StageTransition[];
}

const stageLabel: Record<RoundStage, string> = {
  proposal: "Proposal stage started",
  critique: "Critique stage started",
  revision: "Revision stage started",
  consensus: "Consensus stage started",
  "awaiting-intervention": "Round complete",
};

const stageDescription: Record<RoundStage, string> = {
  proposal: "Each agent is drafting their initial proposal.",
  critique: "Agents are reviewing each other's proposals.",
  revision: "Agents are revising based on critique.",
  consensus: "Synthesising the final decisions.",
  "awaiting-intervention": "The autonomous review finished and the report is ready.",
};

export default function StageTransitionToast({ transitions }: StageTransitionToastProps) {
  // Track keys we've already toasted across renders. Pre-seed with the current
  // transitions on first mount so we don't blast a toast for every historical
  // transition the moment a user opens the page.
  const seenRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (seenRef.current === null) {
      seenRef.current = new Set(transitions.map((t) => `${t.round}:${t.stage}`));
      return;
    }
    for (const t of transitions) {
      const key = `${t.round}:${t.stage}`;
      if (seenRef.current.has(key)) continue;
      seenRef.current.add(key);
      const label = stageLabel[t.stage];
      const description = `Round ${t.round} — ${stageDescription[t.stage]}`;
      if (t.stage === "awaiting-intervention") {
        toast.success({ message: label, description });
      } else {
        toast.info({ message: label, description });
      }
    }
  }, [transitions]);

  return null;
}
