"use client";

import { useState } from "react";
import {
  Download,
  Copy,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Lightbulb,
  ShieldAlert,
  RotateCcw,
  Plus,
  FileText,
  ExternalLink,
} from "lucide-react";
import { extractFileLink } from "@/lib/github-file-link";
import type { SessionState, SessionConfig, AgentType, Severity, ArtifactState } from "@/types/domain";
import Skeleton from "@/components/ui/Skeleton";
import { toast } from "@/hooks/useToast";

interface ResultsDashboardProps {
  session: SessionState;
  config?: SessionConfig;
  demotedArtifacts?: ArtifactState[];
  onExport?: () => void;
  loading?: boolean;
}

export function ResultsDashboardSkeleton() {
  return (
    <div className="h-full overflow-y-auto px-4 py-5 space-y-5 sm:px-6 sm:py-6 sm:space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-7 w-48 rounded" />
        <Skeleton className="h-4 w-72 rounded" />
      </div>
      <Skeleton className="h-32 w-full rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-36 rounded" />
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    </div>
  );
}

const severityTextColors: Record<Severity, string> = {
  high: "text-red-400",
  medium: "text-amber-400",
  low: "text-green-400",
};

const severityBgColors: Record<Severity, string> = {
  high: "border-red-500/30 bg-red-500/10",
  medium: "border-amber-500/30 bg-amber-500/10",
  low: "border-green-500/30 bg-green-500/10",
};

const agentLabels: Record<AgentType, string> = {
  "senior-engineer": "Senior Engineer",
  "security-engineer": "Security",
  "performance-engineer": "Performance",
  "product-engineer": "Product",
};

const severityLabels: Record<Severity, string> = {
  high: "Critical",
  medium: "Medium",
  low: "Low",
};

export function formatConfidence(confidence: number): number {
  if (confidence > 1) return Math.round(confidence);
  return Math.round(confidence * 100);
}

export function deriveVerdict(
  score: number,
  risks: { severity: Severity }[] = []
): { label: string; color: string; icon: typeof CheckCircle2 } {
  const highRiskCount = risks.filter((r) => r.severity === "high").length;
  const mediumRiskCount = risks.filter((r) => r.severity === "medium").length;

  if (highRiskCount > 0) {
    return { label: "Fix before shipping", color: "text-red-400", icon: AlertTriangle };
  }
  if (mediumRiskCount >= 3) {
    return { label: "Fix before shipping", color: "text-amber-400", icon: AlertTriangle };
  }
  if (score >= 80) return { label: "Ready to ship", color: "text-green-400", icon: CheckCircle2 };
  if (score >= 60) return { label: "Needs attention", color: "text-amber-400", icon: AlertTriangle };
  return { label: "Needs significant work", color: "text-red-400", icon: XCircle };
}

function ScoreRing({ score, size = 64 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (s: number) => {
    if (s >= 80) return "#22C55E";
    if (s >= 60) return "#F59E0B";
    return "#EF4444";
  };

  const getTextColor = (s: number) => {
    if (s >= 80) return "text-green-400";
    if (s >= 60) return "text-amber-400";
    return "text-red-400";
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border)" strokeWidth="5" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={getColor(score)} strokeWidth="5" strokeDasharray={`${circumference}`} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-sm font-bold font-mono ${getTextColor(score)}`}>{score}</span>
      </div>
    </div>
  );
}

