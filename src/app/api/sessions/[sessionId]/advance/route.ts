/**
 * Advance (Skip Intervention) API Route
 *
 * POST /api/sessions/[sessionId]/advance - Skip the intervention window and start next round
 *
 * Calls roundOrchestrator.skipIntervention() to proceed without user input.
 */

import { NextResponse } from "next/server";
import { roundOrchestrator } from "@/lib/round-orchestrator";

// =============================================================================
// POST /api/sessions/[sessionId]/advance
// =============================================================================

export async function POST(
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

    // Skip intervention window and start next round
    await roundOrchestrator.skipIntervention(sessionId);

    return NextResponse.json({
      status: "advancing",
    });
  } catch (error) {
    console.error("POST /api/sessions/[sessionId]/advance error:", error);
    return NextResponse.json(
      { error: "Failed to advance session" },
      { status: 500 }
    );
  }
}
