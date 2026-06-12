import { prisma } from "@/lib/db";
import { eventStore } from "@/lib/event-store";
import type {
  ArtifactStore,
  ArtifactState,
  ArtifactStatus,
  ArtifactType,
  ArtifactVersion,
  ArtifactUpdate,
  AgentType,
  NewArtifact,
} from "@/types/domain";
import type { Artifact as PrismaArtifact, ArtifactVersion as PrismaArtifactVersion } from "@/generated/prisma/client";

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Valid status transitions for artifacts:
 * draft -> accepted, draft -> rejected, accepted -> draft (reopened)
 */
const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ["accepted", "rejected"],
  accepted: ["draft"],
  rejected: [],
};


/**
 * Maps a Prisma Artifact record (with versions) to the ArtifactState domain type.
 * Contributors are derived from all unique agentIds across ArtifactVersions.
 */
function mapToArtifactState(
  artifact: PrismaArtifact & { versions?: PrismaArtifactVersion[] }
): ArtifactState {
  const contributors: AgentType[] = [];
  if (artifact.versions) {
    const seen = new Set<string>();
    for (const v of artifact.versions) {
      if (v.agentId && !seen.has(v.agentId)) {
        seen.add(v.agentId);
        contributors.push(v.agentId as AgentType);
      }
    }
  } else if (artifact.createdByAgentId) {
    contributors.push(artifact.createdByAgentId as AgentType);
  }

  return {
    id: artifact.id,
    type: artifact.type as ArtifactType,
    title: artifact.title,
    content: artifact.content,
    status: artifact.status as ArtifactStatus,
    createdByAgentId: (artifact.createdByAgentId as AgentType) ?? null,
    version: artifact.version,
    contributors,
  };
}


/**
 * Maps a Prisma ArtifactVersion record to the domain ArtifactVersion type.
 */
function mapToArtifactVersion(record: PrismaArtifactVersion): ArtifactVersion {
  return {
    id: record.id,
    artifactId: record.artifactId,
    version: record.version,
    content: record.content,
    agentId: (record.agentId as AgentType) ?? null,
    reasoning: record.reasoning ?? null,
    sourceEventId: record.sourceEventId,
    timestamp: record.timestamp.toISOString(),
  };
}


// =============================================================================
// ARTIFACT STORE IMPLEMENTATION
// =============================================================================

