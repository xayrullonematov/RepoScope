"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  Pause,
  ArrowRight,
  Play,
} from "lucide-react";
import type { SessionState, RoundStage, ArtifactType, ArtifactStatus } from "@/types/domain";
import StageProgressBar from "./StageProgressBar";
import AgentArena from "./AgentArena";
import AgentStrip from "./AgentStrip";
import DebateChat from "./DebateChat";
import WorkspaceTabs from "./WorkspaceTabs";
import MobileTabBar from "./MobileTabBar";
import ResultsDashboard from "./ResultsDashboard";
import TokenBudgetBar from "./TokenBudgetBar";
import ArtifactCard from "./ArtifactCard";
import InterventionPanel from "./InterventionPanel";
import NotificationBanner from "@/components/ui/NotificationBanner";
import EmptyState from "@/components/ui/EmptyState";
import StageTransitionToast from "./StageTransitionToast";
import RoundEtaIndicator from "./RoundEtaIndicator";
import ClarificationPanel from "./ClarificationPanel";
import GitHubGroundingIndicator from "./GitHubGroundingIndicator";
import BudgetEditDialog from "./BudgetEditDialog";
import ExportMenu, { type ExportMenuHandle } from "./ExportMenu";
import { useEventStream } from "@/hooks/useEventStream";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { toast } from "@/hooks/useToast";
import { FileText, History } from "lucide-react";
import Link from "next/link";
import type { SessionConfig } from "@/types/domain";

interface WorkspaceLayoutProps {
  session: SessionState & {
    tokenBudget?: number | null;
    config?: SessionConfig;
    wasRecovered?: boolean;
    recoveredAt?: string | null;
  };
  mutate?: () => void;
}

// SessionState type does not expose a tokenBudget field, so we use a
// sensible default as the denominator for the token budget progress bar.
const DEFAULT_TOKEN_BUDGET = 100000;

const stageOrder: RoundStage[] = ["proposal", "critique", "revision", "consensus"];

function getCompletedStages(currentStage: RoundStage | null): RoundStage[] {
  if (!currentStage) return [];
  if (currentStage === "awaiting-intervention") {
    return ["proposal", "critique", "revision", "consensus"];
  }
  const idx = stageOrder.indexOf(currentStage);
  if (idx <= 0) return [];
  return stageOrder.slice(0, idx);
}

