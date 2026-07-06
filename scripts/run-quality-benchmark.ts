import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ArtifactState, ConsensusOutput, ProposalOutput } from "../src/types/domain";
import type { BenchmarkFinding, BenchmarkManifest, TrialResult } from "../src/lib/benchmark/evaluator";

interface Args {
  manifest: string;
  trials: number;
  output: string;
  database: string;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const result: Args = {
    manifest: "benchmarks/reposcope-ground-truth.json",
    trials: 3,
    output: "benchmarks/output",
    database: "benchmarks/benchmark.db",
  };
  for (let index = 0; index < args.length; index++) {
    const value = args[index + 1];
    if (args[index] === "--manifest" && value) result.manifest = value;
    if (args[index] === "--trials" && value) result.trials = Number(value);
    if (args[index] === "--output" && value) result.output = value;
    if (args[index] === "--database" && value) result.database = value;
  }
  if (!Number.isInteger(result.trials) || result.trials < 2) {
    throw new Error("--trials must be an integer >= 2");
  }
  return result;
}

function splitRepo(repository: string): [string, string] {
  const parts = repository.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) throw new Error("Manifest repository must be owner/repo");
  return [parts[0], parts[1]];
}

function findingArtifacts(findings: BenchmarkFinding[]): ArtifactState[] {
  return findings.map((finding) => ({
    id: finding.id,
    type: finding.severity ? "risk" : "recommendation",
    title: finding.title,
    content: finding.description,
    status: "draft",
    createdByAgentId: null,
    version: 1,
    contributors: [],
  }));
}

function baselineFindings(output: ProposalOutput): BenchmarkFinding[] {
  const risks = output.risks.map((risk, index) => ({
    id: `baseline-risk-${index}`,
    title: risk.description,
    description: `${risk.description}${risk.mitigation ? ` Mitigation: ${risk.mitigation}` : ""}`,
    severity: risk.severity,
  }));
  const suggestions = output.artifactSuggestions.map((artifact, index) => ({
    id: `baseline-artifact-${index}`,
    title: artifact.title,
    description: artifact.content,
  }));
  return [...risks, ...suggestions];
}

function debateFindings(consensus: ConsensusOutput | null, artifacts: ArtifactState[]): BenchmarkFinding[] {
  const risks = (consensus?.identifiedRisks ?? []).map((risk, index) => ({
    id: `debate-risk-${index}`,
    title: risk.description,
    description: risk.description,
    severity: risk.severity,
  }));
  const artifactFindings = artifacts
    .filter((artifact) => artifact.status !== "rejected")
    .map((artifact) => ({ id: artifact.id, title: artifact.title, description: artifact.content }));
  return [...risks, ...artifactFindings];
}

async function attachVerification(
  findings: BenchmarkFinding[],
  repo: { owner: string; repo: string; branch: string },
) {
  const { verifyFindings } = await import("../src/lib/finding-verifier");
  const results = await verifyFindings(findingArtifacts(findings), repo);
  const byId = new Map(results.map((result) => [result.artifactId, result]));
  return findings.map((finding) => ({
    ...finding,
    verified: byId.get(finding.id)?.verified,
    verificationConfidence: byId.get(finding.id)?.confidence,
  }));
}

