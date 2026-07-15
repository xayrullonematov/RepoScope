/**
 * Human Directives API Route
 *
 * POST /api/sessions/[sessionId]/directives - Add a human directive
 *
 * Creates a human-directive event and persists it to the event store.
 * The directive will be included in all subsequent agent prompts.
 */

import { NextResponse } from "next/server";
import cuid from "cuid";
import { prisma } from "@/lib/db";
import { eventStore } from "@/lib/event-store";
import { humanDirectiveInputSchema } from "@/schemas/human-directive";
import type { HumanDirective } from "@/types/domain";

// =============================================================================
// POST /api/sessions/[sessionId]/directives
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

    // Verify session exists before appending event
    try {
      await prisma.session.findUniqueOrThrow({
        where: { id: sessionId },
      });
    } catch {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Validate input using Zod schema
    const parsed = humanDirectiveInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const directiveId = cuid();
    const createdAt = new Date().toISOString();

    // Create the directive object
    const directive: HumanDirective = {
      id: directiveId,
      text: parsed.data.text.trim(),
      createdAt,
      source: "human",
      active: true,
    };

    // Persist as a human-directive event
    await eventStore.appendEvent({
      sessionId,
      type: "human-directive",
      agentId: null,
      round: 0,
      stage: null,
      content: directive,
    });

    return NextResponse.json({
      directive,
      status: "added",
    });
  } catch (error) {
    console.error("POST /api/sessions/[sessionId]/directives error:", error);
    return NextResponse.json(
      { error: "Failed to add directive" },
      { status: 500 }
    );
  }
}
