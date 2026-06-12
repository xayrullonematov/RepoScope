/**
 * Sessions API Route
 *
 * POST /api/sessions - Create a new session
 * GET /api/sessions - List all sessions
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { eventStore } from "@/lib/event-store";
import type { AgentType } from "@/types/domain";

// =============================================================================
// ALL AGENTS (for initial state response)
// =============================================================================

const ALL_AGENTS: {
  id: AgentType;
  displayName: string;
  status: string;
}[] = [
  { id: "senior-engineer", displayName: "Senior Engineer", status: "idle" },
  { id: "security-engineer", displayName: "Security Engineer", status: "idle" },
  {
    id: "performance-engineer",
    displayName: "Performance Engineer",
    status: "idle",
  },
  { id: "product-engineer", displayName: "Product Engineer", status: "idle" },
];

// =============================================================================
// POST /api/sessions
// =============================================================================

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      problemDescription: string;
      constraints?: { text: string; category?: string }[];
      tokenBudget?: number;
      title?: string;
      priorSessionSummary?: string;
    };

    const { problemDescription, constraints, tokenBudget, title } = body;

    if (!problemDescription || typeof problemDescription !== "string") {
      return NextResponse.json(
        { error: "problemDescription is required" },
        { status: 400 }
      );
    }

    // Create Session via Prisma
    const session = await prisma.session.create({
      data: {
        title: title || problemDescription.slice(0, 100),
        problemDescription,
        status: "active",
        currentRound: 0,
        tokenBudget: tokenBudget ?? null,
      },
    });

    // Persist session-created event
    await eventStore.appendEvent({
      sessionId: session.id,
      type: "session-created",
      agentId: null,
      round: 0,
      stage: null,
      content: {
        sessionId: session.id,
        problemDescription,
        constraints: constraints || [],
        priorSessionSummary: body.priorSessionSummary || null,
      },
    });

    // If constraints provided, persist each as user-intervention events
    if (constraints && constraints.length > 0) {
      for (const constraint of constraints) {
        await eventStore.appendEvent({
          sessionId: session.id,
          type: "user-intervention",
          agentId: null,
          round: 0,
          stage: null,
          content: {
            id: `constraint-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            text: constraint.text,
            category: constraint.category || "general",
            createdAt: new Date().toISOString(),
          },
        });
      }
    }

    return NextResponse.json(
      {
        sessionId: session.id,
        status: session.status,
        agents: ALL_AGENTS,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/sessions error:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET /api/sessions
// =============================================================================

export async function GET() {
  try {
    const sessions = await prisma.session.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        currentRound: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        title: s.title,
        status: s.status,
        currentRound: s.currentRound,
        createdAt: s.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("GET /api/sessions error:", error);
    return NextResponse.json(
      { error: "Failed to list sessions" },
      { status: 500 }
    );
  }
}
