import { prisma } from "@/lib/db";
import type { Event as PrismaEvent } from "@/generated/prisma/client";
import type {
  EventStore,
  NewEvent,
  PersistedEvent,
  RoundStage,
} from "@/types/domain";

/**
 * Maps a Prisma Event record to the PersistedEvent domain interface.
 * Content remains as a JSON string — the caller decides how to parse it.
 */
function mapToPersistedEvent(record: PrismaEvent): PersistedEvent {
  return {
    id: record.id,
    sessionId: record.sessionId,
    type: record.type as PersistedEvent["type"],
    agentId: record.agentId as PersistedEvent["agentId"],
    round: record.round,
    stage: record.stage as PersistedEvent["stage"],
    content: record.content,
    timestamp: record.timestamp.toISOString(),
  };
}

/**
 * Event Store implementation backed by Prisma + SQLite.
 * Append-only event log for the event-sourced architecture.
 */
export const eventStore: EventStore = {
  async appendEvent(event: NewEvent): Promise<PersistedEvent> {
    // Serialize content to JSON string if it's an object
    const contentStr =
      typeof event.content === "string"
        ? event.content
        : JSON.stringify(event.content);

    const created = await prisma.event.create({
      data: {
        sessionId: event.sessionId,
        type: event.type,
        agentId: event.agentId ?? null,
        round: event.round,
        stage: event.stage ?? null,
        content: contentStr,
      },
    });

    return mapToPersistedEvent(created);
  },

  async getSessionEvents(sessionId: string): Promise<PersistedEvent[]> {
    const events = await prisma.event.findMany({
      where: { sessionId },
      orderBy: { timestamp: "asc" },
    });

    return events.map(mapToPersistedEvent);
  },

  async getRoundEvents(
    sessionId: string,
    round: number,
    stage?: RoundStage
  ): Promise<PersistedEvent[]> {
    const where: { sessionId: string; round: number; stage?: string } = {
      sessionId,
      round,
    };

    if (stage !== undefined) {
      where.stage = stage;
    }

    const events = await prisma.event.findMany({
      where,
      orderBy: { timestamp: "asc" },
    });

    return events.map(mapToPersistedEvent);
  },

  async getEventsUpTo(
    sessionId: string,
    timestamp: Date
  ): Promise<PersistedEvent[]> {
    const events = await prisma.event.findMany({
      where: {
        sessionId,
        timestamp: { lte: timestamp },
      },
      orderBy: { timestamp: "asc" },
    });

    return events.map(mapToPersistedEvent);
  },
};
