import { NextResponse } from "next/server";
import { artifactStore } from "@/lib/artifact-store";
import { eventStore } from "@/lib/event-store";
import { snapshotManager } from "@/lib/snapshot-manager";
import { tokenBudgetManager } from "@/lib/token-budget-manager";
import { filterFindings } from "@/lib/finding-filter";
import type { ArtifactState } from "@/types/domain";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const state = await snapshotManager.projectFromSnapshot(sessionId);
    const artifacts = await artifactStore.getSessionArtifacts(sessionId);
    const usage = await tokenBudgetManager.getSessionUsage(sessionId);

    // Get round events for confidence-weighted filtering
    const roundEvents = state.currentRound > 0
      ? await eventStore.getRoundEvents(sessionId, state.currentRound)
      : [];

    // Apply confidence-weighted filter
    const scored = filterFindings(artifacts, state.consensus, roundEvents);
    const promoted = scored.filter((f) => !f.demoted).map((f) => f.artifact);
    const demoted = scored.filter((f) => f.demoted).map((f) => f.artifact);

    const grouped: Record<string, ArtifactState[]> = {
      decision: [],
      risk: [],
      assumption: [],
      tradeoff: [],
      "open-question": [],
      recommendation: [],
    };

    for (const a of promoted) {
      if (a.type in grouped) {
        grouped[a.type].push(a);
      }
    }

    return NextResponse.json({
      session: {
        problemDescription: state.problemDescription,
        status: state.status,
        currentRound: state.currentRound,
        totalTokens: usage.totalInputTokens + usage.totalOutputTokens,
        estimatedCostUsd: usage.estimatedCostUsd,
      },
      consensus: state.consensus ?? null,
      artifacts: grouped,
      demotedArtifacts: demoted,
      summary: {
        roundCount: state.currentRound,
        artifactCount: promoted.length,
        totalArtifactCount: artifacts.length,
        demotedCount: demoted.length,
        acceptedCount: promoted.filter((a) => a.status === "accepted").length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch session results" },
      { status: 500 }
    );
  }
}
