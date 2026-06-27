"use client";

import {
  FolderSearch,
  FileSearch,
  ShieldCheck,
  FileText,
  CheckCircle,
  Hand,
} from "lucide-react";
import type { RoundStage } from "@/types/domain";

interface StageProgressBarProps {
  currentStage: RoundStage | null;
  completedStages: RoundStage[];
  currentRound?: number;
}

const stages: {
  id: RoundStage;
  label: string;
  description: string;
  icon: typeof FolderSearch;
}[] = [
  { id: "proposal", label: "Reading repository", description: "Inspecting files and gathering initial findings", icon: FolderSearch },
  { id: "critique", label: "Checking for issues", description: "Verifying risks and flagging problems", icon: ShieldCheck },
  { id: "revision", label: "Refining findings", description: "Improving accuracy and fixing evidence", icon: FileSearch },
  { id: "consensus", label: "Preparing report", description: "Producing the final prioritized report", icon: FileText },
];

export default function StageProgressBar({
  currentStage,
  completedStages,
  currentRound = 0,
}: StageProgressBarProps) {
  const showIntervention = currentStage === "awaiting-intervention";

  const getSegmentState = (stageId: RoundStage): "completed" | "active" | "pending" => {
    if (completedStages.includes(stageId)) return "completed";
    if (currentStage === stageId) return "active";
    return "pending";
  };

  const currentLabel = currentStage
    ? currentStage === "awaiting-intervention"
      ? "Report ready"
      : stages.find((s) => s.id === currentStage)?.label ?? "Working..."
    : currentRound === 0
      ? "Ready to start"
      : "Waiting";

  return (
    <div className="w-full border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2 sm:px-4 sm:py-3">
      {/* Mobile: compact view */}
      <div className="flex items-center justify-between gap-3 sm:hidden">
        <div className="flex min-w-0 items-center gap-2">
          {showIntervention ? (
            <Hand size={17} className="shrink-0 text-amber-400" />
          ) : currentStage ? (
            <Loader size={17} className="shrink-0 text-violet-400 animate-spin" />
          ) : (
            <FolderSearch size={17} className="shrink-0 text-[var(--text-muted)]" />
          )}
          <span className="truncate text-sm font-medium text-[var(--text-primary)]">{currentLabel}</span>
        </div>
        <span className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-0.5 text-xs text-[var(--text-secondary)]">
          {completedStages.length}/4
        </span>
      </div>

      {/* Desktop: full progress view */}
      <div className="hidden items-center gap-1 sm:flex">
        {stages.map((stage, idx) => {
          const state = getSegmentState(stage.id);
          const Icon = stage.icon;

          return (
            <div key={stage.id} className="flex items-center flex-1">
              <div
                className={`
                  relative flex items-center gap-2 px-3 py-2 rounded-lg flex-1 transition-all duration-300
                  ${
                    state === "completed"
                      ? "bg-green-500/10 border border-green-500/30"
                      : state === "active"
                        ? "bg-[var(--violet-soft-bg)] border border-[var(--brand-violet)]/50"
                        : "bg-[var(--surface-elevated)] border border-[var(--border)]"
                  }
                `}
                title={stage.description}
              >
                <div className="relative flex items-center gap-2">
                  {state === "completed" ? (
                    <CheckCircle size={16} className="text-green-400 shrink-0" />
                  ) : (
                    <Icon
                      size={16}
                      className={`shrink-0 ${
                        state === "active"
                          ? "text-violet-400 animate-pulse"
                          : "text-[var(--text-muted)]"
                      }`}
                    />
                  )}
                  <span
                    className={`text-xs font-medium whitespace-nowrap ${
                      state === "completed"
                        ? "text-green-400"
                        : state === "active"
                          ? "text-violet-300"
                          : "text-[var(--text-muted)]"
                    }`}
                  >
                    {stage.label}
                  </span>
                </div>
              </div>

              {idx < stages.length - 1 && (
                <div className="mx-1 text-[var(--text-muted)] shrink-0">
                  <svg width="12" height="12" viewBox="0 0 12 12">
                    <path
                      d="M2 6h8M7 3l3 3-3 3"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </div>
          );
        })}

        {showIntervention && (
          <>
            <div className="mx-1 text-[var(--text-muted)] shrink-0">
              <svg width="12" height="12" viewBox="0 0 12 12">
                <path
                  d="M2 6h8M7 3l3 3-3 3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="relative flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 animate-pulse">
              <Hand size={16} className="text-amber-400 shrink-0" />
              <span className="text-xs font-medium text-amber-300 whitespace-nowrap">
                Your turn
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Loader({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
