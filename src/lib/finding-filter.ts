/**
 * Finding Filter — Post-consensus confidence-weighted filter that demotes
 * or removes low-signal findings before they reach the user report.
 *
 * Scoring heuristic:
 *   - Mentioned by 2+ agents → +2
 *   - Has a file-path reference (grounded) → +2
 *   - Consensus confidence on parent agreement ≥ 0.7 → +1
 *   - Severity high/critical → +1
 *   - Only mentioned by 1 agent with no file reference → score stays low
 *
 * Findings with score < 2 are demoted to "informational" (hidden from
 * the primary report view but visible in the full activity log).
 */

import type {
  ArtifactState,
  ConsensusOutput,
  PersistedEvent,
  AgentType,
} from "@/types/domain";

export interface FilteredFinding {
  artifact: ArtifactState;
  score: number;
  grounded: boolean;
  supportCount: number;
  demoted: boolean;
}

/** Minimum score to appear in the primary report */
const PROMOTION_THRESHOLD = 2;

/**
 * Filter and score findings after consensus. Returns all findings annotated
 * with their score and demotion status.
 */
export function filterFindings(
  artifacts: ArtifactState[],
  consensus: ConsensusOutput | null,
  roundEvents: PersistedEvent[]
): FilteredFinding[] {
  // Build a map of which agents mentioned each finding title (normalized)
  const mentionMap = buildMentionMap(roundEvents);

  return artifacts.map((artifact) => {
    let score = 0;
    const key = normalize(artifact.title);

    // 1. Cross-agent support count
    const supportCount = mentionMap.get(key)?.size ?? (artifact.createdByAgentId ? 1 : 0);
    if (supportCount >= 2) score += 2;

    // 2. Grounded (has file path reference in content)
    const grounded = hasFileReference(artifact.content);
    if (grounded) score += 2;

    // 3. Consensus confidence boost
    if (consensus) {
      const inAgreement = consensus.agreements.some(
        (a) => normalize(a.point).includes(key) || key.includes(normalize(a.point))
      );
      if (inAgreement && consensus.overallConfidence >= 0.7) score += 1;
    }

    // 4. Severity boost
    const severity = extractSeverity(artifact.content);
    if (severity === "high" || severity === "critical") score += 1;

    const demoted = score < PROMOTION_THRESHOLD;

    return { artifact, score, grounded, supportCount, demoted };
  });
}

/**
 * Convenience: return only non-demoted findings for the primary report.
 */
export function getPromotedFindings(
  artifacts: ArtifactState[],
  consensus: ConsensusOutput | null,
  roundEvents: PersistedEvent[]
): ArtifactState[] {
  return filterFindings(artifacts, consensus, roundEvents)
    .filter((f) => !f.demoted)
    .map((f) => f.artifact);
}

// =============================================================================
// HELPERS
// =============================================================================

function normalize(text: string): string {
  return text.toLowerCase().trim().replace(/[^a-z0-9 ]/g, "");
}

/** Check if content references a file path (e.g. src/..., ./..., *.ts) */
function hasFileReference(content: string): boolean {
  return /(?:^|\s|`)((?:src|lib|app|pages|components|api|config|prisma)\/[\w./-]+|\.\/[\w./-]+|\w+\.\w{1,4}:\d+)/i.test(
    content
  );
}

/** Extract severity from artifact content (often embedded as JSON or text) */
function extractSeverity(content: string): string | null {
  const match = content.match(/"severity"\s*:\s*"(high|medium|low|critical)"/i);
  if (match) return match[1].toLowerCase();
  // Check for text-based severity markers
  if (/\b(critical|high[- ]severity)\b/i.test(content)) return "high";
  return null;
}

/**
 * Build a map: normalized finding title → set of agent IDs that mentioned it.
 * Scans proposal, critique, and revision events for title mentions.
 */
function buildMentionMap(events: PersistedEvent[]): Map<string, Set<AgentType>> {
  const map = new Map<string, Set<AgentType>>();

  for (const event of events) {
    if (!event.agentId) continue;
    const agentId = event.agentId as AgentType;

    // Parse event content for artifact suggestions or risk mentions
    let parsed: Record<string, unknown>;
    try {
      parsed =
        typeof event.content === "string"
          ? JSON.parse(event.content)
          : (event.content as Record<string, unknown>);
    } catch {
      continue;
    }

    // Collect titles from artifactSuggestions
    const suggestions = parsed.artifactSuggestions as
      | { title: string }[]
      | undefined;
    if (Array.isArray(suggestions)) {
      for (const s of suggestions) {
        if (s.title) {
          const key = normalize(s.title);
          if (!map.has(key)) map.set(key, new Set());
          map.get(key)!.add(agentId);
        }
      }
    }

    // Collect from risks
    const risks = parsed.risks as { description: string }[] | undefined;
    if (Array.isArray(risks)) {
      for (const r of risks) {
        if (r.description) {
          const key = normalize(r.description);
          if (!map.has(key)) map.set(key, new Set());
          map.get(key)!.add(agentId);
        }
      }
    }

    // Collect from recommendations
    const recs = parsed.recommendations as string[] | undefined;
    if (Array.isArray(recs)) {
      for (const rec of recs) {
        const key = normalize(rec);
        if (!map.has(key)) map.set(key, new Set());
        map.get(key)!.add(agentId);
      }
    }
  }

  return map;
}
