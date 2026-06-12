import { eventStore } from "@/lib/event-store";
import { snapshotManager } from "@/lib/snapshot-manager";
import type {
  RoundSummaryService,
  RoundSummary,
  PersistedEvent,
  ProposalOutput,
  CritiqueOutput,
  RevisionOutput,
  ConsensusOutput,
} from "@/types/domain";

/**
 * RoundSummaryService implementation.
 *
 * For MVP, extracts round summaries deterministically from structured outputs:
 * - keyProposals: extract summary field from each ProposalOutput
 * - majorCritiques: extract objection points from CritiqueOutputs
 * - revisionOutcomes: extract stance from each RevisionOutput
 * - consensusPoints: extract agreement points from ConsensusOutput
 * - artifactsCreated/Updated: count from artifact events in that round
 *
 * No LLM call is needed — all data is already structured in events.
 */

/**
 * Safely parses JSON content from an event, returning null on failure.
 */
function parseEventContent<T>(event: PersistedEvent): T | null {
  try {
    return JSON.parse(event.content) as T;
  } catch {
    return null;
  }
}

/**
 * Extracts a deterministic RoundSummary from the events of a given round.
 */
function extractRoundSummaryFromEvents(
  round: number,
  events: PersistedEvent[]
): RoundSummary {
  const keyProposals: string[] = [];
  const majorCritiques: string[] = [];
  const revisionOutcomes: string[] = [];
  const consensusPoints: string[] = [];
  let artifactsCreated = 0;
  let artifactsUpdated = 0;

  for (const event of events) {
    switch (event.type) {
      case "proposal": {
        const proposal = parseEventContent<ProposalOutput>(event);
        if (proposal?.summary) {
          keyProposals.push(proposal.summary);
        }
        break;
      }
      case "critique": {
        const critique = parseEventContent<CritiqueOutput>(event);
        if (critique?.objections) {
          for (const objection of critique.objections) {
            if (
              objection.severity === "critical" ||
              objection.severity === "major"
            ) {
              majorCritiques.push(objection.point);
            }
          }
        }
        break;
      }
      case "revision": {
        const revision = parseEventContent<RevisionOutput>(event);
        if (revision) {
          const agentLabel = event.agentId || "unknown";
          revisionOutcomes.push(
            `${agentLabel}: ${revision.stance}`
          );
        }
        break;
      }
      case "consensus-update": {
        const consensus = parseEventContent<ConsensusOutput>(event);
        if (consensus?.agreements) {
          for (const agreement of consensus.agreements) {
            consensusPoints.push(agreement.point);
          }
        }
        break;
      }
      case "artifact-created": {
        artifactsCreated++;
        break;
      }
      case "artifact-updated": {
        artifactsUpdated++;
        break;
      }
    }
  }

  return {
    roundNumber: round,
    keyProposals,
    majorCritiques,
    revisionOutcomes,
    consensusPoints,
    artifactsCreated,
    artifactsUpdated,
  };
}

export const roundSummaryService: RoundSummaryService = {
  /**
   * Generates a deterministic round summary by extracting structured data
   * from all events in the specified round.
   */
  async generateRoundSummary(
    sessionId: string,
    round: number
  ): Promise<RoundSummary> {
    const events = await eventStore.getRoundEvents(sessionId, round);
    return extractRoundSummaryFromEvents(round, events);
  },

  /**
   * Returns all round summaries for a session.
   * Derives them from projected state (which already contains rounds)
   * and supplements with event-level data for artifact counts.
   */
  async getRoundSummaries(sessionId: string): Promise<RoundSummary[]> {
    const state = await snapshotManager.projectFromSnapshot(sessionId);

    if (state.rounds.length === 0) {
      return [];
    }

    // Generate summaries for all completed rounds
    const summaries: RoundSummary[] = [];
    for (const round of state.rounds) {
      const roundEvents = await eventStore.getRoundEvents(
        sessionId,
        round.number
      );
      summaries.push(
        extractRoundSummaryFromEvents(round.number, roundEvents)
      );
    }

    return summaries;
  },
};
