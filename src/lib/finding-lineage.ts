import type { AgentType, ConsensusOutput, PersistedEvent } from "@/types/domain";

export type LineageStage = "proposal" | "critique" | "revision" | "consensus";

export interface FindingLineageStep {
  stage: LineageStage;
  eventId: string;
  agentId: AgentType | null;
  targetAgentId?: AgentType;
  summary: string;
  detail?: string;
  stance?: string;
}

export interface FindingLineage {
  id: string;
  round: number;
  kind: "agreement" | "disagreement";
  title: string;
  reasoning: string;
  supportingAgents: AgentType[];
  steps: FindingLineageStep[];
  stageCoverage: number;
}

const stageOrder: Record<LineageStage, number> = {
  proposal: 0,
  critique: 1,
  revision: 2,
  consensus: 3,
};

function parseObject(content: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(content) as unknown;
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function firstString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function eventStep(event: PersistedEvent): FindingLineageStep | null {
  if (event.type !== "proposal" && event.type !== "critique" && event.type !== "revision") return null;
  const data = parseObject(event.content);
  if (!data) return null;

  if (event.type === "proposal") {
    const recommendations = Array.isArray(data.recommendations) ? data.recommendations : [];
    const risks = Array.isArray(data.risks) ? data.risks : [];
    const firstRisk = risks[0] && typeof risks[0] === "object" ? risks[0] as Record<string, unknown> : null;
    return {
      stage: "proposal",
      eventId: event.id,
      agentId: event.agentId,
      summary: firstString(recommendations[0]) ?? firstString(firstRisk?.description) ?? firstString(data.summary) ?? "Initial position",
      detail: firstString(data.summary),
    };
  }

  if (event.type === "critique") {
    const objections = Array.isArray(data.objections) ? data.objections : [];
    const objection = objections[0] && typeof objections[0] === "object" ? objections[0] as Record<string, unknown> : null;
    return {
      stage: "critique",
      eventId: event.id,
      agentId: event.agentId,
      targetAgentId: firstString(data.targetAgentId) as AgentType | undefined,
      summary: firstString(objection?.point) ?? firstString(data.summary) ?? "Opposing critique",
      detail: firstString(objection?.reasoning) ?? firstString(data.summary),
    };
  }

  const conceded = Array.isArray(data.concededPoints) ? data.concededPoints : [];
  const maintained = Array.isArray(data.maintainedPoints) ? data.maintainedPoints : [];
  const revisedPoint = [...conceded, ...maintained].find((item) => item && typeof item === "object") as Record<string, unknown> | undefined;
  return {
    stage: "revision",
    eventId: event.id,
    agentId: event.agentId,
    summary: firstString(revisedPoint?.point) ?? firstString(data.summary) ?? "Revised position",
    detail: firstString(revisedPoint?.reasoning) ?? firstString(data.summary),
    stance: firstString(data.stance),
  };
}

export function deriveFindingLineages(events: PersistedEvent[]): FindingLineage[] {
  const byId = new Map(events.map((event) => [event.id, event]));
  const lineages: FindingLineage[] = [];

  for (const consensusEvent of events) {
    if (consensusEvent.type !== "consensus-update") continue;
    const parsed = parseObject(consensusEvent.content) as ConsensusOutput | null;
    if (!parsed) continue;

    const candidates = [
      ...(parsed.agreements ?? []).map((item, index) => ({
        id: `${consensusEvent.id}:agreement:${index}`,
        kind: "agreement" as const,
        title: item.point,
        reasoning: item.reasoning,
        supportingAgents: item.supportingAgents,
        evidenceChain: item.evidenceChain,
      })),
      ...(parsed.disagreements ?? []).map((item, index) => ({
        id: `${consensusEvent.id}:disagreement:${index}`,
        kind: "disagreement" as const,
        title: item.point,
        reasoning: item.positions.map((position) => `${position.agentId}: ${position.reasoning}`).join(" "),
        supportingAgents: item.positions.map((position) => position.agentId),
        evidenceChain: item.evidenceChain,
      })),
    ];

    for (const candidate of candidates) {
      const evidenceSteps = candidate.evidenceChain
        .map((id) => byId.get(id))
        .filter((event): event is PersistedEvent => Boolean(event && event.round === consensusEvent.round))
        .map(eventStep)
        .filter((step): step is FindingLineageStep => step !== null);

      // Keep one authoritative event per stage so the visual reads as an
      // evolution, not a raw event dump. Event IDs remain visible for audit.
      const stepByStage = new Map<LineageStage, FindingLineageStep>();
      for (const step of evidenceSteps) {
        if (!stepByStage.has(step.stage)) stepByStage.set(step.stage, step);
      }
      const evidenceStages = Array.from(stepByStage.values()).sort(
        (a, b) => stageOrder[a.stage] - stageOrder[b.stage],
      );
      if (evidenceStages.length < 2) continue;

      const steps = [
        ...evidenceStages,
        {
          stage: "consensus" as const,
          eventId: consensusEvent.id,
          agentId: null,
          summary: candidate.title,
          detail: candidate.reasoning,
        },
      ];
      lineages.push({
        id: candidate.id,
        round: consensusEvent.round,
        kind: candidate.kind,
        title: candidate.title,
        reasoning: candidate.reasoning,
        supportingAgents: candidate.supportingAgents,
        steps,
        stageCoverage: evidenceStages.length,
      });
    }
  }

  return lineages.sort((a, b) =>
    b.round - a.round || b.stageCoverage - a.stageCoverage || b.steps.length - a.steps.length,
  );
}