export const artifactStore: ArtifactStore = {
  /**
   * Creates a new artifact with deduplication.
   * If an artifact with the same sessionId + type + title (case-insensitive) exists,
   * updates it instead of creating a duplicate.
   */
  async createArtifact(artifact: NewArtifact): Promise<ArtifactState> {
    // Check for existing artifact with same sessionId + type + title (case-insensitive)
    const existing = await artifactStore.findByTitleAndType(
      artifact.sessionId,
      artifact.type,
      artifact.title
    );

    if (existing) {
      // Deduplicate: update the existing artifact instead
      return artifactStore.updateArtifact(existing.id, {
        content: artifact.content,
        agentId: artifact.createdByAgentId,
        sourceEventId: artifact.sourceEventId,
      });
    }


    // Create new artifact + first version + event in a transaction
    const created = await prisma.$transaction(async (tx) => {
      const newArtifact = await tx.artifact.create({
        data: {
          sessionId: artifact.sessionId,
          type: artifact.type,
          title: artifact.title,
          content: artifact.content,
          status: "draft",
          createdByAgentId: artifact.createdByAgentId ?? null,
          version: 1,
        },
      });

      // Create the first version record with provenance
      await tx.artifactVersion.create({
        data: {
          artifactId: newArtifact.id,
          version: 1,
          content: artifact.content,
          agentId: artifact.createdByAgentId ?? null,
          reasoning: null,
          sourceEventId: artifact.sourceEventId,
        },
      });

      return newArtifact;
    });


    // Persist artifact-created event
    await eventStore.appendEvent({
      sessionId: artifact.sessionId,
      type: "artifact-created",
      agentId: artifact.createdByAgentId ?? null,
      round: 0, // Will be set by caller context if needed
      stage: null,
      content: {
        artifactId: created.id,
        type: artifact.type,
        title: artifact.title,
        content: artifact.content,
      },
    });

    // Return the created artifact state
    return {
      id: created.id,
      type: created.type as ArtifactType,
      title: created.title,
      content: created.content,
      status: created.status as ArtifactStatus,
      createdByAgentId: (created.createdByAgentId as AgentType) ?? null,
      version: created.version,
      contributors: created.createdByAgentId
        ? [created.createdByAgentId as AgentType]
        : [],
    };
  },


  /**
   * Updates an existing artifact: increments version, updates content,
   * creates a new ArtifactVersion record, and persists an artifact-updated event.
   */
  async updateArtifact(
    artifactId: string,
    update: ArtifactUpdate
  ): Promise<ArtifactState> {
    const updated = await prisma.$transaction(async (tx) => {
      // Get current artifact to determine next version
      const current = await tx.artifact.findUniqueOrThrow({
        where: { id: artifactId },
      });

      const nextVersion = current.version + 1;

      // Update the artifact record
      const updatedArtifact = await tx.artifact.update({
        where: { id: artifactId },
        data: {
          content: update.content,
          version: nextVersion,
        },
        include: { versions: true },
      });


      // Create new version record with provenance
      await tx.artifactVersion.create({
        data: {
          artifactId,
          version: nextVersion,
          content: update.content,
          agentId: update.agentId ?? null,
          reasoning: update.reasoning ?? null,
          sourceEventId: update.sourceEventId,
        },
      });

      return updatedArtifact;
    });

    // Persist artifact-updated event
    await eventStore.appendEvent({
      sessionId: updated.sessionId,
      type: "artifact-updated",
      agentId: update.agentId ?? null,
      round: 0,
      stage: null,
      content: {
        artifactId,
        version: updated.version,
        content: update.content,
        reasoning: update.reasoning ?? null,
      },
    });


    // Fetch all versions to derive contributors
    const versions = await prisma.artifactVersion.findMany({
      where: { artifactId },
      orderBy: { version: "asc" },
    });

    const contributors: AgentType[] = [];
    const seen = new Set<string>();
    for (const v of versions) {
      if (v.agentId && !seen.has(v.agentId)) {
        seen.add(v.agentId);
        contributors.push(v.agentId as AgentType);
      }
    }

    return {
      id: updated.id,
      type: updated.type as ArtifactType,
      title: updated.title,
      content: updated.content,
      status: updated.status as ArtifactStatus,
      createdByAgentId: (updated.createdByAgentId as AgentType) ?? null,
      version: updated.version,
      contributors,
    };
  },


  /**
   * Changes the status of an artifact with validation of allowed transitions.
   * Valid transitions: draft->accepted, draft->rejected, accepted->draft
   */
  async changeStatus(
    artifactId: string,
    status: ArtifactStatus,
    agentId?: AgentType
  ): Promise<ArtifactState> {
    // Get current artifact to validate transition
    const current = await prisma.artifact.findUniqueOrThrow({
      where: { id: artifactId },
    });

    const allowedTransitions = VALID_STATUS_TRANSITIONS[current.status] ?? [];
    if (!allowedTransitions.includes(status)) {
      throw new Error(
        `Invalid status transition: cannot change from '${current.status}' to '${status}'. ` +
          `Allowed transitions from '${current.status}': ${allowedTransitions.join(", ") || "none"}`
      );
    }


    // Update the status
    const updated = await prisma.artifact.update({
      where: { id: artifactId },
      data: { status },
      include: { versions: true },
    });

    // Persist artifact-status-changed event
    await eventStore.appendEvent({
      sessionId: updated.sessionId,
      type: "artifact-status-changed",
      agentId: agentId ?? null,
      round: 0,
      stage: null,
      content: {
        artifactId,
        previousStatus: current.status,
        newStatus: status,
      },
    });

    return mapToArtifactState(updated);
  },


  /**
   * Finds an artifact by sessionId, type, and title (case-insensitive title match).
   * Used for deduplication when multiple agents suggest the same artifact.
   */
  async findByTitleAndType(
    sessionId: string,
    type: ArtifactType,
    title: string
  ): Promise<ArtifactState | null> {
    // Since SQLite with Prisma may not support mode: 'insensitive',
    // we fetch all artifacts matching sessionId + type and filter manually
    const artifacts = await prisma.artifact.findMany({
      where: {
        sessionId,
        type,
      },
      include: { versions: true },
    });

    const normalizedTitle = title.toLowerCase();
    const match = artifacts.find(
      (a) => a.title.toLowerCase() === normalizedTitle
    );

    if (!match) return null;
    return mapToArtifactState(match);
  },


  /**
   * Returns all artifacts for a given session.
   */
  async getSessionArtifacts(sessionId: string): Promise<ArtifactState[]> {
    const artifacts = await prisma.artifact.findMany({
      where: { sessionId },
      include: { versions: true },
      orderBy: { createdAt: "asc" },
    });

    return artifacts.map(mapToArtifactState);
  },

  /**
   * Returns all versions for a given artifact, ordered by version number ascending.
   */
  async getArtifactVersions(artifactId: string): Promise<ArtifactVersion[]> {
    const versions = await prisma.artifactVersion.findMany({
      where: { artifactId },
      orderBy: { version: "asc" },
    });

    return versions.map(mapToArtifactVersion);
  },


  /**
   * Returns a single artifact by ID.
   */
  async getArtifact(artifactId: string): Promise<ArtifactState> {
    const artifact = await prisma.artifact.findUniqueOrThrow({
      where: { id: artifactId },
      include: { versions: true },
    });

    return mapToArtifactState(artifact);
  },
};
