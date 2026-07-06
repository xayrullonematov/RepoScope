import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  aggregateTrials,
  evaluateArm,
  formatBenchmarkMarkdown,
  type ArmMetrics,
  type BenchmarkFinding,
  type BenchmarkManifest,
  type TrialResult,
} from "@/lib/benchmark/evaluator";

const REPO_PATHS = [
  "src/app/api/rounds/route.ts",
  "src/app/api/sessions/route.ts",
  "src/lib/round-orchestrator.ts",
];

const MANIFEST: BenchmarkManifest = {
  name: "test manifest",
  repository: "owner/repo",
  ref: "deadbeef",
  problem: "review",
  issues: [
    {
      id: "issue-blocking",
      title: "Long-running round blocks request",
      category: "architecture",
      severity: "high",
      paths: ["src/app/api/rounds/route.ts"],
      keywords: ["blocking", "request", "timeout", "orchestrator"],
    },
    {
      id: "issue-cookie",
      title: "Cookie usage gate bypass",
      category: "security",
      severity: "medium",
      paths: ["src/app/api/sessions/route.ts"],
      keywords: ["cookie", "free", "tier", "bypass"],
    },
  ],
};

describe("benchmark evaluator — deterministic matching", () => {
  // A: exact file-path evidence for issue-blocking, high severity, verified.
  // B: keyword-only match for issue-blocking (no path), low severity, unverified.
  // C: unrelated finding, no verification signal.
  const findings: BenchmarkFinding[] = [
    {
      id: "A",
      title: "Round route runs synchronously",
      description:
        "The rounds route at src/app/api/rounds/route.ts runs the orchestrator synchronously, blocking the request until timeout.",
      severity: "high",
      verified: true,
      verificationConfidence: 0.9,
    },
    {
      id: "B",
      title: "Orchestrator blocks the event loop",
      description:
        "The orchestrator round execution is blocking and can request a timeout during a long running review.",
      severity: "low",
      verified: false,
      verificationConfidence: 0.8,
    },
    {
      id: "C",
      title: "Docs could be improved",
      description: "Documentation formatting in the readme is inconsistent.",
    },
  ];

  const metrics = evaluateArm(findings, MANIFEST, REPO_PATHS);

  it("matches a file-path finding to its ground-truth issue with path evidence", () => {
    const matchA = metrics.matches.find((m) => m.findingId === "A")!;
    expect(matchA.issueId).toBe("issue-blocking");
    expect(matchA.matchedPath).toBe("src/app/api/rounds/route.ts");
    expect(matchA.score).toBeGreaterThanOrEqual(0.65);
  });

  it("accepts a keyword-only match above the 60% threshold but records no path evidence", () => {
    const matchB = metrics.matches.find((m) => m.findingId === "B")!;
    expect(matchB.issueId).toBe("issue-blocking");
    expect(matchB.matchedPath).toBeNull();
    expect(matchB.keywordCoverage).toBeGreaterThanOrEqual(0.6);
  });

  it("rejects an unrelated finding", () => {
    const matchC = metrics.matches.find((m) => m.findingId === "C")!;
    expect(matchC.issueId).toBeNull();
    expect(matchC.matchedPath).toBeNull();
  });

  it("computes the six quality metrics from the match set", () => {
    expect(metrics.findingCount).toBe(3);
    expect(metrics.matchedFindingCount).toBe(2);
    expect(metrics.matchedIssueCount).toBe(1);
    expect(metrics.precision).toBe(0.6667); // 2 / 3
    expect(metrics.recall).toBe(0.5); // 1 of 2 issues
    expect(metrics.evidenceSupportRate).toBe(0.3333); // only A has a path
    expect(metrics.unsupportedFindingRate).toBe(0.6667);
    expect(metrics.verificationRate).toBe(0.5); // A verified, B not; C not verifiable
    expect(metrics.severityAccuracy).toBe(0.5); // A high==high, B low!=high
  });

  it("only counts findings carrying a verification confidence toward the verification rate", () => {
    // C has no verificationConfidence, so the denominator is 2 (A and B), not 3.
    const onlyUnverifiable = evaluateArm([findings[2]], MANIFEST, REPO_PATHS);
    expect(onlyUnverifiable.verificationRate).toBe(0); // 0 verifiable → rate 0
  });
});

