/**
 * Artifacts API Route
 *
 * GET /api/sessions/[sessionId]/artifacts - List all session artifacts
 * POST /api/sessions/[sessionId]/artifacts - Create a new artifact manually
 */

import { NextResponse } from "next/server";
import { artifactStore } from "@/lib/artifact-store";
import type { ArtifactType } from "@/types/domain";

// =============================================================================
// Valid artifact types for input validation
// =============================================================================

const VALID_ARTIFACT_TYPES: ArtifactType[] = [
  "decision",
  "risk",
  "assumption",
  "tradeoff",
  "open-question",
  "recommendation",
];

// =============================================================================
// GET /api/sessions/[sessionId]/artifacts
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

    const artifacts = await artifactStore.getSessionArtifacts(sessionId);

    return NextResponse.json({
      artifacts,
    });
  } catch (error) {
    console.error("GET /api/sessions/[sessionId]/artifacts error:", error);
    return NextResponse.json(
      { error: "Failed to get artifacts" },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/sessions/[sessionId]/artifacts
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
      type: ArtifactType;
      title: string;
      content: string;
    };

    if (!body.type || !body.title || !body.content) {
      return NextResponse.json(
        { error: "type, title, and content are required" },
        { status: 400 }
      );
    }

    if (!VALID_ARTIFACT_TYPES.includes(body.type)) {
      return NextResponse.json(
        {
          error: `Invalid artifact type. Must be one of: ${VALID_ARTIFACT_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const artifact = await artifactStore.createArtifact({
      sessionId,
      type: body.type,
      title: body.title,
      content: body.content,
      sourceEventId: "manual",
    });

    return NextResponse.json(
      { artifact },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/sessions/[sessionId]/artifacts error:", error);
    return NextResponse.json(
      { error: "Failed to create artifact" },
      { status: 500 }
    );
  }
}
