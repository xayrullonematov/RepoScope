/**
 * Artifact Detail API Route
 *
 * GET /api/sessions/[sessionId]/artifacts/[artifactId] - Get artifact with versions
 * PATCH /api/sessions/[sessionId]/artifacts/[artifactId] - Update artifact content
 * PUT /api/sessions/[sessionId]/artifacts/[artifactId] - Change artifact status
 */

import { NextResponse } from "next/server";
import { artifactStore } from "@/lib/artifact-store";
import type { ArtifactStatus } from "@/types/domain";

// =============================================================================
// Valid statuses for status change
// =============================================================================

const VALID_STATUSES: ArtifactStatus[] = ["draft", "accepted", "rejected"];

// =============================================================================
// GET /api/sessions/[sessionId]/artifacts/[artifactId]
// =============================================================================

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string; artifactId: string }> }
) {
  try {
    const { artifactId } = await params;

    if (!artifactId) {
      return NextResponse.json(
        { error: "artifactId is required" },
        { status: 400 }
      );
    }

    const artifact = await artifactStore.getArtifact(artifactId);
    const versions = await artifactStore.getArtifactVersions(artifactId);

    return NextResponse.json({
      artifact,
      versions,
    });
  } catch (error) {
    console.error(
      "GET /api/sessions/[sessionId]/artifacts/[artifactId] error:",
      error
    );
    return NextResponse.json(
      { error: "Failed to get artifact" },
      { status: 500 }
    );
  }
}

// =============================================================================
// PATCH /api/sessions/[sessionId]/artifacts/[artifactId]
// =============================================================================

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sessionId: string; artifactId: string }> }
) {
  try {
    const { artifactId } = await params;

    if (!artifactId) {
      return NextResponse.json(
        { error: "artifactId is required" },
        { status: 400 }
      );
    }

    const body = (await request.json()) as {
      content: string;
      reasoning?: string;
    };

    if (!body.content || typeof body.content !== "string") {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 }
      );
    }

    const artifact = await artifactStore.updateArtifact(artifactId, {
      content: body.content,
      reasoning: body.reasoning,
      sourceEventId: "manual",
    });

    return NextResponse.json({
      artifact,
    });
  } catch (error) {
    console.error(
      "PATCH /api/sessions/[sessionId]/artifacts/[artifactId] error:",
      error
    );
    return NextResponse.json(
      { error: "Failed to update artifact" },
      { status: 500 }
    );
  }
}

// =============================================================================
// PUT /api/sessions/[sessionId]/artifacts/[artifactId]
// =============================================================================

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ sessionId: string; artifactId: string }> }
) {
  try {
    const { artifactId } = await params;

    if (!artifactId) {
      return NextResponse.json(
        { error: "artifactId is required" },
        { status: 400 }
      );
    }

    const body = (await request.json()) as {
      status: ArtifactStatus;
    };

    if (!body.status || !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json(
        {
          error: `status is required and must be one of: ${VALID_STATUSES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const artifact = await artifactStore.changeStatus(artifactId, body.status);

    return NextResponse.json({
      artifact,
    });
  } catch (error) {
    // Handle invalid status transition errors specifically
    if (error instanceof Error && error.message.includes("Invalid status transition")) {
      return NextResponse.json(
        { error: error.message },
        { status: 422 }
      );
    }

    console.error(
      "PUT /api/sessions/[sessionId]/artifacts/[artifactId] error:",
      error
    );
    return NextResponse.json(
      { error: "Failed to change artifact status" },
      { status: 500 }
    );
  }
}
