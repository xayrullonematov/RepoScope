import { prisma } from "@/lib/db";
import { eventStore } from "@/lib/event-store";
import { snapshotManager } from "@/lib/snapshot-manager";
import type {
  WorkspaceSummaryService,
  SessionState,
} from "@/types/domain";

/**
 * WorkspaceSummaryService implementation.
 *
 * Maintains a running compressed summary of workspace state for agent context.
 * For MVP, ONLY the deterministic fallback is implemented (no LLM call).
 * This makes the service always available without cost.
 *
 * Deterministic fallback template:
 * "Session: {title}. Problem: {first 200 chars of problemDescription}.
 *  Rounds completed: {N}. Artifacts: {count} ({accepted} accepted, {draft} draft).
 *  Active constraints: {constraint texts joined}.
 *  Last consensus: {consensus summary or 'none yet'}."
 */

// In-memory cache for summaries (keyed by sessionId)
const summaryCache = new Map<string, string>();

/**
 * Generates a deterministic summary from the projected session state.
 * No LLM call — uses a fixed template to produce context for agents.
 */
function buildDeterministicSummary(
  session: { title: string | null; problemDescription: string },
  state: SessionState
): string {
  const title = session.title || "Untitled Session";
  const problem = session.problemDescription.slice(0, 200);
  const roundsCompleted = state.rounds.length;

  const totalArtifacts = state.artifacts.length;
  const acceptedCount = state.artifacts.filter(
    (a) => a.status === "accepted"
  ).length;
  const draftCount = state.artifacts.filter(
    (a) => a.status === "draft"
  ).length;

  const constraintTexts = state.constraints
    .map((c) => c.text)
    .join("; ");
  const constraintsStr = constraintTexts || "none";

  let consensusSummary = "none yet";
  if (state.consensus) {
    const agreementPoints = state.consensus.agreements
      .map((a) => a.point)
      .slice(0, 3)
      .join("; ");
    consensusSummary = agreementPoints || "none yet";
  }

  return `Session: ${title}. Problem: ${problem}. Rounds completed: ${roundsCompleted}. Artifacts: ${totalArtifacts} (${acceptedCount} accepted, ${draftCount} draft). Active constraints: ${constraintsStr}. Last consensus: ${consensusSummary}.`;
}

export const workspaceSummaryService: WorkspaceSummaryService = {
  /**
   * Generates a compressed workspace summary.
   * For MVP, uses the deterministic fallback template (no LLM call).
   * Caches the result in memory for subsequent getSummary calls.
   */
  async generateSummary(sessionId: string): Promise<string> {
    // Get session metadata from DB
    const session = await prisma.session.findUniqueOrThrow({
      where: { id: sessionId },
    });

    // Get projected state via snapshot manager (O(k) performance)
    const state = await snapshotManager.projectFromSnapshot(sessionId);

    // Build deterministic summary
    const summary = buildDeterministicSummary(session, state);

    // Cache the summary in memory
    summaryCache.set(sessionId, summary);

    return summary;
  },

  /**
   * Returns cached summary if available, otherwise generates a new one.
   * Checks in-memory cache first, then falls back to generating.
   */
  async getSummary(sessionId: string): Promise<string> {
    // Check in-memory cache
    const cached = summaryCache.get(sessionId);
    if (cached) {
      return cached;
    }

    // No cache — generate and cache
    return workspaceSummaryService.generateSummary(sessionId);
  },
};
