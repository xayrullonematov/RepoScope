/**
 * Round Start API Route
 *
 * POST /api/sessions/[sessionId]/rounds - Start a new debate round
 *
 * GET estimates a refinement. POST persists its instruction and queues it.
 */

import { NextResponse } from "next/server";
import { tokenBudgetManager } from "@/lib/token-budget-manager";
import { prisma } from "@/lib/db";
import { eventStore } from "@/lib/event-store";
import { enqueueReviewJob } from "@/lib/review-job-queue";
import { ensureReviewJobSchema } from "@/lib/review-job-queue";

// =============================================================================
// POST /api/sessions/[sessionId]/rounds
//
// Locking is owned by roundOrchestrator.startRound — it acquires, runs the
// round, and releases in its own finally block. The route only translates
// the orchestrator's "is locked" error into a 409.
// =============================================================================

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    return NextResponse.json({
      costEstimate: await tokenBudgetManager.estimateRoundCost(sessionId),
      budgetStatus: await tokenBudgetManager.checkBudget(sessionId),
    });
  } catch (error) {
    console.error("GET /api/sessions/[sessionId]/rounds error:", error);
    return NextResponse.json({ error: "Failed to estimate refinement" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = (await request.json().catch(() => ({}))) as { instruction?: string; retry?: boolean };
    const instruction = body.instruction?.trim();

    const [session, budgetStatus] = await Promise.all([
      prisma.session.findUnique({ where: { id: sessionId } }),
      tokenBudgetManager.checkBudget(sessionId),
    ]);
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    if (budgetStatus.isOverBudget) {
      return NextResponse.json({ error: "Token budget exceeded", budgetStatus }, { status: 402 });
    }

    if (body.retry) {
      await ensureReviewJobSchema();
      const failed = await prisma.reviewJob.findFirst({
        where: { sessionId, status: "failed" },
        orderBy: { createdAt: "desc" },
      });
      if (!failed) return NextResponse.json({ error: "No failed review to retry" }, { status: 409 });
      const job = await enqueueReviewJob(sessionId, {
        kind: failed.kind === "refinement" ? "refinement" : "initial",
        instruction: failed.instruction ?? undefined,
      });
      return NextResponse.json({ jobId: job.id, sessionId, status: job.status }, { status: 202 });
    }

    if (session.currentRound > 0 && !instruction) {
      return NextResponse.json({ error: "Refinement instructions are required" }, { status: 400 });
    }
    await ensureReviewJobSchema();
    const activeJob = await prisma.reviewJob.findUnique({ where: { activeKey: sessionId } });
    if (activeJob) {
      return NextResponse.json(
        { error: "A review is already queued or running", jobId: activeJob.id },
        { status: 409 },
      );
    }
    if (instruction) {
      await eventStore.appendEvent({
        sessionId,
        type: "user-intervention",
        agentId: null,
        round: session.currentRound,
        stage: "awaiting-intervention",
        content: { id: `refinement-${Date.now()}`, text: instruction, category: "refinement", createdAt: new Date().toISOString() },
      });
    }
    const job = await enqueueReviewJob(sessionId, {
      kind: session.currentRound > 0 ? "refinement" : "initial",
      instruction,
    });
    return NextResponse.json({ jobId: job.id, sessionId, status: job.status }, { status: 202 });
  } catch (error) {
    console.error("POST /api/sessions/[sessionId]/rounds error:", error);
    return NextResponse.json({ error: "Failed to queue refinement" }, { status: 500 });
  }
}
