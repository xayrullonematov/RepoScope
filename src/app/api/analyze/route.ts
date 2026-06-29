/**
 * Analyze API Route — Convenience endpoint for CI/CD integration.
 *
 * POST /api/analyze
 *
 * Combines session creation + round execution into a single blocking call.
 * Returns the final report JSON when complete.
 *
 * Input:  { repoUrl, reviewType?, constraints? }
 * Output: { sessionId, score, verdict, risks, fixes, totalTokens, costUsd }
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { eventStore } from "@/lib/event-store";
import { roundOrchestrator } from "@/lib/round-orchestrator";
import { tokenBudgetManager } from "@/lib/token-budget-manager";
import { snapshotManager } from "@/lib/snapshot-manager";
import { parseGithubUrl, GithubError } from "@/lib/github-fetcher";
import type { SessionConfig, Severity } from "@/types/domain";

const REVIEW_TYPES: Record<string, string> = {
  security: "Scan this repo for security vulnerabilities: auth bypass, injection flaws, secrets in code, insecure dependencies, and misconfigured permissions. Flag the riskiest files first.",
  bugs: "Find bugs, unhandled edge cases, and logic errors in this codebase. Focus on crash-prone paths, race conditions, null dereferences, and incorrect error handling.",
  architecture: "Review the architecture of this repo. Identify coupling issues, unclear boundaries, scaling bottlenecks, and areas where the structure will break as the team or traffic grows.",
  production: "Check if this repo is production-ready. Look for missing error handling, no monitoring/logging, deployment risks, missing tests on critical paths, and configuration issues.",
  full: "Perform a comprehensive engineering review of this repository covering security, performance, architecture, and production readiness. Prioritize findings by severity.",
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      repoUrl: string;
      reviewType?: string;
      constraints?: string[];
      tokenBudget?: number;
    };

    if (!body.repoUrl || typeof body.repoUrl !== "string") {
      return NextResponse.json({ error: "repoUrl is required" }, { status: 400 });
    }

    // Parse GitHub URL
    const parsed = parseGithubUrl(body.repoUrl);
    if (parsed instanceof GithubError) {
      return NextResponse.json({ error: `Invalid repoUrl: ${parsed.message}` }, { status: 400 });
    }

    const reviewType = body.reviewType ?? "full";
    const problemDescription = REVIEW_TYPES[reviewType] ?? REVIEW_TYPES.full;

    const configObj: SessionConfig = {
      clarificationPolicy: "suppress",
      githubRepo: {
        owner: parsed.owner,
        repo: parsed.repo,
        branch: parsed.branch ?? "",
        rawUrl: body.repoUrl,
      },
    };

    // Create session
    const session = await prisma.session.create({
      data: {
        title: `${parsed.owner}/${parsed.repo} — ${reviewType}`,
        problemDescription,
        status: "active",
        currentRound: 0,
        tokenBudget: body.tokenBudget ?? null,
        config: JSON.stringify(configObj),
      },
    });

    // Persist session-created event
    await eventStore.appendEvent({
      sessionId: session.id,
      type: "session-created",
      agentId: null,
      round: 0,
      stage: null,
      content: { sessionId: session.id, problemDescription, constraints: [] },
    });

    // Persist constraints if provided
    if (body.constraints?.length) {
      for (const text of body.constraints) {
        await eventStore.appendEvent({
          sessionId: session.id,
          type: "user-intervention",
          agentId: null,
          round: 0,
          stage: null,
          content: {
            id: `constraint-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            text,
            category: "general",
            createdAt: new Date().toISOString(),
          },
        });
      }
    }

    // Run the analysis (blocking — includes auto-escalation)
    await roundOrchestrator.startRound(session.id);

    // Collect results
    const state = await snapshotManager.projectFromSnapshot(session.id);
    const usage = await tokenBudgetManager.getSessionUsage(session.id);
    const consensus = state.consensus;

    const score = consensus
      ? consensus.overallConfidence > 1
        ? Math.round(consensus.overallConfidence)
        : Math.round(consensus.overallConfidence * 100)
      : 0;

    const risks = consensus?.identifiedRisks ?? [];
    const highCount = risks.filter((r) => r.severity === "high").length;

    let verdict: string;
    if (highCount > 0) verdict = "fix_before_shipping";
    else if (score >= 80) verdict = "ready_to_ship";
    else if (score >= 60) verdict = "needs_attention";
    else verdict = "needs_significant_work";

    return NextResponse.json({
      sessionId: session.id,
      repo: `${parsed.owner}/${parsed.repo}`,
      score,
      verdict,
      rounds: state.currentRound,
      risks: risks.map((r) => ({ description: r.description, severity: r.severity, raisedBy: r.raisedBy })),
      fixes: (consensus?.recommendedDecisions ?? []).map((d) => ({ title: d.title, description: d.description, confidence: d.confidence })),
      openQuestions: consensus?.openQuestions ?? [],
      totalTokens: usage.totalInputTokens + usage.totalOutputTokens,
      costUsd: parseFloat(usage.estimatedCostUsd.toFixed(4)),
      reportUrl: `/sessions/${session.id}/summary`,
    });
  } catch (error) {
    console.error("POST /api/analyze error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Analysis failed", details: msg }, { status: 500 });
  }
}
