/**
 * Round Start API Route
 *
 * POST /api/sessions/[sessionId]/rounds - Start a new debate round
 *
 * Checks budget, acquires session lock, estimates cost, and starts
 * the round orchestrator. For MVP, blocks until round completes.
 */

import { NextResponse } from "next/server";
import cuid from "cuid";
import { tokenBudgetManager } from "@/lib/token-budget-manager";
import { sessionLock } from "@/lib/session-lock";
import { roundOrchestrator } from "@/lib/round-orchestrator";
import { prisma } from "@/lib/db";

// =============================================================================
// POST /api/sessions/[sessionId]/rounds
// =============================================================================

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const lockId = cuid();
  let lockAcquired = false;

  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    // Check budget status — warn at 80%, block at 100%
    const budgetStatus = await tokenBudgetManager.checkBudget(sessionId);

    if (budgetStatus.isOverBudget) {
      return NextResponse.json(
        {
          error: "Token budget exceeded",
          budgetStatus,
        },
        { status: 402 }
      );
    }

    // Acquire session lock — if locked, return 409
    lockAcquired = await sessionLock.acquire(sessionId, lockId);

    if (!lockAcquired) {
      return NextResponse.json(
        { error: "Session is locked", status: 409 },
        { status: 409 }
      );
    }

    // Get cost estimate for this round
    const costEstimate = await tokenBudgetManager.estimateRoundCost(sessionId);

    // Get the current round number
    const session = await prisma.session.findUniqueOrThrow({
      where: { id: sessionId },
      select: { currentRound: true },
    });

    const nextRound = session.currentRound + 1;

    // Start the round — for MVP, this blocks until round completes
    // The frontend polls for progress via session detail + events endpoints
    await roundOrchestrator.startRound(sessionId);

    // Release lock after round completes
    await sessionLock.release(sessionId, lockId);
    lockAcquired = false;

    return NextResponse.json({
      round: nextRound,
      stage: "proposal",
      costEstimate,
      budgetStatus,
    });
  } catch (error) {
    // Ensure lock is released on error
    if (lockAcquired) {
      try {
        const { sessionId } = await params;
        await sessionLock.release(sessionId, lockId);
      } catch {
        // Best-effort lock release
      }
    }

    console.error("POST /api/sessions/[sessionId]/rounds error:", error);
    return NextResponse.json(
      { error: "Failed to start round" },
      { status: 500 }
    );
  }
}
