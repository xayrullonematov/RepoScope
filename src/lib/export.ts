/**
 * Session Export Service
 *
 * Generates a clean, user-facing markdown report (≤15 main findings)
 * with debate artifacts moved to an optional "Technical Activity" appendix.
 */

import { snapshotManager } from "@/lib/snapshot-manager";
import { tokenBudgetManager } from "@/lib/token-budget-manager";
import { synthesizeReport } from "@/lib/report-synthesizer";
import { eventStore } from "@/lib/event-store";
import type {
  SessionState,
  SessionTokenUsage,
  AgentType,
  Severity,
} from "@/types/domain";
import type { SynthesizedFinding, ConfidenceLevel } from "@/lib/report-synthesizer";

const AGENT_NAMES: Record<AgentType, string> = {
  "senior-engineer": "Senior Engineer",
  "security-engineer": "Security",
  "performance-engineer": "Performance",
  "product-engineer": "Product",
};

const SEVERITY_LABELS: Record<Severity, string> = {
  high: "Critical",
  medium: "Medium",
  low: "Low",
};

const CONFIDENCE_EMOJI: Record<ConfidenceLevel, string> = {
  "Confirmed": "✓",
  "Likely": "~",
  "Needs benchmark": "?",
};

// =============================================================================
// MAIN EXPORT
// =============================================================================