async function main() {
  const args = parseArgs();
  const manifest = JSON.parse(await readFile(args.manifest, "utf8")) as BenchmarkManifest;
  const [owner, repo] = splitRepo(manifest.repository);
  const dbPath = path.resolve(args.database);
  process.env.DATABASE_URL = `file:${dbPath}`;
  process.env.FREE_TIER_LIMIT = "0";
  await mkdir(path.dirname(dbPath), { recursive: true });
  execFileSync("npx", ["prisma", "db", "push"], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });

  const [
    { fetchRepoTree, GithubError },
    { runSingleReviewer },
    { evaluateArm, aggregateTrials, formatBenchmarkMarkdown },
    { prisma },
    { eventStore },
    { roundOrchestrator },
    { snapshotManager },
    { artifactStore },
    { tokenBudgetManager, estimateUsageCost },
  ] = await Promise.all([
    import("../src/lib/github-fetcher"),
    import("../src/lib/benchmark/baseline-runner"),
    import("../src/lib/benchmark/evaluator"),
    import("../src/lib/db"),
    import("../src/lib/event-store"),
    import("../src/lib/round-orchestrator"),
    import("../src/lib/snapshot-manager"),
    import("../src/lib/artifact-store"),
    import("../src/lib/token-budget-manager"),
  ]);

  const tree = await fetchRepoTree(owner, repo, manifest.ref);
  if (tree instanceof GithubError) throw new Error(`Could not fetch benchmark repo: ${tree.message}`);
  const repoContext = { owner, repo, branch: manifest.ref };
  const repoPaths = tree.entries.map((entry) => entry.path);
  const trials: TrialResult[] = [];
  const rawRuns: unknown[] = [];

  const runBaseline = async (trial: number) => {
    const result = await runSingleReviewer({ repoOwner: owner, repo, ref: manifest.ref, problemDescription: manifest.problem, entries: tree.entries });
    const findings = await attachVerification(baselineFindings(result.output), repoContext);
    return {
      raw: result,
      arm: {
        metrics: evaluateArm(findings, manifest, repoPaths),
        inputTokens: result.tokenUsage.inputTokens,
        outputTokens: result.tokenUsage.outputTokens,
        estimatedCostUsd: estimateUsageCost(result.tokenUsage.inputTokens, result.tokenUsage.outputTokens, result.tokenUsage.model),
      },
      findings,
      trial,
    };
  };

  const runDebate = async (trial: number) => {
    const session = await prisma.session.create({
      data: {
        title: `[benchmark ${trial}] ${manifest.name}`,
        problemDescription: manifest.problem,
        status: "active",
        config: JSON.stringify({ clarificationPolicy: "suppress", githubRepo: { owner, repo, branch: manifest.ref, rawUrl: `https://github.com/${manifest.repository}/tree/${manifest.ref}` } }),
      },
    });
    await eventStore.appendEvent({ sessionId: session.id, type: "session-created", round: 0, stage: null, content: { sessionId: session.id, problemDescription: manifest.problem, constraints: [] } });
    await roundOrchestrator.startRound(session.id);
    const [state, artifacts, usage] = await Promise.all([
      snapshotManager.projectFromSnapshot(session.id),
      artifactStore.getSessionArtifacts(session.id),
      tokenBudgetManager.getSessionUsage(session.id),
    ]);
    const findings = await attachVerification(debateFindings(state.consensus, artifacts), repoContext);
    return {
      raw: { sessionId: session.id, consensus: state.consensus, artifacts, usage },
      arm: {
        metrics: evaluateArm(findings, manifest, repoPaths),
        inputTokens: usage.totalInputTokens,
        outputTokens: usage.totalOutputTokens,
        estimatedCostUsd: usage.estimatedCostUsd,
      },
      findings,
      trial,
    };
  };

  for (let trial = 1; trial <= args.trials; trial++) {
    process.stdout.write(`\nTrial ${trial}/${args.trials}\n`);
    // Alternate order to reduce time-of-run/provider-load bias.
    const baseline = trial % 2 === 1 ? await runBaseline(trial) : null;
    const debate = await runDebate(trial);
    const finalBaseline = baseline ?? await runBaseline(trial);
    trials.push({ trial, baseline: finalBaseline.arm, debate: debate.arm });
    rawRuns.push({ trial, baseline: { result: finalBaseline.raw, findings: finalBaseline.findings }, debate: { result: debate.raw, findings: debate.findings } });
  }

  const report = { manifest, generatedAt: new Date().toISOString(), trials, aggregate: aggregateTrials(trials), rawRuns };
  await mkdir(args.output, { recursive: true });
  await Promise.all([
    writeFile(path.join(args.output, "benchmark-report.json"), JSON.stringify(report, null, 2)),
    writeFile(path.join(args.output, "benchmark-report.md"), formatBenchmarkMarkdown(manifest, trials)),
  ]);
  process.stdout.write(`\nWrote ${args.output}/benchmark-report.{json,md}\n`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
