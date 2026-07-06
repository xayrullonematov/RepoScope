import type { Severity } from "@/types/domain";

export interface GroundTruthIssue {
  id: string;
  title: string;
  category: "architecture" | "security" | "performance" | "product";
  severity: Severity;
  paths: string[];
  keywords: string[];
}

export interface BenchmarkManifest {
  name: string;
  repository: string;
  ref: string;
  problem: string;
  issues: GroundTruthIssue[];
}

export interface BenchmarkFinding {
  id: string;
  title: string;
  description: string;
  severity?: Severity;
  verified?: boolean;
  verificationConfidence?: number;
}

export interface FindingMatch {
  findingId: string;
  issueId: string | null;
  score: number;
  matchedPath: string | null;
  keywordCoverage: number;
}

export interface ArmMetrics {
  findingCount: number;
  matchedFindingCount: number;
  matchedIssueCount: number;
  precision: number;
  recall: number;
  evidenceSupportRate: number;
  verificationRate: number;
  severityAccuracy: number;
  unsupportedFindingRate: number;
  matches: FindingMatch[];
}

const STOP_WORDS = new Set([
  "about", "after", "again", "against", "could", "from", "have", "into", "should", "that", "their", "there", "these", "this", "through", "using", "with", "without",
]);

function tokens(text: string): Set<string> {
  return new Set(
    text.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length >= 4 && !STOP_WORDS.has(token)),
  );
}

function round(value: number): number {
  return Number(value.toFixed(4));
}

function rate(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : round(numerator / denominator);
}

function matchFinding(
  finding: BenchmarkFinding,
  issue: GroundTruthIssue,
  repoPaths: Set<string>,
): Omit<FindingMatch, "findingId" | "issueId"> {
  const text = `${finding.title}\n${finding.description}`;
  const normalized = text.toLowerCase();
  const matchedPath = issue.paths.find((path) => normalized.includes(path.toLowerCase()) && repoPaths.has(path)) ?? null;
  const findingTokens = tokens(text);
  const expectedTokens = tokens(`${issue.title} ${issue.keywords.join(" ")}`);
  const keywordHits = [...expectedTokens].filter((token) => findingTokens.has(token)).length;
  const keywordCoverage = rate(keywordHits, expectedTokens.size);
  const score = round((matchedPath ? 0.65 : 0) + keywordCoverage * 0.35);
  return { score, matchedPath, keywordCoverage };
}

export function evaluateArm(
  findings: BenchmarkFinding[],
  manifest: BenchmarkManifest,
  repoPaths: string[],
): ArmMetrics {
  const pathSet = new Set(repoPaths);
  const matches: FindingMatch[] = findings.map((finding) => {
    const ranked = manifest.issues
      .map((issue) => ({ issue, ...matchFinding(finding, issue, pathSet) }))
      .sort((a, b) => b.score - a.score);
    const best = ranked[0];
    const accepted = Boolean(best && (best.matchedPath || best.keywordCoverage >= 0.6));
    return {
      findingId: finding.id,
      issueId: accepted ? best.issue.id : null,
      score: best?.score ?? 0,
      matchedPath: accepted ? best.matchedPath : null,
      keywordCoverage: best?.keywordCoverage ?? 0,
    };
  });

  const matchedFindings = matches.filter((match) => match.issueId !== null);
  const matchedIssues = new Set(matchedFindings.map((match) => match.issueId));
  const supportedFindings = matches.filter((match) => match.matchedPath !== null).length;
  const verifiable = findings.filter((finding) => finding.verificationConfidence !== undefined);
  const verified = verifiable.filter((finding) => finding.verified && (finding.verificationConfidence ?? 0) >= 0.5);
  const severityMatches = matchedFindings.flatMap((match) => {
    const finding = findings.find((item) => item.id === match.findingId);
    const issue = manifest.issues.find((item) => item.id === match.issueId);
    return finding?.severity && issue ? [finding.severity === issue.severity] : [];
  });

  return {
    findingCount: findings.length,
    matchedFindingCount: matchedFindings.length,
    matchedIssueCount: matchedIssues.size,
    precision: rate(matchedFindings.length, findings.length),
    recall: rate(matchedIssues.size, manifest.issues.length),
    evidenceSupportRate: rate(supportedFindings, findings.length),
    verificationRate: rate(verified.length, verifiable.length),
    severityAccuracy: rate(severityMatches.filter(Boolean).length, severityMatches.length),
    unsupportedFindingRate: rate(findings.length - supportedFindings, findings.length),
    matches,
  };
}

