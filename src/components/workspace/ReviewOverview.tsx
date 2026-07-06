"use client";

import type { PersistedEvent, SessionState, SessionConfig } from "@/types/domain";
import ReviewSummaryCard from "./ReviewSummaryCard";
import TopFindingsList from "./TopFindingsList";
import RecommendedNextSteps from "./RecommendedNextSteps";
import ReviewProgressState from "./ReviewProgressState";
import { isRoundActive } from "./workspace-status";
import FindingLineagePanel from "./FindingLineagePanel";

interface ReviewOverviewProps {
  session: SessionState & {
    config?: SessionConfig;
  };
  onExport: () => void;
  onRerun: () => void;
  rerunDisabled: boolean;
  onSwitchToFindings: () => void;
  onSwitchToTechnical: () => void;
  events: PersistedEvent[];
}

export default function ReviewOverview({
  session,
  onExport,
  onRerun,
  rerunDisabled,
  onSwitchToFindings,
  onSwitchToTechnical,
  events,
}: ReviewOverviewProps) {
  const hasConsensus = session.consensus !== null;
  const isActive = isRoundActive(session);
  const isQueuedOrRunning = session.reviewJob?.status === "queued" || session.reviewJob?.status === "running";

  // A refinement may run while an older consensus remains visible in state;
  // progress takes precedence until the queued job finishes.
  if (isQueuedOrRunning || (isActive && !hasConsensus)) {
    return (
      <div className="h-full overflow-y-auto">
        <ReviewProgressState
          currentStage={session.currentStage}
          job={session.reviewJob ?? null}
          completedAgents={session.agents.filter((agent) => agent.hasCompletedCurrentStage).length}
          findingCount={session.artifacts.length}
          onShowTechnical={onSwitchToTechnical}
        />
      </div>
    );
  }

  // Show the overview report when consensus exists
  if (hasConsensus) {
    return (
      <div className="h-full overflow-y-auto px-4 py-5 space-y-6 sm:px-6 sm:py-6">
        <ReviewSummaryCard session={session} config={session.config} />
        <FindingLineagePanel events={events} />
        <TopFindingsList session={session} onViewAllFindings={onSwitchToFindings} />
        <RecommendedNextSteps
          session={session}
          onExport={onExport}
          onRerun={onRerun}
          rerunDisabled={rerunDisabled}
        />
      </div>
    );
  }

  // Fallback: not running but no consensus (e.g., awaiting-intervention or paused)
  return (
    <div className="h-full overflow-y-auto px-4 py-5 space-y-5 sm:px-6 sm:py-6">
      <div>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">Review Report</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
          {session.problemDescription}
        </p>
      </div>
      {session.artifacts.length > 0 ? (
        <div>
          <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">
            Findings so far
          </h3>
          <div className="space-y-2">
            {session.artifacts
              .filter((a) => a.status !== "rejected")
              .slice(0, 5)
              .map((a) => (
                <div
                  key={a.id}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[var(--text-muted)] uppercase">
                      {a.type === "decision" ? "finding" : a.type}
                    </span>
                    {a.status === "accepted" && (
                      <span className="text-[10px] text-green-400 font-mono">accepted</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">{a.title}</p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)] line-clamp-2">
                    {a.content}
                  </p>
                </div>
              ))}
          </div>
          {session.artifacts.length > 5 && (
            <button
              onClick={onSwitchToFindings}
              className="mt-3 text-xs text-[var(--brand-violet)] hover:text-[var(--violet-hover)] transition-colors"
            >
              View all {session.artifacts.length} findings
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-6 text-center">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            Waiting for analysis to complete...
          </p>
          <p className="mt-1.5 text-xs text-[var(--text-muted)]">
            Findings will appear here after the review completes.
          </p>
        </div>
      )}
    </div>
  );
}
