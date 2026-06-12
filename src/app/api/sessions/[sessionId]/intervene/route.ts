/**
 * Intervention API Route
 *
 * POST /api/sessions/[sessionId]/intervene - Add a user constraint/intervention
 *
 * Creates a Constraint object and passes it to the round orchestrator
 * to be incorporated into the next round's context.
 */

import { NextResponse } from "next/server";
import cuid from "cuid";
import { roundOrchestrator } from "@/lib/round-orchestrator";
import type { Constraint } from "@/types/domain";

// =============================================================================
// POST /api/sessions/[sessionId]/intervene
// =============================================================================

export async function POST(
  request: Request,
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

    const body = (await request.json()) as {
      text: string;
      category?: string;
    };

    if (!body.text || typeof body.text !== "string") {
      return NextResponse.json(
        { error: "text is required" },
        { status: 400 }
      );
    }

    // Create a Constraint object
    const constraint: Constraint = {
      id: cuid(),
      text: body.text,
      category: body.category || "general",
      createdAt: new Date().toISOString(),
    };

    // Pass to round orchestrator
    await roundOrchestrator.handleIntervention(sessionId, constraint);

    return NextResponse.json({
      constraint,
      status: "added",
    });
  } catch (error) {
    console.error("POST /api/sessions/[sessionId]/intervene error:", error);
    return NextResponse.json(
      { error: "Failed to add intervention" },
      { status: 500 }
    );
  }
}
