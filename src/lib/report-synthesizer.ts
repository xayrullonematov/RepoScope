/**
 * Report Synthesizer — Transforms raw multi-agent output into a clean,
 * deduplicated, confidence-tagged report with ≤15 main findings.
 */

import type {
  SessionState,
  ConsensusOutput,
  ArtifactState,
  Severity,
  AgentType,
} from "@/types/domain";
import {
  MAX_FINAL_FINDINGS,
  MAX_OPEN_QUESTIONS,
  MAX_ASSUMPTIONS,
} from "@/lib/review-limits";

// =============================================================================
// TYPES
// =============================================================================

export interface SynthesizedFinding {
  title: string;
  description: string;
  severity: Severity;
  confidence: ConfidenceLevel;
  sources: AgentType[];
  fileRef?: string;
}

export type ConfidenceLevel = "Confirmed" | "Likely" | "Needs benchmark";

export interface SynthesizedReport {
  score: number;
  verdict: string;
  criticalFindings: SynthesizedFinding[]; // max 5
  secondaryFindings: SynthesizedFinding[]; // max 10
  openQuestions: string[];
  assumptions: string[];
  fixes: { title: string; description: string; confidence: number }[];
}

// =============================================================================
// MAIN
// =============================================================================

export function synthesizeReport(state: SessionState): SynthesizedReport {
  const consensus = state.consensus;

  const score = consensus
    ? consensus.overallConfidence > 1
      ? Math.round(consensus.overallConfidence)
      : Math.round(consensus.overallConfidence * 100)
    : 0;

  const verdict = deriveVerdictText(score, consensus);

  // Collect all raw findings from consensus risks + artifacts
  const rawFindings = collectRawFindings(state);

  // Deduplicate by theme
  const deduped = deduplicateByTheme(rawFindings);

  // Tag confidence
  const tagged = deduped.map(tagConfidence);

  // Sort by severity then confidence
  const sorted = tagged.sort((a, b) => {
    const sevOrder: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
    const diff = sevOrder[a.severity] - sevOrder[b.severity];
    if (diff !== 0) return diff;
    const confOrder: Record<ConfidenceLevel, number> = { "Confirmed": 0, "Likely": 1, "Needs benchmark": 2 };
    return confOrder[a.confidence] - confOrder[b.confidence];
  });

  // Split into critical (high) and secondary (medium/low), total capped at MAX_FINAL_FINDINGS
  const allCritical = sorted.filter((f) => f.severity === "high");
  const allSecondary = sorted.filter((f) => f.severity !== "high");
  const criticalFindings = allCritical.slice(0, 5);
  const remainingBudget = MAX_FINAL_FINDINGS - criticalFindings.length;
  const secondaryFindings = allSecondary.slice(0, Math.max(0, remainingBudget));

  // Separate open questions and assumptions from artifacts
  const openQuestions = (consensus?.openQuestions || []).slice(0, MAX_OPEN_QUESTIONS);
  const assumptions = state.artifacts
    .filter((a) => a.type === "assumption")
    .map((a) => a.title)
    .slice(0, MAX_ASSUMPTIONS);

  const fixes = (consensus?.recommendedDecisions || []).map((d) => ({
    title: d.title,
    description: d.description,
    confidence: d.confidence > 1 ? d.confidence : Math.round(d.confidence * 100),
  }));

  return { score, verdict, criticalFindings, secondaryFindings, openQuestions, assumptions, fixes };
}

// =============================================================================
// HELPERS
// =============================================================================

interface RawFinding {
  title: string;
  description: string;
  severity: Severity;
  sources: AgentType[];
  fileRef?: string;
  isGrounded: boolean;
  isPerformanceClaim: boolean;
}

function collectRawFindings(state: SessionState): RawFinding[] {
  const findings: RawFinding[] = [];
  const consensus = state.consensus;

  // From consensus.identifiedRisks
  if (consensus?.identifiedRisks) {
    for (const risk of consensus.identifiedRisks) {
      findings.push({
        title: extractTitle(risk.description),
        description: risk.description,
        severity: risk.severity,
        sources: risk.raisedBy,
        fileRef: extractFileRef(risk.description),
        isGrounded: hasFileRef(risk.description),
        isPerformanceClaim: isPerformanceRelated(risk.description),
      });
    }
  }

  // From artifacts (only risks and decisions, not open-questions/assumptions/tradeoffs)
  for (const artifact of state.artifacts) {
    if (artifact.type === "open-question" || artifact.type === "assumption") continue;
    if (artifact.type === "tradeoff") continue;
    findings.push({
      title: artifact.title,
      description: artifact.content,
      severity: guessSeverity(artifact),
      sources: artifact.contributors,
      fileRef: extractFileRef(artifact.content),
      isGrounded: hasFileRef(artifact.content),
      isPerformanceClaim: isPerformanceRelated(artifact.content),
    });
  }

  return findings;
}

