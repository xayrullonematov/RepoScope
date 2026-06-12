/**
 * Round Detail API Route
 *
 * GET /api/sessions/[sessionId]/rounds/[roundNumber] - Get round events and stage progress
 *
 * Returns all events for the specific round plus per-agent stage completion status.
 */

import { NextResponse } from "next/server";
import { eventStore } from "@/lib/event-store";
import type { AgentType } from "@/types/domain";

// =============================================================================
// ALL AGENT IDS
// =============================================================================

const ALL_AGENTS: AgentType[] = [
  "senior-engineer",
  "security-engineer",
  "performance-engineer",
  "product-engineer",
];

// =============================================================================
// GET /api/sessions/[sessionId]/rounds/[roundNumber]
// =============================================================================

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string; roundNumber: string }> }
) {
  try {
    const { sessionId, roundNumber } = await params;

    if (!sessionId || !roundNumber) {
      return NextResponse.json(
        { error: "sessionId and roundNumber are required" },
        { status: 400 }
      );
    }

    const round = parseInt(roundNumber, 10);

    if (isNaN(round) || round < 1) {
      return NextResponse.json(
        { error: "roundNumber must be a positive integer" },
        { status: 400 }
      );
    }

    // Get events for the specific round
    const events = await eventStore.getRoundEvents(sessionId, round);

    // Derive per-agent stage progress from stage-progress events
    const stageProgress: Record<string, "completed" | "pending"> = {};

    // Initialize all agents as pending
    for (const agentId of ALL_AGENTS) {
      stageProgress[agentId] = "pending";
    }

    // Check stage-progress events to mark agents as completed
    for (const event of events) {
      if (event.type === "stage-progress" && event.agentId) {
        stageProgress[event.agentId] = "completed";
      }
    }

    return NextResponse.json({
      round,
      events,
      stageProgress,
    });
  } catch (error) {
    console.error(
      "GET /api/sessions/[sessionId]/rounds/[roundNumber] error:",
      error
    );
    return NextResponse.json(
      { error: "Failed to get round details" },
      { status: 500 }
    );
  }
}