function SessionStatusBadge({ status }: { status: "active" | "paused" | "completed" }) {
  const config = {
    active: {
      icon: Loader2,
      label: "Active",
      className: "bg-green-900/50 text-green-400 border-green-700",
      iconClass: "animate-spin",
    },
    paused: {
      icon: Pause,
      label: "Paused",
      className: "bg-yellow-900/50 text-yellow-400 border-yellow-700",
      iconClass: "",
    },
    completed: {
      icon: CheckCircle,
      label: "Completed",
      className: "bg-blue-900/50 text-blue-400 border-blue-700",
      iconClass: "",
    },
  };

  const { icon: Icon, label, className, iconClass } = config[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${className}`}>
      <Icon size={12} className={iconClass} />
      {label}
    </span>
  );
}

export default function WorkspaceLayout({ session, mutate }: WorkspaceLayoutProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("debate");
  const [isStartingRound, setIsStartingRound] = useState(false);
  const [artifactTypeFilter, setArtifactTypeFilter] = useState<ArtifactType | "all">("all");
  const [artifactStatusFilter, setArtifactStatusFilter] = useState<ArtifactStatus | "all">("accepted");
  const [showBudgetDialog, setShowBudgetDialog] = useState(false);
  const exportMenuRef = useRef<ExportMenuHandle>(null);
  // Fire a one-time toast if this session was crash-recovered. Use the
  // recoveredAt timestamp as the dedupe key so navigating back later doesn't
  // re-fire — and so a *new* recovery does.
  const recoveryKey = session.recoveredAt ?? null;
  const recoveryShownRef = useRef<string | null>(null);
  useEffect(() => {
    if (!session.wasRecovered || !recoveryKey) return;
    if (recoveryShownRef.current === recoveryKey) return;
    recoveryShownRef.current = recoveryKey;
    toast.info({
      message: "Session recovered",
      description: "We restored this session after an interrupted round. You can continue from where it left off.",
    });
  }, [session.wasRecovered, recoveryKey]);

  // Subscribe to the raw event stream once at this level — children read derived
  // selectors via props so we don't fire 5 separate SWR pollers.
  const { events, stageTransitions, lastEventByAgent } = useEventStream(session.id);

  // Compute workspace state
  const isEmptyState = session.currentRound === 0 && session.artifacts.length === 0 && !session.currentStage;
  const isActiveRound = session.currentStage !== null && session.currentStage !== "awaiting-intervention";
  const isAwaitingIntervention = session.currentStage === "awaiting-intervention";

  const completedStages = useMemo(() => getCompletedStages(session.currentStage), [session.currentStage]);

  const totalTokens = (session.tokenUsage.totalInputTokens || 0) + (session.tokenUsage.totalOutputTokens || 0);
  const budgetCeiling = session.tokenBudget ?? DEFAULT_TOKEN_BUDGET;
  const githubRepo = session.config?.githubRepo;

  // Show the clarification panel only when the latest interaction is a still-
  // unanswered clarification request. A `user-intervention` event after the
  // clarification means the user already replied.
  const hasPendingClarification = useMemo(() => {
    for (let i = events.length - 1; i >= 0; i--) {
      const e = events[i];
      if (e.type === "user-intervention" && e.round === session.currentRound) return false;
      if (e.type === "clarification-request" && e.round === session.currentRound) return true;
    }
    return false;
  }, [events, session.currentRound]);

  // Filter artifacts
  const filteredArtifacts = useMemo(() => {
    const filtered = session.artifacts.filter((a) => {
      if (artifactTypeFilter !== "all" && a.type !== artifactTypeFilter) return false;
      if (artifactStatusFilter !== "all" && a.status !== artifactStatusFilter) return false;
      return true;
    });
    // Sort: accepted first, then draft, then rejected
    const statusOrder: Record<ArtifactStatus, number> = { accepted: 0, draft: 1, rejected: 2 };
    return filtered.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
  }, [session.artifacts, artifactTypeFilter, artifactStatusFilter]);

  // Tab configuration
  const tabs = useMemo(() => [
    { id: "debate", label: "Debate" },
    { id: "artifacts", label: "Artifacts", badge: session.artifacts.length || undefined },
    { id: "results", label: "Results" },
  ], [session.artifacts.length]);

  const handleStartRound = async () => {
    setIsStartingRound(true);
    try {
      const res = await fetch(`/api/sessions/${session.id}/rounds`, { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error({ message: "Couldn't start round", description: body.error ?? `Server returned ${res.status}` });
      }
    } catch (err) {
      toast.error({
        message: "Couldn't start round",
        description: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setIsStartingRound(false);
    }
  };

  const handleEndSession = async () => {
    if (!window.confirm("End this session? This cannot be undone.")) return;
    await fetch(`/api/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
  };

  const handleExportFromResults = async () => {
    const res = await fetch(`/api/sessions/${session.id}/export`);
    if (!res.ok) {
      toast.error({ message: "Export failed", description: `Server returned ${res.status}` });
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `session-${session.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Determine if start round button should be disabled
  const startRoundDisabled =
    isStartingRound ||
    session.status !== "active" ||
    (session.currentStage !== null && session.currentStage !== "awaiting-intervention");

  // Workspace-scoped shortcuts. `?` and the `g _` chords are wired globally
  // from the root layout / AppHeader.
  useKeyboardShortcuts({
    "start-round": () => {
      if (!startRoundDisabled) handleStartRound();
    },
    export: () => exportMenuRef.current?.open(),
  });

  return (
    <div className="min-h-screen h-screen flex flex-col bg-gray-950">
      {/* Header */}
      <header
        className={`
          relative border-b border-gray-800 px-4 py-3 shrink-0
          ${isActiveRound ? "border-b-transparent" : ""}
        `}
      >
        {/* Active round animated gradient border */}
        {isActiveRound && (
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-blue-500 via-violet-500 to-blue-500 bg-[length:200%_100%] animate-[gradient-shift_3s_ease_infinite]" />
        )}

        <div className="flex items-center justify-between">
          {/* Left: Breadcrumb + Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-1 text-gray-400 hover:text-gray-200 text-sm shrink-0 transition-colors"
            >
              <ArrowLeft size={14} />
              <span className="hidden sm:inline">All Sessions</span>
            </button>
            <div className="w-px h-5 bg-gray-700" />
            <h1 className="text-sm font-medium text-gray-200 truncate max-w-[140px] sm:max-w-xs lg:max-w-md">
              {session.problemDescription.slice(0, 80)}
              {session.problemDescription.length > 80 ? "..." : ""}
            </h1>
          </div>

          {/* Center: Status Badge */}
          <div className="hidden md:flex items-center gap-3">
            <SessionStatusBadge status={session.status} />
            {session.currentRound > 0 && (
              <span className="text-xs text-gray-500 font-mono">
                Round {session.currentRound}
              </span>
            )}
          </div>

          {/* Right: Token mini bar + actions */}
          <div className="flex items-center gap-3">
            {githubRepo && (
              <div className="hidden md:block">
                <GitHubGroundingIndicator repo={githubRepo} events={events} />
              </div>
            )}
            <div className="hidden lg:block w-36">
              <TokenBudgetBar
                used={totalTokens}
                total={budgetCeiling}
                estimatedCost={session.tokenUsage.estimatedCostUsd}
                onEditBudget={() => setShowBudgetDialog(true)}
              />
            </div>
            {session.status === "completed" && (
              <Link
                href={`/sessions/${session.id}/replay`}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                title="Replay this session"
              >
                <History size={12} />
                <span>Replay</span>
              </Link>
            )}
            <ExportMenu ref={exportMenuRef} sessionId={session.id} session={session} />
            <button
              onClick={handleEndSession}
              disabled={session.status === "completed"}
              className="px-3 py-1.5 text-xs bg-red-950/50 border border-red-800/50 rounded-lg text-red-400 hover:bg-red-900/50 hover:text-red-300 transition-colors disabled:opacity-50"
            >
              <span className="sm:hidden">End</span>
              <span className="hidden sm:inline">End Session</span>
            </button>
          </div>
        </div>
      </header>

      {/* Live event subscriptions — toasts fire on each stage transition. */}
      <StageTransitionToast transitions={stageTransitions} />

      {/* Stage Progress Bar with optional ETA chip */}
      <div className="relative">
        <StageProgressBar
          currentStage={session.currentStage}
          completedStages={completedStages}
        />
        {isActiveRound && (
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
            <RoundEtaIndicator
              events={events}
              currentRound={session.currentRound}
              currentStage={session.currentStage}
            />
          </div>
        )}
      </div>

      {/* Mobile: GitHub grounding chip + replay link beneath the stage bar */}
      {(githubRepo || session.status === "completed") && (
        <div className="md:hidden border-b border-gray-800 bg-gray-950/40 px-3 py-2 flex items-center gap-2 overflow-x-auto">
          {githubRepo && <GitHubGroundingIndicator repo={githubRepo} events={events} />}
          {session.status === "completed" && (
            <Link
              href={`/sessions/${session.id}/replay`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs bg-gray-800 border border-gray-700 rounded-md text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              <History size={12} />
              Replay
            </Link>
          )}
        </div>
      )}

      {/* Notification Banner for Awaiting Intervention */}
      <AnimatePresence>
        {isAwaitingIntervention && !hasPendingClarification && (
          <div className="px-4 pt-3 shrink-0">
            <NotificationBanner
              type="warning"
              message="Round complete! Review the artifacts and start the next round, or add constraints."
              action={{ label: "Start Next Round", onClick: handleStartRound }}
              dismissible
            />
          </div>
        )}
      </AnimatePresence>

      {/* Budget edit dialog */}
      <BudgetEditDialog
        open={showBudgetDialog}
        sessionId={session.id}
        currentBudget={session.tokenBudget ?? null}
        currentUsed={totalTokens}
        onClose={() => setShowBudgetDialog(false)}
        onSaved={() => mutate?.()}
      />

      {/* Main Body: responsive — desktop 2-col, mobile single column */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Column: Agent Arena — desktop only */}
        <aside className="hidden md:flex md:w-[35%] lg:w-[30%] xl:w-[28%] border-r border-gray-800 overflow-hidden flex-col shrink-0">
          <AgentArena
            agents={session.agents}
            currentStage={session.currentStage}
            activeAgentId={undefined}
            lastEventByAgent={lastEventByAgent}
          />
        </aside>

        {/* Right Column: Main Content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Mobile-only horizontal agent strip */}
          {!isEmptyState && (
            <div className="md:hidden">
              <AgentStrip
                agents={session.agents}
                currentStage={session.currentStage}
                activeAgentId={undefined}
                lastEventByAgent={lastEventByAgent}
              />
            </div>
          )}

          {/* Empty State */}
          {isEmptyState ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="text-center max-w-md"
              >
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto mb-6">
                  <Play size={28} className="text-blue-400 ml-1" />
                </div>
                <h2 className="text-xl font-semibold text-gray-100 mb-2">
                  Your AI engineering team is ready
                </h2>
                <p className="text-sm text-gray-400 mb-2 leading-relaxed">
                  {session.problemDescription}
                </p>
                <p className="text-xs text-gray-500 mb-6">
                  Click &quot;Start First Round&quot; to begin the structured debate. Each round goes through 4 stages: Proposal, Critique, Revision, and Consensus.
                </p>
                <button
                  onClick={handleStartRound}
                  disabled={startRoundDisabled}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-medium rounded-lg transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20"
                >
                  Start First Round
                  <ArrowRight size={16} />
                </button>
              </motion.div>
            </div>
          ) : (
            <>
              {/* Tabs — desktop top tabs only */}
              <div className="hidden md:block">
                <WorkspaceTabs
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  tabs={tabs}
                />
              </div>

              {/* Tab Content */}
              <div className="flex-1 min-h-0 overflow-hidden">
                {activeTab === "debate" && (
                  <DebateChat
                    sessionId={session.id}
                    currentRound={session.currentRound}
                    currentStage={session.currentStage}
                  />
                )}

                {activeTab === "artifacts" && (
                  <div className="h-full overflow-y-auto px-4 py-4">
                    {/* Clarification panel takes priority when an agent is blocked on a question. */}
                    {hasPendingClarification && (
                      <div className="mb-4">
                        <ClarificationPanel
                          sessionId={session.id}
                          events={events}
                          currentRound={session.currentRound}
                        />
                      </div>
                    )}
                    {/* Intervention Panel appears here when awaiting */}
                    {isAwaitingIntervention && !hasPendingClarification && (
                      <div className="mb-4">
                        <InterventionPanel sessionId={session.id} />
                      </div>
                    )}

                    {/* Filter Bar */}
                    <div className="flex items-center gap-2 mb-4">
                      <select
                        value={artifactTypeFilter}
                        onChange={(e) => setArtifactTypeFilter(e.target.value as ArtifactType | "all")}
                        className="px-2.5 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      >
                        <option value="all">All Types</option>
                        <option value="decision">Decision</option>
                        <option value="risk">Risk</option>
                        <option value="assumption">Assumption</option>
                        <option value="tradeoff">Tradeoff</option>
                        <option value="open-question">Open Question</option>
                        <option value="recommendation">Recommendation</option>
                      </select>
                      <select
                        value={artifactStatusFilter}
                        onChange={(e) => setArtifactStatusFilter(e.target.value as ArtifactStatus | "all")}
                        className="px-2.5 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      >
                        <option value="all">All Status</option>
                        <option value="draft">Draft</option>
                        <option value="accepted">Accepted</option>
                        <option value="rejected">Rejected</option>
                      </select>
                      {(artifactTypeFilter !== "all" || artifactStatusFilter !== "all") && (
                        <button
                          onClick={() => {
                            setArtifactTypeFilter("all");
                            setArtifactStatusFilter("all");
                          }}
                          className="px-2.5 py-1.5 text-xs bg-blue-900/40 border border-blue-700/50 rounded-lg text-blue-300 hover:bg-blue-900/60 hover:text-blue-200 transition-colors"
                        >
                          Show All
                        </button>
                      )}
                      <span className="ml-auto text-xs text-gray-500">
                        {filteredArtifacts.length} artifact{filteredArtifacts.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* Artifact Grid */}
                    {filteredArtifacts.length > 0 ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {filteredArtifacts.map((artifact) => (
                          <ArtifactCard
                            key={artifact.id}
                            artifact={artifact}
                            sessionId={session.id}
                            onStatusChange={mutate}
                          />
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        icon={FileText}
                        title="No artifacts yet"
                        description="Decisions, risks, assumptions, and tradeoffs will appear here as agents produce them."
                      />
                    )}
                  </div>
                )}

                {activeTab === "results" && (
                  <ResultsDashboard
                    session={session}
                    onExport={handleExportFromResults}
                  />
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      {!isEmptyState && (
        <div className="md:hidden shrink-0">
          <MobileTabBar
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>
      )}

      {/* Mobile FAB for Start Next Round (above the tab bar) */}
      {!isEmptyState && !startRoundDisabled && (
        <button
          onClick={handleStartRound}
          aria-label={isStartingRound ? "Starting round" : "Start next round"}
          className={`md:hidden fixed right-4 bottom-[68px] z-30 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:from-blue-500 hover:to-violet-500 ${
            isAwaitingIntervention ? "animate-pulse" : ""
          }`}
        >
          {isStartingRound ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Play size={16} />
          )}
          {isStartingRound ? "Starting" : "Start Round"}
        </button>
      )}

      {/* Footer — desktop only */}
      <footer className="hidden md:block border-t border-gray-800 px-4 py-3 shrink-0">
        <div className="flex items-center justify-between">
          {/* Left: Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleStartRound}
              disabled={startRoundDisabled}
              className={`
                inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg transition-all
                ${isActiveRound
                  ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                  : isAwaitingIntervention && !startRoundDisabled
                    ? "bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white shadow-lg shadow-blue-500/20 animate-pulse"
                    : "bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white shadow-lg shadow-blue-500/20"
                }
                disabled:opacity-50 disabled:shadow-none
              `}
            >
              {isStartingRound ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Starting...
                </>
              ) : isActiveRound ? (
                "Round in progress..."
              ) : (
                <>
                  <Play size={14} />
                  Start Next Round
                </>
              )}
            </button>
          </div>

          {/* Center: Round counter mini circles */}
          {session.currentRound > 0 && (
            <div className="hidden md:flex items-center gap-1.5">
              {Array.from({ length: session.currentRound }, (_, i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-blue-500"
                  title={`Round ${i + 1}`}
                />
              ))}
              {session.status === "active" && (
                <div className="w-2 h-2 rounded-full border border-gray-600" title="Next round" />
              )}
            </div>
          )}

          {/* Right: Token Budget */}
          <div className="w-44 hidden md:block">
            <TokenBudgetBar
              used={totalTokens}
              total={budgetCeiling}
              estimatedCost={session.tokenUsage.estimatedCostUsd}
              onEditBudget={() => setShowBudgetDialog(true)}
            />
          </div>
        </div>
      </footer>
    </div>
  );
}
