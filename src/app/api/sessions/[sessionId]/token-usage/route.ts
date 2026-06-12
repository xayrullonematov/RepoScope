/**
 * Token Usage API Route
 *
 * GET /api/sessions/[sessionId]/token-usage - Get token usage, budget status, and cost estimate
 *
 * Aggregates usage data from tokenBudgetManager for session cost monitoring.
 */

import { NextResponse } from "next/server";
import { tokenBudgetManager } from "@/lib/token-budget-manager";

// =============================================================================
// GET /api/sessions/[sessionId]/token-usage
// =============================================================================

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    // Get usage, budget status, and cost estimate in parallel
    const [usage, budgetStatus, nextRoundEstimate] = await Promise.all([
      tokenBudgetManager.getSessionUsage(sessionId),
      tokenBudgetManager.checkBudget(sessionId),
      tokenBudgetManager.estimateRoundCost(sessionId),
    ]);

    return NextResponse.json({
      usage,
      budgetStatus,
      nextRoundEstimate,
    });
  } catch (error) {
    console.error("GET /api/sessions/[sessionId]/token-usage error:", error);
    return NextResponse.json(
      { error: "Failed to get token usage" },
      { status: 500 }
    );
  }
}
