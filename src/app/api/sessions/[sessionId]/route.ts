/**
 * Session Detail API Route
 *
 * GET /api/sessions/[sessionId] - Get full session state
 * PATCH /api/sessions/[sessionId] - Update mutable session metadata (status, tokenBudget)
 *
 * Uses snapshotManager.projectFromSnapshot for O(1) state reconstruction
 * and adds token usage via tokenBudgetManager.getSessionUsage().
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { eventStore } from "@/lib/event-store";
import { snapshotManager } from "@/lib/snapshot-manager";
import { tokenBudgetManager } from "@/lib/token-budget-manager";
import type { SessionConfig } from "@/types/domain";

function parseSessionConfig(raw: string | null): SessionConfig {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as SessionConfig;
  } catch {
    return {};
  }
}

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

    const sessionState = await snapshotManager.projectFromSnapshot(sessionId);

    if (!sessionState || !sessionState.id) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const [tokenUsage, row, events] = await Promise.all([
      tokenBudgetManager.getSessionUsage(sessionId),
      prisma.session.findUnique({
        where: { id: sessionId },
        select: { tokenBudget: true, config: true },
      }),
      eventStore.getSessionEvents(sessionId),
    ]);

    const config = parseSessionConfig(row?.config ?? null);

    let wasRecovered = false;
    let recoveredAt: string | null = null;
    for (let i = events.length - 1; i >= 0; i--) {
      const e = events[i];
      if (e.type === "stage-progress") {
        try {
          const data = JSON.parse(e.content) as { status?: string };
          if (data.status === "recovered") {
            wasRecovered = true;
            recoveredAt = e.timestamp;
            break;
          }
        } catch {
          // ignore
        }
      }
    }

    return NextResponse.json({
      ...sessionState,
      tokenUsage,
      tokenBudget: row?.tokenBudget ?? null,
      config,
      wasRecovered,
      recoveredAt,
    });
  } catch (error) {
    console.error("GET /api/sessions/[sessionId] error:", error);
    return NextResponse.json(
      { error: "Failed to get session details" },
      { status: 500 }
    );
  }
}

// =============================================================================
// PATCH /api/sessions/[sessionId]
// =============================================================================

interface PatchBody {
  status?: "active" | "paused" | "completed";
  tokenBudget?: number | null;
}

export async function PATCH(
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

    const body = (await request.json().catch(() => ({}))) as PatchBody;
    const data: { status?: string; tokenBudget?: number | null } = {};

    if (body.status !== undefined) {
      if (!["active", "paused", "completed"].includes(body.status)) {
        return NextResponse.json(
          { error: "status must be one of active|paused|completed" },
          { status: 400 }
        );
      }
      data.status = body.status;
    }

    if (body.tokenBudget !== undefined) {
      if (body.tokenBudget === null) {
        data.tokenBudget = null;
      } else if (
        typeof body.tokenBudget === "number" &&
        Number.isFinite(body.tokenBudget) &&
        Number.isInteger(body.tokenBudget) &&
        body.tokenBudget > 0
      ) {
        data.tokenBudget = body.tokenBudget;
      } else {
        return NextResponse.json(
          { error: "tokenBudget must be a positive integer or null" },
          { status: 400 }
        );
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "no supported fields provided" },
        { status: 400 }
      );
    }

    const updated = await prisma.session.update({
      where: { id: sessionId },
      data,
      select: { id: true, status: true, tokenBudget: true },
    });

    return NextResponse.json({
      sessionId: updated.id,
      status: updated.status,
      tokenBudget: updated.tokenBudget,
    });
  } catch (error) {
    console.error("PATCH /api/sessions/[sessionId] error:", error);
    return NextResponse.json(
      { error: "Failed to update session" },
      { status: 500 }
    );
  }
}