export async function generateSessionExport(
  sessionId: string
): Promise<{ markdown: string; filename: string }> {
  const state: SessionState = await snapshotManager.projectFromSnapshot(sessionId);
  const usage: SessionTokenUsage = await tokenBudgetManager.getSessionUsage(sessionId);
  const sessionRow = await (await import("@/lib/db")).prisma.session.findUnique({
    where: { id: sessionId },
    select: { config: true },
  });

  const repoInfo = (() => {
    try {
      const config = JSON.parse(sessionRow?.config ?? "{}");
      return config.githubRepo ?? null;
    } catch { return null; }
  })();

  const report = synthesizeReport(state);
  const title = state.problemDescription.slice(0, 80) || "Untitled Review";
  const totalFindings = report.criticalFindings.length + report.secondaryFindings.length;

  // Detect partial report (budget/time limit hit)
  const events = await eventStore.getSessionEvents(sessionId);
  const partialEvent = events.find((e) => {
    if (e.type !== "round-completed") return false;
    try {
      const c = typeof e.content === "string" ? JSON.parse(e.content) : e.content;
      return c?.partial === true;
    } catch { return false; }
  });
  const isPartial = Boolean(partialEvent);

  const sections: string[] = [];

  // ─── Header ────────────────────────────────────────────────────────────────
  sections.push(`# Repo Review Report`);
  sections.push("");
  if (isPartial) {
    sections.push(`> ⚠️ **Partial report** — generated due to ${partialEvent && typeof partialEvent.content === "object" && (partialEvent.content as Record<string, unknown>)?.reason === "time_limit" ? "time" : "budget"} limit. Findings below reflect analysis completed before the limit was reached.`);
    sections.push("");
  }
  if (repoInfo) {
    sections.push(`**Repository:** ${repoInfo.owner}/${repoInfo.repo}${repoInfo.branch ? ` (${repoInfo.branch})` : ""}`);
    sections.push("");
  }

  // ─── Review Request ────────────────────────────────────────────────────────
  // Property 10 (Export Completeness): the export SHALL contain the problem
  // description and constraints. Emit them verbatim so the report states what
  // was reviewed and under which constraints.
  sections.push(`**Review request:** ${state.problemDescription}`);
  sections.push("");
  if (state.constraints.length > 0) {
    sections.push("**Constraints:**");
    for (const c of state.constraints) {
      sections.push(`- ${c.text}${c.category ? ` _(${c.category})_` : ""}`);
    }
    sections.push("");
  }

  // ─── TL;DR ─────────────────────────────────────────────────────────────────
  const critCount = report.criticalFindings.length;
  const secCount = report.secondaryFindings.length;
  const parts = [`Score: ${report.score}/100`, report.verdict];
  if (critCount > 0) parts.push(`${critCount} critical`);
  if (secCount > 0) parts.push(`${secCount} secondary`);
  parts.push(`${totalFindings} total findings`);
  sections.push(`> **${parts.join(" · ")}**`);
  sections.push("");

  // ─── Quick Fix Plan ────────────────────────────────────────────────────────
  if (report.fixes.length > 0) {
    sections.push("## Quick Fix Plan");
    sections.push("");
    for (let i = 0; i < report.fixes.length; i++) {
      const f = report.fixes[i];
      sections.push(`${i + 1}. **${f.title}** (${f.confidence}% confidence)`);
      if (f.description) sections.push(`   ${f.description}`);
    }
    sections.push("");
  }

  // ─── Critical Findings ─────────────────────────────────────────────────────
  if (report.criticalFindings.length > 0) {
    sections.push("## Critical Findings");
    sections.push("");
    for (const f of report.criticalFindings) {
      sections.push(formatFinding(f));
    }
  }

  // ─── Secondary Findings ────────────────────────────────────────────────────
  if (report.secondaryFindings.length > 0) {
    sections.push("## Secondary Findings");
    sections.push("");
    for (const f of report.secondaryFindings) {
      sections.push(formatFinding(f));
    }
  }

  // ─── Open Questions ────────────────────────────────────────────────────────
  if (report.openQuestions.length > 0) {
    sections.push("## Open Questions");
    sections.push("");
    for (const q of report.openQuestions) {
      sections.push(`- ${q}`);
    }
    sections.push("");
  }

  // ─── Assumptions ───────────────────────────────────────────────────────────
  if (report.assumptions.length > 0) {
    sections.push("## Assumptions");
    sections.push("");
    for (const a of report.assumptions) {
      sections.push(`- ${a}`);
    }
    sections.push("");
  }

  // ─── Cost Summary ──────────────────────────────────────────────────────────
  sections.push("## Cost Summary");
  sections.push("");
  sections.push(`- Input tokens: ${usage.totalInputTokens.toLocaleString()}`);
  sections.push(`- Output tokens: ${usage.totalOutputTokens.toLocaleString()}`);
  sections.push(`- Estimated cost: $${usage.estimatedCostUsd.toFixed(4)}`);
  sections.push("");

  // ─── Technical Activity (Appendix) ─────────────────────────────────────────
  sections.push("---");
  sections.push("");
  sections.push("## Technical Activity");
  sections.push("");
  sections.push("*Internal review process — not part of the main report.*");
  sections.push("");

  // All artifacts (Property 10: export SHALL contain every artifact). The
  // findings above are a synthesized/capped view; this is the complete list.
  if (state.artifacts.length > 0) {
    sections.push("### Artifacts");
    sections.push("");
    for (const a of state.artifacts) {
      sections.push(`- **${a.title}** — ${a.type} (${a.status})`);
    }
    sections.push("");
  }

  // Debate rounds
  if (state.rounds.length > 0) {
    sections.push("### Debate Rounds");
    sections.push("");
    for (const round of state.rounds) {
      sections.push(`**Round ${round.number}**`);
      sections.push("");
      if (round.summary) {
        if (round.summary.keyProposals.length > 0) {
          sections.push("Proposals: " + round.summary.keyProposals.join("; "));
        }
        if (round.summary.majorCritiques.length > 0) {
          sections.push("Critiques: " + round.summary.majorCritiques.join("; "));
        }
        if (round.summary.consensusPoints.length > 0) {
          sections.push("Consensus: " + round.summary.consensusPoints.join("; "));
        }
      }
      sections.push("");
    }
  }

  // Agent agreement
  if (state.consensus) {
    if (state.consensus.agreements.length > 0) {
      sections.push("### Agent Agreement");
      sections.push("");
      for (const a of state.consensus.agreements) {
        const supporters = a.supportingAgents.map((id) => AGENT_NAMES[id] || id).join(", ");
        sections.push(`- ${a.point} *(${supporters})*`);
      }
      sections.push("");
    }

    if (state.consensus.disagreements.length > 0) {
      sections.push("### Disagreements");
      sections.push("");
      for (const d of state.consensus.disagreements) {
        sections.push(`- ${d.point}`);
        for (const p of d.positions) {
          sections.push(`  - ${AGENT_NAMES[p.agentId] || p.agentId} (${p.stance}): ${p.reasoning}`);
        }
      }
      sections.push("");
    }
  }

  // Agent final positions
  const agentsWithPositions = state.agents.filter((a) => a.currentPosition);
  if (agentsWithPositions.length > 0) {
    sections.push("### Agent Final Positions");
    sections.push("");
    for (const agent of agentsWithPositions) {
      const conf = agent.confidence !== null ? `${(agent.confidence * 100).toFixed(0)}%` : "N/A";
      sections.push(`- **${agent.displayName}** [${agent.currentStance || "N/A"}, ${conf}]: ${agent.currentPosition}`);
    }
    sections.push("");
  }

  const markdown = sections.join("\n");
  const sanitizedTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
  const filename = `reposcope-report-${sanitizedTitle}-${new Date().toISOString().split("T")[0]}.md`;

  return { markdown, filename };
}

// =============================================================================
// HELPERS
// =============================================================================

function formatFinding(f: SynthesizedFinding): string {
  const sources = f.sources.map((s) => AGENT_NAMES[s] || s).join(", ");
  const lines: string[] = [];
  lines.push(`### ${f.title}`);
  lines.push("");
  lines.push(`**${SEVERITY_LABELS[f.severity]}** · ${CONFIDENCE_EMOJI[f.confidence]} ${f.confidence}${sources ? ` · ${sources}` : ""}`);
  if (f.fileRef) lines.push(`📄 \`${f.fileRef}\``);
  lines.push("");
  lines.push(f.description);
  lines.push("");
  return lines.join("\n");
}
