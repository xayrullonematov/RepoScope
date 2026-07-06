"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import type { RoundStage } from "@/types/domain";

interface ReviewProgressStateProps {
  currentStage: RoundStage | null;
  job: {
    status: "queued" | "running" | "completed" | "failed";
    createdAt: string;
    startedAt: string | null;
  } | null;
  completedAgents: number;
  findingCount: number;
  onShowTechnical: () => void;
}

const stageDescriptions: Record<string, string> = {
  proposal: "Reading repository structure",
  critique: "Inspecting important files",
  revision: "Checking for risks and bugs",
  consensus: "Preparing report",
};

export default function ReviewProgressState({
  currentStage,
  job,
  completedAgents,
  findingCount,
  onShowTechnical,
}: ReviewProgressStateProps) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const description = job?.status === "queued"
    ? "Queued — the review worker will start shortly"
    : currentStage
    ? stageDescriptions[currentStage] || "Analyzing..."
    : "Starting analysis...";
  const startedAt = job?.startedAt ?? job?.createdAt;
  const elapsedSeconds = startedAt ? Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000)) : 0;
  const elapsed = elapsedSeconds >= 60
    ? `${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s`
    : `${elapsedSeconds}s`;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        {/* Animated progress indicator */}
        <div className="flex items-center justify-center">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-2 border-[var(--border)] flex items-center justify-center">
              <Loader2 size={24} className="text-[var(--brand-violet)] animate-spin" />
            </div>
            <div className="absolute -inset-2 rounded-full border border-[var(--brand-violet)]/20 animate-pulse" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {job?.status === "queued" ? "Review queued" : "Analyzing repository..."}
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">{description}</p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-left">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Elapsed</p>
            <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">{elapsed}</p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Agents</p>
            <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">{completedAgents}/4</p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Findings</p>
            <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">{findingCount}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onShowTechnical}
          className="mx-auto min-h-11 px-2 text-xs text-[var(--brand-violet)] transition-colors hover:text-[var(--violet-hover)]"
        >
          Show technical activity
        </button>
      </motion.div>
    </div>
  );
}