export default function ResultsDashboard({
  session,
  config,
  demotedArtifacts = [],
  onExport,
  loading = false,
}: ResultsDashboardProps) {
  const consensus = session.consensus;
  const [showAllDecisions, setShowAllDecisions] = useState(false);
  const [showAllRisks, setShowAllRisks] = useState(false);
  const [showAllAgreements, setShowAllAgreements] = useState(false);
  const [showDemoted, setShowDemoted] = useState(false);

  if (loading) return <ResultsDashboardSkeleton />;

  // ─── Pre-consensus state ─────────────────────────────────────────────────────
  if (!consensus) {
    const hasArtifacts = session.artifacts.length > 0;
    const acceptedArtifacts = session.artifacts.filter((a) => a.status === "accepted");
    const draftArtifacts = session.artifacts.filter((a) => a.status === "draft");

    return (
      <div className="h-full overflow-y-auto px-4 py-5 space-y-5 sm:px-6 sm:py-6 sm:space-y-6">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Review Report</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
            {session.problemDescription}
          </p>
        </div>

        {session.constraints.length > 0 && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3">
            <h3 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">Instructions</h3>
            <ul className="space-y-1.5">
              {session.constraints.map((c, i) => (
                <li key={i} className="text-sm text-[var(--text-primary)] flex items-start gap-2">
                  <span className="text-[var(--brand-violet)] mt-0.5 shrink-0 font-mono text-xs">-</span>
                  <span>{c.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {hasArtifacts && (
          <div>
            <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">Findings so far</h3>
            <div className="space-y-2">
              {[...acceptedArtifacts, ...draftArtifacts].slice(0, 5).map((a) => (
                <div key={a.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[var(--text-muted)] uppercase">{a.type === "decision" ? "finding" : a.type}</span>
                    {a.status === "accepted" && <span className="text-[10px] text-green-400 font-mono">accepted</span>}
                  </div>
                  <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">{a.title}</p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)] line-clamp-2">{a.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {!hasArtifacts && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-6 text-center">
            <div className="mx-auto mb-3 w-10 h-10 rounded-full bg-[var(--violet-soft-bg)] flex items-center justify-center">
              <ShieldAlert size={20} className="text-[var(--brand-violet)]" />
            </div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Analyzing repository...</p>
            <p className="mt-1.5 text-xs text-[var(--text-muted)]">Findings will appear here after the review completes.</p>
          </div>
        )}
      </div>
    );
  }

  // ─── Main report: consensus available ────────────────────────────────────────
  const score = formatConfidence(consensus.overallConfidence || 0);

  const agreements = consensus.agreements || [];
  const disagreements = consensus.disagreements || [];
  const totalPoints = agreements.length + disagreements.length;

  const risks = [...(consensus.identifiedRisks || [])];
  const severityOrder: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
  risks.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const verdict = deriveVerdict(score, risks);
  const VerdictIcon = verdict.icon;

  const decisions = [...(consensus.recommendedDecisions || [])].sort((a, b) => b.confidence - a.confidence);
  const openQuestions = consensus.openQuestions || [];

  const highRisks = risks.filter((r) => r.severity === "high");
  const mediumRisks = risks.filter((r) => r.severity === "medium");
  const lowRisks = risks.filter((r) => r.severity === "low");

  const visibleLimit = 5;
  const cappedRisks = showAllRisks ? risks : risks.slice(0, visibleLimit);
  const cappedDecisions = showAllDecisions ? decisions : decisions.slice(0, visibleLimit);
  const cappedAgreements = showAllAgreements ? agreements : agreements.slice(0, 3);

  const handleCopyFixPlan = () => {
    const lines = decisions.map((d, i) => `${i + 1}. ${d.title}${d.description ? `\n   ${d.description}` : ""}`);
    const plan = `# Fix Plan\n\n${lines.join("\n\n")}`;
    navigator.clipboard.writeText(plan);
    toast.success({ message: "Fix plan copied to clipboard" });
  };

  return (
    <div className="h-full overflow-y-auto px-4 py-5 space-y-5 sm:px-6 sm:py-6 sm:space-y-6">
      {/* ─── Top Summary Card ─────────────────────────────────────────────── */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <VerdictIcon size={18} className={verdict.color} />
              <span className={`text-sm font-semibold ${verdict.color}`}>{verdict.label}</span>
            </div>
            <h2 className="text-lg font-bold text-[var(--text-primary)] sm:text-xl">Review Complete</h2>
            {config?.githubRepo && (
              <p className="mt-1 text-xs text-[var(--text-muted)] font-mono">
                {config.githubRepo.owner}/{config.githubRepo.repo}
                {config.githubRepo.branch ? ` (${config.githubRepo.branch})` : ""}
              </p>
            )}
          </div>
          <ScoreRing score={score} />
        </div>

        {/* Stats row */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 pt-3 border-t border-[var(--border)]">
          <div className="text-center">
            <p className="text-xs text-[var(--text-muted)]">Findings</p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{risks.length + decisions.length}</p>
          </div>
          <div className="h-6 w-px bg-[var(--border)] hidden sm:block" />
          {highRisks.length > 0 && (
            <div className="text-center">
              <p className="text-xs text-[var(--text-muted)]">Critical</p>
              <p className="text-sm font-semibold text-red-400">{highRisks.length}</p>
            </div>
          )}
          {mediumRisks.length > 0 && (
            <>
              <div className="h-6 w-px bg-[var(--border)] hidden sm:block" />
              <div className="text-center">
                <p className="text-xs text-[var(--text-muted)]">Medium</p>
                <p className="text-sm font-semibold text-amber-400">{mediumRisks.length}</p>
              </div>
            </>
          )}
          {lowRisks.length > 0 && (
            <>
              <div className="h-6 w-px bg-[var(--border)] hidden sm:block" />
              <div className="text-center">
                <p className="text-xs text-[var(--text-muted)]">Low</p>
                <p className="text-sm font-semibold text-green-400">{lowRisks.length}</p>
              </div>
            </>
          )}
          <div className="h-6 w-px bg-[var(--border)] hidden sm:block" />
          <div className="text-center">
            <p className="text-xs text-[var(--text-muted)]">Fixes</p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{decisions.length}</p>
          </div>
        </div>
      </div>

      {/* ─── Risks Found ──────────────────────────────────────────────────── */}
      {risks.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert size={16} className="text-[var(--text-secondary)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Risks Found</h3>
            {highRisks.length > 0 && (
              <span className="ml-auto text-xs font-mono text-red-400">{highRisks.length} critical</span>
            )}
          </div>

          <div className="space-y-2">
            {cappedRisks.map((risk, i) => (
              <div key={i} className={`rounded-lg border px-4 py-3 ${severityBgColors[risk.severity]}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <AlertTriangle size={12} className={severityTextColors[risk.severity]} />
                  <span className={`text-xs font-medium ${severityTextColors[risk.severity]}`}>
                    {severityLabels[risk.severity]}
                  </span>
                  <span className="text-[var(--text-muted)] text-xs">
                    {risk.raisedBy.map((a) => agentLabels[a]).join(", ")}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-primary)] leading-relaxed">{risk.description}</p>
                {(() => {
                  const link = extractFileLink(risk.description, config?.githubRepo);
                  if (!link?.url) return null;
                  return (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 inline-flex items-center gap-1 font-mono text-xs text-[var(--brand-violet)] hover:text-[var(--violet-hover)] transition-colors"
                    >
                      <FileText size={10} className="opacity-60" />
                      {link.display}
                      <ExternalLink size={9} className="opacity-60" />
                    </a>
                  );
                })()}
              </div>
            ))}
          </div>

          {risks.length > visibleLimit && (
            <button
              onClick={() => setShowAllRisks(!showAllRisks)}
              className="mt-2 flex items-center gap-1 text-xs text-[var(--brand-violet)] hover:text-[var(--violet-hover)] transition-colors"
            >
              {showAllRisks ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {showAllRisks ? "Show less" : `Show all ${risks.length} risks`}
            </button>
          )}
        </section>
      )}

      {/* ─── Suggested Fixes ──────────────────────────────────────────────── */}
      {decisions.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={16} className="text-[var(--text-secondary)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Suggested Fixes</h3>
          </div>

          <div className="space-y-2">
            {cappedDecisions.map((decision, i) => (
              <div key={i} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="text-xs font-mono text-[var(--text-muted)] mt-0.5 shrink-0">{i + 1}.</span>
                    <h4 className="text-sm font-medium text-[var(--text-primary)]">{decision.title}</h4>
                  </div>
                  <span className="text-xs font-mono text-[var(--text-secondary)] shrink-0">{formatConfidence(decision.confidence)}%</span>
                </div>
                {decision.description && (
                  <p className="mt-1.5 pl-5 text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-3">{decision.description}</p>
                )}
              </div>
            ))}
          </div>

          {decisions.length > visibleLimit && (
            <button
              onClick={() => setShowAllDecisions(!showAllDecisions)}
              className="mt-2 flex items-center gap-1 text-xs text-[var(--brand-violet)] hover:text-[var(--violet-hover)] transition-colors"
            >
              {showAllDecisions ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {showAllDecisions ? "Show less" : `Show all ${decisions.length} fixes`}
            </button>
          )}
        </section>
      )}

      {/* ─── Questions to Resolve ─────────────────────────────────────────── */}
      {openQuestions.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <HelpCircle size={16} className="text-[var(--text-secondary)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Questions to Resolve</h3>
          </div>
          <div className="space-y-1.5">
            {openQuestions.map((question, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5">
                <span className="text-[var(--code-blue)] shrink-0 mt-0.5 text-xs font-mono">?</span>
                <p className="text-sm text-[var(--text-primary)]">{question}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── Confidence / Agreement ───────────────────────────────────────── */}
      {agreements.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={16} className="text-[var(--text-secondary)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Review Confidence</h3>
            <span className="ml-auto text-xs font-mono text-[var(--text-muted)]">{agreements.length}/{totalPoints} points</span>
          </div>
          <div className="space-y-1.5">
            {cappedAgreements.map((agreement, i) => (
              <div key={i} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5">
                <p className="text-sm text-[var(--text-primary)]">{agreement.point}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Supported by {agreement.supportingAgents.map((a) => agentLabels[a]).join(", ")}
                </p>
              </div>
            ))}
          </div>
          {agreements.length > 3 && (
            <button
              onClick={() => setShowAllAgreements(!showAllAgreements)}
              className="mt-2 flex items-center gap-1 text-xs text-[var(--brand-violet)] hover:text-[var(--violet-hover)] transition-colors"
            >
              {showAllAgreements ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {showAllAgreements ? "Show less" : `Show all ${agreements.length}`}
            </button>
          )}
        </section>
      )}

      {/* ─── Demoted Findings (lower confidence) ─────────────────────────── */}
      {demotedArtifacts.length > 0 && (
        <section>
          <button
            onClick={() => setShowDemoted(!showDemoted)}
            className="flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            {showDemoted ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {showDemoted ? "Hide" : "Show"} {demotedArtifacts.length} lower-confidence finding{demotedArtifacts.length > 1 ? "s" : ""}
          </button>
          {showDemoted && (
            <div className="mt-2 space-y-1.5">
              {demotedArtifacts.map((a, i) => (
                <div key={i} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 opacity-70">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-[var(--text-muted)] uppercase">{a.type}</span>
                  </div>
                  <p className="text-sm text-[var(--text-primary)]">{a.title}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)] line-clamp-2">{a.content}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ─── Actions ──────────────────────────────────────────────────────── */}
      <div className="pt-3 border-t border-[var(--border)] flex flex-col sm:flex-row gap-2">
        {decisions.length > 0 && (
          <button
            onClick={handleCopyFixPlan}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] transition-colors flex-1"
          >
            <Copy size={14} />
            Copy fix plan
          </button>
        )}
        {onExport && (
          <button
            onClick={onExport}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--brand-violet)] text-sm font-medium text-white hover:bg-[var(--violet-hover)] transition-colors flex-1 focus:outline-none focus:ring-2 focus:ring-[var(--violet-glow)]"
          >
            <Download size={14} />
            Export Markdown
          </button>
        )}
      </div>
    </div>
  );
}
