/**
 * Session Detail API Route
 *
 * GET /api/sessions/[sessionId] - Get full session state
 *
 * Uses snapshotManager.projectFromSnapshot for O(1) state reconstruction
 * and adds token usage via tokenBudgetManager.getSessionUsage().
 */

import { NextResponse } from "next/server";
import { snapshotManager } from "@/lib/snapshot-manager";
import { tokenBudgetManager } from "@/lib/token-budget-manager";

// =============================================================================
// GET /api/sessions/[sessionId]
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

    // Use snapshotManager for O(1) state reconstruction
    const sessionState = await snapshotManager.projectFromSnapshot(sessionId);

    if (!sessionState || !sessionState.id) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Add token usage via tokenBudgetManager
    const tokenUsage = await tokenBudgetManager.getSessionUsage(sessionId);

    return NextResponse.json({
      ...sessionState,
      tokenUsage,
    });
  } catch (error) {
    console.error("GET /api/sessions/[sessionId] error:", error);
    return NextResponse.json(
      { error: "Failed to get session details" },
      { status: 500 }
    );
  }
}
