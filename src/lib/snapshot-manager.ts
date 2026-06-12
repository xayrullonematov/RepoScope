import { prisma } from "@/lib/db";
import { eventStore } from "@/lib/event-store";
import { projectSessionState, applyEvents } from "@/lib/state-projector";
import type {
  SessionState,
  SnapshotManager,
  PersistedEvent,
} from "@/types/domain";

/**
 * Maps a raw Prisma Event record to the PersistedEvent domain interface.
 * Used when fetching incremental events after a snapshot.
 */
function mapToPersistedEvent(record: {
  id: string;
  sessionId: string;
  type: string;
  agentId: string | null;
  round: number;
  stage: string | null;
  content: string;
  timestamp: Date;
}): PersistedEvent {
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
 * SnapshotManager implementation.
 *
 * Provides O(1) state reconstruction by maintaining snapshots after each
 * completed round. Instead of replaying all events from the beginning,
 * the system loads the latest snapshot and only replays events since that point.
 *
 * Performance characteristics:
 * - createSnapshot: O(1) upsert
 * - getLatestSnapshot: O(1) query (indexed by sessionId, ordered by round desc)
 * - projectFromSnapshot: O(k) where k = events since last snapshot
 *   (vs O(n) for full event replay where n = total events)
 */
export const snapshotManager: SnapshotManager = {
  /**
   * Serialize the SessionState to JSON and upsert into the SessionSnapshot table.
   * Called after each round completes to checkpoint state.
   *
   * Uses upsert with compound unique key [sessionId, round] to handle
   * idempotent snapshot creation (safe to call multiple times for same round).
   */
  async createSnapshot(
    sessionId: string,
    round: number,
    state: SessionState
  ): Promise<void> {
    const serializedState = JSON.stringify(state);

    await prisma.sessionSnapshot.upsert({
      where: {
        sessionId_round: { sessionId, round },
      },
      update: {
        state: serializedState,
      },
      create: {
        sessionId,
        round,
        state: serializedState,
      },
    });
  },

  /**
   * Find the most recent snapshot for a session.
   * Returns the round number and deserialized SessionState, or null if
   * no snapshot exists (e.g., no rounds have completed yet).
   */
  async getLatestSnapshot(
    sessionId: string
  ): Promise<{ round: number; state: SessionState } | null> {
    const snapshot = await prisma.sessionSnapshot.findFirst({
      where: { sessionId },
      orderBy: { round: "desc" },
      take: 1,
    });

    if (!snapshot) {
      return null;
    }

    const state = JSON.parse(snapshot.state) as SessionState;
    return { round: snapshot.round, state };
  },

  /**
   * Project the current SessionState using the most efficient path:
   *
   * 1. If a snapshot exists: load it, then replay only events AFTER that
   *    snapshot's round (O(k) where k = events in current round).
   * 2. If no snapshot exists: fall back to full projection from all events (O(n)).
   *
   * This gives O(1) for accessing past round state + O(k) for current round
   * events only, making session detail API calls fast regardless of total
   * event count.
   */
  async projectFromSnapshot(sessionId: string): Promise<SessionState> {
    const snapshot = await snapshotManager.getLatestSnapshot(sessionId);

    if (!snapshot) {
      // No snapshot exists — fall back to full projection from all events
      const allEvents = await eventStore.getSessionEvents(sessionId);
      return projectSessionState(allEvents);
    }

    // Get only events AFTER the snapshot's round
    const incrementalEvents = await prisma.event.findMany({
      where: {
        sessionId,
        round: { gt: snapshot.round },
      },
      orderBy: { timestamp: "asc" },
    });

    if (incrementalEvents.length === 0) {
      // No events since snapshot — return snapshot state directly
      return snapshot.state;
    }

    // Apply incremental events on top of the snapshot state
    const mappedEvents = incrementalEvents.map(mapToPersistedEvent);
    return applyEvents(snapshot.state, mappedEvents);
  },
};
