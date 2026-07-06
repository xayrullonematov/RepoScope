"use client";

import { useMemo, useState } from "react";
import { ArrowDown, CheckCircle2, GitCommitHorizontal, ShieldAlert } from "lucide-react";
import type { AgentType, PersistedEvent } from "@/types/domain";
import { deriveFindingLineages, type FindingLineageStep, type LineageStage } from "@/lib/finding-lineage";

const agentNames: Record<AgentType, string> = {
  "senior-engineer": "Senior",
  "security-engineer": "Security",
  "performance-engineer": "Performance",
  "product-engineer": "Product",
};

const stageMeta: Record<LineageStage, { label: string; accent: string; dot: string }> = {
  proposal: { label: "Proposal", accent: "text-blue-300", dot: "bg-blue-400" },
  critique: { label: "Opposing critique", accent: "text-red-300", dot: "bg-red-400" },
  revision: { label: "Revision", accent: "text-emerald-300", dot: "bg-emerald-400" },
  consensus: { label: "Consensus", accent: "text-amber-300", dot: "bg-amber-400" },
};

function actorLabel(step: FindingLineageStep) {
  if (step.stage === "consensus") return "Consensus synthesizer";
  const actor = step.agentId ? agentNames[step.agentId] : "Agent";
  if (step.stage === "critique" && step.targetAgentId) {
    return `${actor} → ${agentNames[step.targetAgentId]}`;
  }
  return actor;
}

export default function FindingLineagePanel({ events }: { events: PersistedEvent[] }) {
  const lineages = useMemo(() => deriveFindingLineages(events), [events]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  if (lineages.length === 0) return null;

  const selected = lineages.find((lineage) => lineage.id === selectedId) ?? lineages[0];
  const hasFullDebate = selected.stageCoverage === 3;

  return (
    <section aria-labelledby="finding-lineage-title" className="overflow-hidden rounded-xl border border-violet-500/30 bg-gradient-to-b from-violet-500/[0.08] to-[var(--surface)]">
      <header className="border-b border-[var(--border)] px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <GitCommitHorizontal size={17} className="text-violet-300" />
              <h2 id="finding-lineage-title" className="text-sm font-semibold text-[var(--text-primary)]">How this finding evolved</h2>
              <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-violet-200">Traceable</span>
            </div>
            <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-[var(--text-muted)]">
              Exact event references show how an opposing critique changed the position before consensus.
            </p>
          </div>
          {lineages.length > 1 && (
            <label className="text-xs text-[var(--text-muted)]">
              Finding
              <select
                value={selected.id}
                onChange={(event) => setSelectedId(event.target.value)}
                className="mt-1 block min-h-11 max-w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-xs text-[var(--text-primary)] focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              >
                {lineages.slice(0, 8).map((lineage) => <option key={lineage.id} value={lineage.id}>{lineage.title}</option>)}
              </select>
            </label>
          )}
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-[var(--border)] bg-black/15 px-3 py-3">
          {selected.kind === "agreement" ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-400" /> : <ShieldAlert size={16} className="mt-0.5 shrink-0 text-amber-400" />}
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">{selected.title}</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Round {selected.round} · {hasFullDebate ? "All debate stages linked" : `${selected.stageCoverage} debate stages linked`}</p>
          </div>
        </div>
      </header>

      <ol className="grid gap-0 p-4 sm:grid-cols-4 sm:p-5">
        {selected.steps.map((step, index) => {
          const meta = stageMeta[step.stage];
          return (
            <li key={`${selected.id}:${step.eventId}`} className="relative min-w-0 pb-5 pl-8 last:pb-0 sm:pb-0 sm:pl-0 sm:pr-4 last:sm:pr-0">
              <div className="absolute left-[7px] top-3 h-full w-px bg-[var(--border)] last:hidden sm:left-3 sm:top-[7px] sm:h-px sm:w-full" />
              <div className={`absolute left-0 top-1.5 z-10 h-4 w-4 rounded-full border-4 border-[var(--surface)] ${meta.dot} sm:left-1 sm:top-0`} />
              <article className="sm:pt-7">
                <p className={`text-[10px] font-semibold uppercase tracking-wider ${meta.accent}`}>{meta.label}</p>
                <p className="mt-1 text-xs font-medium text-[var(--text-secondary)]">{actorLabel(step)}</p>
                {step.stance && <span className="mt-1 inline-flex rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">{step.stance}</span>}
                <p className="mt-2 text-xs leading-relaxed text-[var(--text-primary)]">{step.summary}</p>
                {step.detail && step.detail !== step.summary && <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-[var(--text-muted)]">{step.detail}</p>}
                <p className="mt-2 font-mono text-[9px] text-[var(--text-muted)]" title={step.eventId}>event {step.eventId.slice(-8)}</p>
              </article>
              {index < selected.steps.length - 1 && <ArrowDown size={13} className="absolute bottom-1 left-[1px] text-[var(--text-muted)] sm:hidden" />}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
