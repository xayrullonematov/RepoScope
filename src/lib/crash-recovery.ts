/**
 * Crash Recovery
 *
 * Detects and recovers from incomplete round execution.
 * Called on application startup for any session with status='active'
 * and a locked state (stale lock > 5 minutes).
 *
 * Uses the event log (stage-progress events) to determine which agents
 * completed their work and which need re-execution.
 */

import { prisma } from "@/lib/db";
import { eventStore } from "@/lib/event-store";
import type { AgentType, CrashRecovery, RoundStage } from "@/types/domain";

// =============================================================================
// CONSTANTS
// =============================================================================

/** All 4 agents that must complete each stage */
const ALL_AGENTS: AgentType[] = [
  "senior-engineer",
  "security-engineer",
  "performance-engineer",
  "product-engineer",
];

/** Stale lock threshold: 5 minutes in milliseconds */
const STALE_LOCK_THRESHOLD_MS = 5 * 60 * 1000;

// =============================================================================
// IMPLEMENTATION
// =============================================================================

export const crashRecovery: CrashRecovery = {
  /**
   * Detect if a session has an incomplete round (crashed mid-execution).
   *
   * A session is considered to have an incomplete round if:
   * - status is 'active'
   * - lockedBy is not null (or lockedAt is stale > 5 min)
   *
   * If detected, queries stage-progress events for the current round+stage
   * to determine which agents have already completed their work.
   *
   * @param sessionId - The session to check
   * @returns Object with round, stage, and completedAgents, or null if no incomplete round
   */
  async detectIncompleteRound(
    sessionId: string
  ): Promise<{
    round: number;
    stage: RoundStage;
    completedAgents: AgentType[];
  } | null> {
    const staleThreshold = new Date(
      Date.now() - STALE_LOCK_THRESHOLD_MS
    );

    // Query session: must be active AND have a lock (either active or stale)
    const session = await prisma.session.findFirst({
      where: {
        id: sessionId,
        status: "active",
        lockedBy: { not: null },
      },
      select: {
        currentRound: true,
        currentStage: true,
        lockedAt: true,
      },
    });

    if (!session) {
      return null;
    }

    // Only consider it an incomplete round if the lock is stale
    if (session.lockedAt && session.lockedAt > staleThreshold) {
      // Lock is still fresh — the round may still be actively executing
      return null;
    }

    const round = session.currentRound;
    const stage = session.currentStage as RoundStage | null;

    if (!stage || round === 0) {
      return null;
    }

    // Query stage-progress events for the current round+stage
    const stageEvents = await eventStore.getRoundEvents(
      sessionId,
      round,
      stage
    );

    // Extract which agents have completed (have stage-progress events)
    const completedAgents: AgentType[] = [];
    for (const event of stageEvents) {
      if (event.type === "stage-progress" && event.agentId) {
        if (
          ALL_AGENTS.includes(event.agentId as AgentType) &&
          !completedAgents.includes(event.agentId as AgentType)
        ) {
          completedAgents.push(event.agentId as AgentType);
        }
      }
    }

    return { round, stage, completedAgents };
  },

  /**
   * Recover an incomplete stage by determining which agents need re-execution.
   *
   * Calls detectIncompleteRound to find the current state, then computes
   * the difference between ALL_AGENTS and completedAgents to identify
   * agents that did not finish.
   *
   * @param sessionId - The session to recover
   * @returns Array of AgentTypes that need re-execution, or empty array if nothing to recover
   */
  async recoverIncompleteStage(sessionId: string): Promise<AgentType[]> {
    const incompleteRound =
      await crashRecovery.detectIncompleteRound(sessionId);

    if (!incompleteRound) {
      return [];
    }

    // Compare completedAgents with ALL_AGENTS to find who needs re-execution
    const agentsNeedingReExecution = ALL_AGENTS.filter(
      (agent) => !incompleteRound.completedAgents.includes(agent)
    );

    return agentsNeedingReExecution;
  },
};
