/**
 * Startup Recovery — Checks for sessions with stale locks on application startup
 * and recovers them by releasing locks and marking incomplete rounds.
 *
 * This should be called once when the application starts.
 * In Next.js, we invoke it lazily on first request or via a middleware.
 */

import { prisma } from "@/lib/db";
import { crashRecovery } from "@/lib/crash-recovery";
import { sessionLock } from "@/lib/session-lock";
import type { AgentType } from "@/types/domain";

/** Flag to ensure recovery only runs once per process */
let recoveryComplete = false;

/**
 * Runs startup recovery for all sessions with stale locks.
 * Idempotent — safe to call multiple times (no-op after first run).
 */
export async function runStartupRecovery(): Promise<void> {
  if (recoveryComplete) return;

  try {
    const STALE_THRESHOLD_MS = 5 * 60 * 1000;
    const staleThreshold = new Date(Date.now() - STALE_THRESHOLD_MS);

    // Find all sessions with stale locks
    const staleSessions = await prisma.session.findMany({
      where: {
        status: "active",
        lockedBy: { not: null },
        lockedAt: { lt: staleThreshold },
      },
      select: { id: true },
    });

    for (const session of staleSessions) {
      console.log(`[RECOVERY] Recovering stale session: ${session.id}`);

      // Detect incomplete round
      const incomplete = await crashRecovery.detectIncompleteRound(session.id);

      if (incomplete) {
        const missingAgents: AgentType[] = await crashRecovery.recoverIncompleteStage(session.id);
        console.log(
          `[RECOVERY] Session ${session.id}: Round ${incomplete.round}, Stage ${incomplete.stage}, ` +
          `Completed: [${incomplete.completedAgents.join(", ")}], ` +
          `Needs re-execution: [${missingAgents.join(", ")}]`
        );
      }

      // Force-release the stale lock so the user can retry
      await sessionLock.forceRelease(session.id);
      console.log(`[RECOVERY] Released stale lock for session: ${session.id}`);
    }

    if (staleSessions.length === 0) {
      console.log("[RECOVERY] No stale sessions found.");
    }
  } catch (error) {
    console.error("[RECOVERY] Error during startup recovery:", error);
  } finally {
    recoveryComplete = true;
  }
}