function deduplicateByTheme(findings: RawFinding[]): RawFinding[] {
  const themes = new Map<string, RawFinding>();

  for (const f of findings) {
    const key = themeKey(f.title + " " + f.description);
    const existing = themes.get(key);
    if (existing) {
      // Merge: keep higher severity, combine sources
      const merged: RawFinding = {
        ...existing,
        severity: higherSeverity(existing.severity, f.severity),
        sources: [...new Set([...existing.sources, ...f.sources])],
        isGrounded: existing.isGrounded || f.isGrounded,
        fileRef: existing.fileRef || f.fileRef,
        // Keep the longer description
        description: f.description.length > existing.description.length ? f.description : existing.description,
      };
      themes.set(key, merged);
    } else {
      themes.set(key, f);
    }
  }

  return [...themes.values()];
}

/** Produce a theme key by extracting core topic words */
function themeKey(text: string): string {
  const lower = text.toLowerCase();
  // Extract dominant theme tokens
  const keywords = [
    "auth", "authentication", "authorization", "rbac", "middleware",
    "webhook", "stripe", "payment", "billing",
    "rls", "row level security", "supabase",
    "performance", "latency", "cache", "caching", "timeout",
    "sqlite", "database", "db", "concurrent",
    "telemetry", "monitoring", "observability",
    "validation", "zod", "schema",
    "session", "token", "jwt", "cookie",
    "service layer", "refactor", "coupling",
  ];
  const matched = keywords.filter((k) => lower.includes(k));
  if (matched.length > 0) return matched.sort().join("+");
  // Fallback: first 4 significant words
  return lower.replace(/[^a-z0-9 ]/g, "").split(/\s+/).filter((w) => w.length > 3).slice(0, 4).join("+");
}

function higherSeverity(a: Severity, b: Severity): Severity {
  const order: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
  return order[a] <= order[b] ? a : b;
}

function tagConfidence(f: RawFinding): SynthesizedFinding {
  let confidence: ConfidenceLevel;
  if (f.isPerformanceClaim && !f.isGrounded) {
    confidence = "Needs benchmark";
  } else if (f.isGrounded) {
    confidence = "Confirmed";
  } else {
    confidence = "Likely";
  }

  return {
    title: f.title,
    description: f.description,
    severity: f.severity,
    confidence,
    sources: f.sources,
    fileRef: f.fileRef,
  };
}

function extractTitle(description: string): string {
  // Take first sentence or first 80 chars
  const sentence = description.split(/[.!]\s/)[0];
  return sentence.length > 80 ? sentence.slice(0, 77) + "..." : sentence;
}

function extractFileRef(text: string): string | undefined {
  const match = text.match(/(?:`|^|\s)((?:src|lib|app|pages|components|api|config|prisma)\/[\w./-]+)/i);
  return match?.[1];
}

function hasFileRef(text: string): boolean {
  return /(?:src|lib|app|pages|components|api|config|prisma)\/[\w./-]+/i.test(text);
}

function isPerformanceRelated(text: string): boolean {
  return /\b(performance|latency|p99|throughput|bottleneck|timeout|concurrent|cache|slow)\b/i.test(text);
}

function guessSeverity(artifact: ArtifactState): Severity {
  const text = (artifact.title + " " + artifact.content).toLowerCase();
  if (/\b(critical|high.severity|security.vuln|privilege.escalation)\b/.test(text)) return "high";
  if (/\b(medium|moderate|should.fix)\b/.test(text)) return "medium";
  return "low";
}

function deriveVerdictText(score: number, consensus: ConsensusOutput | null): string {
  const highCount = consensus?.identifiedRisks?.filter((r) => r.severity === "high").length || 0;
  if (highCount > 0) return "⛔ Fix before shipping";
  if (score >= 80) return "✅ Ready to ship";
  if (score >= 60) return "⚠️ Needs attention";
  return "❌ Needs significant work";
}
