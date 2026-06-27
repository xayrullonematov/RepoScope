"use client";

import type { ConsensusOutput, AgentType } from "@/types/domain";

interface ConsensusDashboardProps {
  consensus: ConsensusOutput | null;
}

const agentLabels: Record<AgentType, string> = {
  "senior-engineer": "Senior Engineer",
  "security-engineer": "Security",
  "performance-engineer": "Performance",
  "product-engineer": "Product",
};

function formatAgent(id: string): string {
  return agentLabels[id as AgentType] ?? id;
}

export default function ConsensusDashboard({ consensus }: ConsensusDashboardProps) {
  if (!consensus) {
    return (
      <div className="p-4 border border-[var(--border)] rounded-lg bg-[var(--surface)]">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
          Review Summary
        </h2>
        <p className="text-sm text-[var(--text-muted)]">
          Summary not yet available. Run the analysis to see results.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
        Review Summary
      </h2>

      {consensus.agreements.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-green-400 mb-2">
            Agreements ({consensus.agreements.length})
          </h3>
          <div className="space-y-2">
            {consensus.agreements.map((a, i) => (
              <div key={i} className="p-3 border border-green-500/30 rounded-lg bg-green-500/5">
                <p className="text-sm text-[var(--text-primary)]">{a.point}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">{a.reasoning}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Supported by: {a.supportingAgents.map(formatAgent).join(", ")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {consensus.disagreements.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-red-400 mb-2">
            Disagreements ({consensus.disagreements.length})
          </h3>
          <div className="space-y-2">
            {consensus.disagreements.map((d, i) => (
              <div key={i} className="p-3 border border-red-500/30 rounded-lg bg-red-500/5">
                <p className="text-sm text-[var(--text-primary)]">{d.point}</p>
                <div className="mt-2 space-y-1">
                  {d.positions.map((p, j) => (
                    <p key={j} className="text-xs text-[var(--text-muted)]">
                      <span className="text-[var(--text-secondary)] font-medium">{formatAgent(p.agentId)}:</span>{" "}
                      {p.stance} — {p.reasoning}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {consensus.recommendedDecisions.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-violet-400 mb-2">
            Recommended Fixes
          </h3>
          <ol className="space-y-2 list-decimal list-inside">
            {consensus.recommendedDecisions.map((d, i) => (
              <li key={i} className="text-sm text-[var(--text-primary)]">
                <span className="font-medium">{d.title}</span>
                <span className="text-[var(--text-muted)]"> — {d.description}</span>
                <span className="text-xs text-[var(--text-muted)] ml-1">
                  ({Math.round(d.confidence * 100)}% confidence)
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
