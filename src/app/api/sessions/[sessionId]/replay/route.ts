/**
 * Replay API Route
 *
 * GET /api/sessions/[sessionId]/replay - Get events for replay with optional step projection
 *
 * Returns all session events ordered by timestamp. If ?step=N is provided,
 * also returns the projected state at that step for time-travel debugging.
 */

import { NextResponse } from "next/server";
import { eventStore } from "@/lib/event-store";
import { projectStateAtIndex } from "@/lib/state-projector";

// =============================================================================
// GET /api/sessions/[sessionId]/replay
// =============================================================================

export async function GET(
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

    // Get all events ordered by timestamp
    const events = await eventStore.getSessionEvents(sessionId);

    // Check for step query parameter
    const url = new URL(request.url);
    const stepParam = url.searchParams.get("step");

    let currentState = undefined;

    if (stepParam !== null) {
      const step = parseInt(stepParam, 10);

      if (isNaN(step) || step < 0) {
        return NextResponse.json(
          { error: "step must be a non-negative integer" },
          { status: 400 }
        );
      }

      // Clamp step to total events length
      const clampedStep = Math.min(step, events.length);
      currentState = projectStateAtIndex(events, clampedStep);
    }

    return NextResponse.json({
      events,
      totalSteps: events.length,
      ...(currentState !== undefined && { currentState }),
    });
  } catch (error) {
    console.error("GET /api/sessions/[sessionId]/replay error:", error);
    return NextResponse.json(
      { error: "Failed to get replay data" },
      { status: 500 }
    );
  }
}
