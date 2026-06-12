import { prisma } from "@/lib/db";
import type { SessionLock } from "@/types/domain";

/**
 * Stale lock threshold in milliseconds (5 minutes).
 * If a lock's `lockedAt` timestamp is older than this threshold,
 * the lock is considered stale and can be acquired by a new request.
 * This handles the case where a round crashes mid-execution and the
 * lock is never explicitly released.
 */
const STALE_LOCK_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * SessionLock implementation.
 *
 * Prevents concurrent round execution on the same session using the
 * `lockedBy` and `lockedAt` fields on the Session model.
 *
 * Uses Prisma's `updateMany` with WHERE clauses to achieve atomic
 * lock acquisition without explicit database-level locking primitives.
 * The WHERE clause ensures only one caller can successfully acquire
 * the lock even under concurrent requests (compare-and-swap pattern).
 *
 * Stale lock recovery: If a lock is older than 5 minutes, it is
 * considered abandoned (the round executor likely crashed) and a new
 * acquire call will succeed, taking over the lock.
 */
export const sessionLock: SessionLock = {
  /**
   * Atomically acquire the session lock.
   *
   * Sets `lockedBy = lockId` and `lockedAt = now()` ONLY IF:
   * - The session is currently unlocked (lockedBy IS NULL), OR
   * - The existing lock is stale (lockedAt is older than 5 minutes)
   *
   * Uses `updateMany` with a compound WHERE clause to make this atomic.
   * If the update affected 1 row, the lock was acquired. If 0 rows
   * were affected, another process holds an active lock.
   *
   * @param sessionId - The session to lock
   * @param lockId - A unique identifier for this lock holder (e.g., a cuid)
   * @returns true if the lock was successfully acquired, false otherwise
   */
  async acquire(sessionId: string, lockId: string): Promise<boolean> {
    const now = new Date();
    const staleThreshold = new Date(now.getTime() - STALE_LOCK_THRESHOLD_MS);

    const result = await prisma.session.updateMany({
      where: {
        id: sessionId,
        OR: [
          // Case 1: No lock exists
          { lockedBy: null },
          // Case 2: Lock is stale (older than 5 minutes)
          { lockedAt: { lt: staleThreshold } },
        ],
      },
      data: {
        lockedBy: lockId,
        lockedAt: now,
      },
    });

    return result.count > 0;
  },

  /**
   * Release the session lock.
   *
   * Clears `lockedBy` and `lockedAt` ONLY IF the current lock is held
   * by the specified lockId. This ensures a process can only release
   * its own lock, preventing accidental release of another process's lock.
   *
   * @param sessionId - The session to unlock
   * @param lockId - The lock holder's identifier (must match current lockedBy)
   */
  async release(sessionId: string, lockId: string): Promise<void> {
    await prisma.session.updateMany({
      where: {
        id: sessionId,
        lockedBy: lockId,
      },
      data: {
        lockedBy: null,
        lockedAt: null,
      },
    });
  },

  /**
   * Check if a session is currently locked with an active (non-stale) lock.
   *
   * Returns true if:
   * - `lockedBy` is not null, AND
   * - `lockedAt` is within the last 5 minutes (not stale)
   *
   * Returns false if not locked or the lock is stale.
   *
   * @param sessionId - The session to check
   * @returns true if actively locked, false otherwise
   */
  async isLocked(sessionId: string): Promise<boolean> {
    const staleThreshold = new Date(
      Date.now() - STALE_LOCK_THRESHOLD_MS
    );

    const session = await prisma.session.findFirst({
      where: {
        id: sessionId,
        lockedBy: { not: null },
        lockedAt: { gte: staleThreshold },
      },
      select: { id: true },
    });

    return session !== null;
  },

  /**
   * Force-release the session lock unconditionally.
   *
   * Clears `lockedBy` and `lockedAt` regardless of who holds the lock.
   * Used for admin/recovery scenarios where a stale lock needs to be
   * cleared immediately without waiting for the 5-minute threshold.
   *
   * @param sessionId - The session to forcefully unlock
   */
  async forceRelease(sessionId: string): Promise<void> {
    await prisma.session.updateMany({
      where: {
        id: sessionId,
      },
      data: {
        lockedBy: null,
        lockedAt: null,
      },
    });
  },
};
