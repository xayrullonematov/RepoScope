/**
 * Event Log API Route
 *
 * GET /api/sessions/[sessionId]/events - Get all events for a session
 *
 * Returns all events ordered by timestamp with total count.
 */

import { NextResponse } from "next/server";
import { eventStore } from "@/lib/event-store";

// =============================================================================
// GET /api/sessions/[sessionId]/events
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

    // Get all events for session ordered by timestamp
    const events = await eventStore.getSessionEvents(sessionId);

    return NextResponse.json({
      events,
      totalCount: events.length,
    });
  } catch (error) {
    console.error("GET /api/sessions/[sessionId]/events error:", error);
    return NextResponse.json(
      { error: "Failed to get session events" },
      { status: 500 }
    );
  }
}
