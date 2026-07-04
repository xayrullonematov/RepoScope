"use client";

import { use, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ArrowRight,
  Loader2,
  ShieldAlert,
  ExternalLink,
  FileText,
} from "lucide-react";
import { extractFileLink } from "@/lib/github-file-link";
import type { Severity } from "@/types/domain";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface SummaryData {
  session: {
    problemDescription: string;
    status: string;
    currentRound: number;
    totalTokens: number;
    estimatedCostUsd: number;
  };
  consensus: {
    overallConfidence: number;
    identifiedRisks: { description: string; severity: Severity; raisedBy: string[] }[];
    recommendedDecisions: { title: string; description: string; confidence: number }[];
    openQuestions: string[];
  } | null;
  artifacts: Record<string, { title: string; content: string; type: string }[]>;
  summary: { artifactCount: number };
}

function deriveVerdict(score: number, highRisks: number) {
  if (highRisks > 0) return { label: "Fix before shipping", color: "text-red-400", Icon: AlertTriangle };
  if (score >= 80) return { label: "Ready to ship", color: "text-green-400", Icon: CheckCircle2 };
  if (score >= 60) return { label: "Needs attention", color: "text-amber-400", Icon: AlertTriangle };
  return { label: "Needs significant work", color: "text-red-400", Icon: XCircle };
}

export default function SummaryPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const { data, isLoading } = useSWR<SummaryData>(`/api/sessions/${sessionId}/results`, fetcher, {
    refreshInterval: (latestData) => {
      if (latestData?.consensus) return 0;
      return 3000;
    },
  });
  const [copied, setCopied] = useState(false);

  if (isLoading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={24} className="text-[var(--brand-violet)] animate-spin" />
      </div>
    );
  }

  const consensus = data.consensus;
  if (!consensus) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <ShieldAlert size={24} className="mx-auto text-[var(--brand-violet)]" />
          <p className="mt-3 text-sm text-[var(--text-muted)]">Analysis still in progress...</p>
          <Link href={`/sessions/${sessionId}`} className="mt-4 inline-flex text-sm text-[var(--brand-violet)] hover:text-[var(--violet-hover)]">
            View live progress →
          </Link>
        </div>
      </div>
    );
  }

  const score = consensus.overallConfidence > 1
    ? Math.round(consensus.overallConfidence)
    : Math.round(consensus.overallConfidence * 100);

  const risks = consensus.identifiedRisks || [];
  const highRisks = risks.filter((r) => r.severity === "high");
  const topRisks = risks.slice(0, 3);
  const decisions = consensus.recommendedDecisions || [];
  const topFixes = decisions.slice(0, 3);
  const verdict = deriveVerdict(score, highRisks.length);

  const handleCopyFixPlan = () => {
    const lines = decisions.map((d, i) => `${i + 1}. ${d.title}${d.description ? ` — ${d.description}` : ""}`);
    navigator.clipboard.writeText(`# Fix Plan\n\n${lines.join("\n")}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Try to extract repo info from the problem description URL or use a heuristic
  const repoInfo = data.session.problemDescription.match(/github\.com\/([^/]+)\/([^/\s]+)/)
    ? { owner: RegExp.$1, repo: RegExp.$2, branch: "main" }
    : null;

  const severityColors: Record<Severity, string> = { high: "text-red-400", medium: "text-amber-400", low: "text-green-400" };
  const severityBg: Record<Severity, string> = { high: "border-red-500/30 bg-red-500/10", medium: "border-amber-500/30 bg-amber-500/10", low: "border-green-500/30 bg-green-500/10" };

  return (
    <main id="main-content" className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg space-y-5">
        {/* Score + Verdict */}
        <div className="text-center">
          <div className="inline-flex items-center gap-3">
            <div className="relative w-16 h-16">
              <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                <circle cx="32" cy="32" r="28" fill="none" stroke="var(--border)" strokeWidth="5" />
                <circle cx="32" cy="32" r="28" fill="none" stroke={score >= 80 ? "#22C55E" : score >= 60 ? "#F59E0B" : "#EF4444"} strokeWidth="5" strokeDasharray={`${2 * Math.PI * 28}`} strokeDashoffset={2 * Math.PI * 28 - (score / 100) * 2 * Math.PI * 28} strokeLinecap="round" />
              </svg>
              <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold font-mono ${score >= 80 ? "text-green-400" : score >= 60 ? "text-amber-400" : "text-red-400"}`}>{score}</span>
            </div>
            <div className="text-left">
              <div className={`flex items-center gap-1.5 ${verdict.color}`}>
                <verdict.Icon size={16} />
                <span className="text-sm font-semibold">{verdict.label}</span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{risks.length} risks · {decisions.length} fixes · Round {data.session.currentRound}</p>
            </div>
          </div>
        </div>

        {/* Top Risks */}
        {topRisks.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Top Issues</h3>
            {topRisks.map((risk, i) => {
              const link = extractFileLink(risk.description, repoInfo);
              return (
                <div key={i} className={`rounded-lg border px-4 py-3 ${severityBg[risk.severity]}`}>
                  <p className="text-sm text-[var(--text-primary)] leading-relaxed">{risk.description}</p>
                  {link?.url && (
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 font-mono text-xs text-[var(--brand-violet)] hover:text-[var(--violet-hover)]">
                      <FileText size={10} className="opacity-60" />
                      {link.display}
                      <ExternalLink size={9} className="opacity-60" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Top Fixes */}
        {topFixes.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Fix First</h3>
            {topFixes.map((fix, i) => (
              <div key={i} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                <div className="flex items-start gap-2">
                  <span className="text-xs font-mono text-[var(--text-muted)] mt-0.5">{i + 1}.</span>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{fix.title}</p>
                    {fix.description && <p className="mt-1 text-xs text-[var(--text-secondary)] line-clamp-2">{fix.description}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-2">
          {decisions.length > 0 && (
            <button
              onClick={handleCopyFixPlan}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] transition-colors"
            >
              {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
              {copied ? "Copied!" : "Copy fix plan"}
            </button>
          )}
          <Link
            href={`/sessions/${sessionId}/results`}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-[var(--brand-violet)] text-sm font-medium text-white hover:bg-[var(--violet-hover)] transition-colors"
          >
            See full report
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </main>
  );
}