export interface TrialResult {
  trial: number;
  baseline: { metrics: ArmMetrics; inputTokens: number; outputTokens: number; estimatedCostUsd: number };
  debate: { metrics: ArmMetrics; inputTokens: number; outputTokens: number; estimatedCostUsd: number };
}

function mean(values: number[]): number {
  return values.length === 0 ? 0 : round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function sampleStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const average = mean(values);
  return round(Math.sqrt(values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1)));
}

export function aggregateTrials(trials: TrialResult[]) {
  const metricNames = ["precision", "recall", "evidenceSupportRate", "verificationRate", "severityAccuracy", "unsupportedFindingRate"] as const;
  const arm = (name: "baseline" | "debate") => Object.fromEntries(metricNames.map((metric) => {
    const values = trials.map((trial) => trial[name].metrics[metric]);
    return [metric, { mean: mean(values), stdDev: sampleStdDev(values) }];
  }));
  return {
    trialCount: trials.length,
    baseline: arm("baseline"),
    debate: arm("debate"),
    pairedDelta: Object.fromEntries(metricNames.map((metric) => [
      metric,
      mean(trials.map((trial) => trial.debate.metrics[metric] - trial.baseline.metrics[metric])),
    ])),
    tokens: {
      baselineMean: mean(trials.map((trial) => trial.baseline.inputTokens + trial.baseline.outputTokens)),
      debateMean: mean(trials.map((trial) => trial.debate.inputTokens + trial.debate.outputTokens)),
    },
    costUsd: {
      baselineMean: mean(trials.map((trial) => trial.baseline.estimatedCostUsd)),
      debateMean: mean(trials.map((trial) => trial.debate.estimatedCostUsd)),
    },
  };
}

export function formatBenchmarkMarkdown(manifest: BenchmarkManifest, trials: TrialResult[]): string {
  const aggregate = aggregateTrials(trials);
  const row = (label: string, key: keyof ArmMetrics) => {
    const baseline = aggregate.baseline[key as keyof typeof aggregate.baseline] as { mean: number; stdDev: number };
    const debate = aggregate.debate[key as keyof typeof aggregate.debate] as { mean: number; stdDev: number };
    const delta = aggregate.pairedDelta[key as keyof typeof aggregate.pairedDelta];
    return `| ${label} | ${(baseline.mean * 100).toFixed(1)}% ± ${(baseline.stdDev * 100).toFixed(1)} | ${(debate.mean * 100).toFixed(1)}% ± ${(debate.stdDev * 100).toFixed(1)} | ${(delta * 100).toFixed(1)} pp |`;
  };
  return [
    `# Single Reviewer vs Agent Society`,
    ``,
    `Repository: \`${manifest.repository}@${manifest.ref}\`  `,
    `Trials: ${trials.length} per arm  `,
    `Ground truth: ${manifest.issues.length} manually reviewed issues`,
    ``,
    `| Metric | Single reviewer | Four-agent debate | Paired delta |`,
    `|---|---:|---:|---:|`,
    row("Ground-truth precision", "precision"),
    row("Ground-truth recall", "recall"),
    row("File-evidence support", "evidenceSupportRate"),
    row("Independent verification", "verificationRate"),
    row("Severity accuracy", "severityAccuracy"),
    row("Unsupported findings", "unsupportedFindingRate"),
    ``,
    `| Cost | Single reviewer | Four-agent debate |`,
    `|---|---:|---:|`,
    `| Mean tokens | ${aggregate.tokens.baselineMean.toLocaleString()} | ${aggregate.tokens.debateMean.toLocaleString()} |`,
    `| Mean estimated cost | $${aggregate.costUsd.baselineMean.toFixed(4)} | $${aggregate.costUsd.debateMean.toFixed(4)} |`,
    ``,
    `## Methodology`,
    `Both arms use the same Qwen model family, repository ref, problem statement, read-only tools, and per-agent tool limits. Matching is deterministic and requires an exact known file path or at least 60% coverage of reviewed issue keywords. Verification uses the same low-temperature Qwen verifier for both arms. Raw findings and matches are retained in the JSON output for audit.`,
    ``,
    `This benchmark measures the pinned revision only; it does not claim general superiority across repositories.`,
  ].join("\n");
}
