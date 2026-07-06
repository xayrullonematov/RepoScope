import { describe, expect, it } from "vitest";
import { deriveFindingLineages } from "@/lib/finding-lineage";
import type { PersistedEvent } from "@/types/domain";

function event(
  id: string,
  type: PersistedEvent["type"],
  stage: PersistedEvent["stage"],
  content: unknown,
  agentId: PersistedEvent["agentId"] = null,
): PersistedEvent {
  return {
    id,
    sessionId: "lineage-session",
    type,
    agentId,
    round: 1,
    stage,
    content: JSON.stringify(content),
    timestamp: "2026-07-06T00:00:00.000Z",
  };
}

describe("finding lineage", () => {
  it("traces exact evidence IDs through proposal, critique, revision, and consensus", () => {
    const events: PersistedEvent[] = [
      event("proposal-1", "proposal", "proposal", {
        summary: "The auth middleware trusts an unsigned role header.",
        recommendations: ["Validate roles against the server-side session."],
        risks: [],
      }, "security-engineer"),
      event("critique-1", "critique", "critique", {
        summary: "The proposed fix ignores latency at the session store.",
        targetAgentId: "security-engineer",
        objections: [{ point: "Avoid a database lookup on every request.", reasoning: "It increases tail latency.", severity: "major" }],
      }, "performance-engineer"),
      event("revision-1", "revision", "revision", {
        summary: "Use signed, short-lived role claims with server-side revocation.",
        stance: "partially-concede",
        concededPoints: [{ point: "Avoid synchronous lookups on the hot path.", reasoning: "Signed claims preserve latency." }],
        maintainedPoints: [],
      }, "security-engineer"),
      event("consensus-1", "consensus-update", "consensus", {
        agreements: [{
          point: "Replace the trusted role header with signed role claims.",
          supportingAgents: ["security-engineer", "performance-engineer"],
          reasoning: "This closes the spoofing risk without adding a database lookup to every request.",
          evidenceChain: ["proposal-1", "critique-1", "revision-1"],
        }],
        disagreements: [],
      }),
    ];

    const [lineage] = deriveFindingLineages(events);
    expect(lineage.title).toContain("signed role claims");
    expect(lineage.stageCoverage).toBe(3);
    expect(lineage.steps.map((step) => step.stage)).toEqual(["proposal", "critique", "revision", "consensus"]);
    expect(lineage.steps[1].targetAgentId).toBe("security-engineer");
    expect(lineage.steps.map((step) => step.eventId)).toEqual(["proposal-1", "critique-1", "revision-1", "consensus-1"]);
  });

  it("does not invent a lineage from missing or single-stage evidence", () => {
    const events: PersistedEvent[] = [
      event("proposal-1", "proposal", "proposal", { summary: "A claim" }, "senior-engineer"),
      event("consensus-1", "consensus-update", "consensus", {
        agreements: [{
          point: "Unsupported conclusion",
          supportingAgents: ["senior-engineer"],
          reasoning: "Not enough linked debate evidence.",
          evidenceChain: ["proposal-1", "missing-event"],
        }],
        disagreements: [],
      }),
    ];

    expect(deriveFindingLineages(events)).toEqual([]);
  });
});
