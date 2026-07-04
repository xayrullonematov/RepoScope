/**
 * Event Log API Route
 *
 * GET /api/sessions/[sessionId]/events - Get events for a session
 *
 * Query params:
 *   after - event ID cursor; returns only events after this ID
 *
 * Returns events ordered by timestamp with total count.
 */

import { NextResponse } from "next/server";
import { eventStore } from "@/lib/event-store";

// =============================================================================
// GET /api/sessions/[sessionId]/events
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

    const url = new URL(request.url);
    const afterId = url.searchParams.get("after");

    const events = await eventStore.getSessionEvents(sessionId);

    if (afterId) {
      const idx = events.findIndex((e) => e.id === afterId);
      if (idx >= 0) {
        const newEvents = events.slice(idx + 1);
        return NextResponse.json({
          events: newEvents,
          totalCount: events.length,
          incremental: true,
        });
      }
    }

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
