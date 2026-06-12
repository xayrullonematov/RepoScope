import { artifactStore } from "@/lib/artifact-store";
import type {
  ArtifactSummaryService,
  ArtifactState,
} from "@/types/domain";

/**
 * ArtifactSummaryService implementation.
 *
 * This service is ALWAYS deterministic (no LLM needed).
 * Returns all artifacts with first 150 chars of content as excerpt.
 * Simply delegates to artifactStore.getSessionArtifacts() and truncates content.
 */

/**
 * Truncates artifact content to the first 150 characters,
 * appending "..." if the content was truncated.
 */
function truncateContent(content: string, maxLength: number = 150): string {
  if (content.length <= maxLength) {
    return content;
  }
  return content.slice(0, maxLength) + "...";
}

export const artifactSummaryService: ArtifactSummaryService = {
  /**
   * Returns all artifacts for the session with content truncated to 150 chars.
   * Delegates to artifactStore.getSessionArtifacts() and maps content to excerpts.
   */
  async generateArtifactSummary(sessionId: string): Promise<ArtifactState[]> {
    const artifacts = await artifactStore.getSessionArtifacts(sessionId);

    // Return artifacts with truncated content as excerpts
    return artifacts.map((artifact) => ({
      ...artifact,
      content: truncateContent(artifact.content),
    }));
  },
};