describe("benchmark evaluator — aggregation", () => {
  const arm = (overrides: Partial<ArmMetrics>): ArmMetrics => ({
    findingCount: 0,
    matchedFindingCount: 0,
    matchedIssueCount: 0,
    precision: 0,
    recall: 0,
    evidenceSupportRate: 0,
    verificationRate: 0,
    severityAccuracy: 0,
    unsupportedFindingRate: 0,
    matches: [],
    ...overrides,
  });

  const trials: TrialResult[] = [
    {
      trial: 1,
      baseline: { metrics: arm({ precision: 0.4 }), inputTokens: 100, outputTokens: 50, estimatedCostUsd: 0.01 },
      debate: { metrics: arm({ precision: 0.6 }), inputTokens: 400, outputTokens: 200, estimatedCostUsd: 0.05 },
    },
    {
      trial: 2,
      baseline: { metrics: arm({ precision: 0.6 }), inputTokens: 200, outputTokens: 100, estimatedCostUsd: 0.03 },
      debate: { metrics: arm({ precision: 0.8 }), inputTokens: 600, outputTokens: 300, estimatedCostUsd: 0.07 },
    },
  ];

  const aggregate = aggregateTrials(trials);

  it("reports per-arm mean and sample standard deviation", () => {
    expect(aggregate.trialCount).toBe(2);
    expect(aggregate.baseline.precision.mean).toBe(0.5);
    expect(aggregate.baseline.precision.stdDev).toBe(0.1414); // sqrt(0.02)
    expect(aggregate.debate.precision.mean).toBe(0.7);
  });

  it("reports the paired per-trial delta, not the difference of means", () => {
    expect(aggregate.pairedDelta.precision).toBe(0.2); // mean([0.2, 0.2])
  });

  it("averages token and cost totals per arm", () => {
    expect(aggregate.tokens.baselineMean).toBe(225); // (150 + 300) / 2
    expect(aggregate.tokens.debateMean).toBe(750); // (600 + 900) / 2
    expect(aggregate.costUsd.baselineMean).toBe(0.02);
    expect(aggregate.costUsd.debateMean).toBe(0.06);
  });

  it("renders a markdown report with both arms and methodology", () => {
    const md = formatBenchmarkMarkdown(MANIFEST, trials);
    expect(md).toContain("# Single Reviewer vs Agent Society");
    expect(md).toContain("Ground-truth precision");
    expect(md).toContain("Independent verification");
    expect(md).toContain("Mean tokens");
    expect(md).toContain("## Methodology");
  });
});

describe("benchmark evaluator — metric invariants (property)", () => {
  const findingArb = fc.record({
    id: fc.string({ minLength: 1, maxLength: 8 }),
    title: fc.string({ maxLength: 40 }),
    description: fc.string({ maxLength: 80 }),
    severity: fc.constantFrom("high", "medium", "low", undefined),
    verified: fc.boolean(),
    verificationConfidence: fc.option(fc.double({ min: 0, max: 1, noNaN: true }), { nil: undefined }),
  });

  it("keeps every rate within [0, 1] and counts internally consistent", () => {
    fc.assert(
      fc.property(fc.array(findingArb, { maxLength: 12 }), (findings) => {
        const m = evaluateArm(findings as BenchmarkFinding[], MANIFEST, REPO_PATHS);
        for (const rate of [
          m.precision,
          m.recall,
          m.evidenceSupportRate,
          m.verificationRate,
          m.severityAccuracy,
          m.unsupportedFindingRate,
        ]) {
          expect(rate).toBeGreaterThanOrEqual(0);
          expect(rate).toBeLessThanOrEqual(1);
        }
        expect(m.matchedFindingCount).toBeLessThanOrEqual(m.findingCount);
        expect(m.matchedIssueCount).toBeLessThanOrEqual(MANIFEST.issues.length);
        expect(m.matches).toHaveLength(findings.length);
      }),
    );
  });
});
