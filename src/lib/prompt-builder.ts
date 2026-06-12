/**
 * PromptBuilder — Assembles structured LLM prompts for each debate stage.
 *
 * Implements the PromptBuilder interface from @/types/domain.
 * Each method returns an LLMRequest with systemPrompt, userMessage,
 * and responseFormat: "json".
 */

import type {
  AgentConfig,
  CritiqueOutput,
  LLMRequest,
  PersistedEvent,
  ProposalOutput,
  PromptBuilder as IPromptBuilder,
  WorkspaceContext,
} from "@/types/domain";

import { CRITIQUE_ROUTING } from "@/lib/agent-configs";


// =============================================================================
// SCHEMA DESCRIPTIONS (included in prompts for LLM guidance)
// =============================================================================

const PROPOSAL_SCHEMA_DESC = `{
  "summary": "string (your proposal summary)",
  "recommendations": ["string (specific recommendations)"],
  "risks": [{"description": "string", "severity": "high|medium|low", "mitigation": "string (optional)"}],
  "assumptions": ["string (assumptions you are making)"],
  "confidence": number (0-1),
  "artifactSuggestions": [{"type": "decision|risk|assumption|tradeoff|open-question|recommendation", "title": "string", "content": "string"}],
  "references": [{"agentId": "string (optional)", "artifactId": "string (optional)", "description": "string"}],
  "needsClarification": boolean,
  "clarificationQuestions": ["string (optional, if needsClarification is true)"]
}`;


const CRITIQUE_SCHEMA_DESC = `{
  "summary": "string (critique summary)",
  "targetAgentId": "senior-engineer|security-engineer|performance-engineer|product-engineer",
  "objections": [{"point": "string", "reasoning": "string", "severity": "critical|major|minor"}],
  "acknowledgedStrengths": ["string"],
  "confidence": number (0-1),
  "riskAssessments": [{"description": "string", "severity": "high|medium|low"}],
  "artifactSuggestions": [{"type": "decision|risk|assumption|tradeoff|open-question|recommendation", "title": "string", "content": "string"}],
  "references": [{"agentId": "string (optional)", "artifactId": "string (optional)", "description": "string"}],
  "needsClarification": boolean,
  "clarificationQuestions": ["string (optional)"]
}`;


const REVISION_SCHEMA_DESC = `{
  "summary": "string (revised position summary)",
  "stance": "agree|disagree|partially-concede|strengthen",
  "concededPoints": [{"point": "string", "reasoning": "string"}],
  "maintainedPoints": [{"point": "string", "reasoning": "string"}],
  "newArguments": ["string"],
  "confidence": number (0-1),
  "artifactSuggestions": [{"type": "decision|risk|assumption|tradeoff|open-question|recommendation", "title": "string", "content": "string"}],
  "needsClarification": boolean,
  "clarificationQuestions": ["string (optional)"]
}`;

const CONSENSUS_SCHEMA_DESC = `{
  "agreements": [{"point": "string", "supportingAgents": ["agent-id"], "reasoning": "string", "evidenceChain": ["event-id"]}],
  "disagreements": [{"point": "string", "positions": [{"agentId": "agent-id", "stance": "string", "reasoning": "string"}], "evidenceChain": ["event-id"]}],
  "recommendedDecisions": [{"title": "string", "description": "string", "confidence": number}],
  "identifiedRisks": [{"description": "string", "severity": "high|medium|low", "raisedBy": ["agent-id"]}],
  "openQuestions": ["string"],
  "overallConfidence": number (0-1),
  "artifactOperations": [{"operation": "create|update|accept|reject", "artifactId": "string (optional)", "type": "string (optional)", "title": "string", "content": "string", "sourceEventId": "string (optional)"}]
}`;


const JSON_ONLY_INSTRUCTION =
  "Return ONLY valid JSON matching the schema above. No markdown fences, no explanatory text.";

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatConstraints(constraints: WorkspaceContext["constraints"]): string {
  if (constraints.length === 0) return "None";
  return constraints
    .map((c) => `- [${c.category}] ${c.text}`)
    .join("\n");
}

function formatRoundSummaries(
  summaries: WorkspaceContext["roundSummaries"]
): string {
  if (summaries.length === 0) return "No prior rounds.";
  return summaries
    .map(
      (s) =>
        `Round ${s.roundNumber}:\n` +
        `  Proposals: ${s.keyProposals.join("; ")}\n` +
        `  Critiques: ${s.majorCritiques.join("; ")}\n` +
        `  Outcomes: ${s.revisionOutcomes.join("; ")}\n` +
        `  Consensus: ${s.consensusPoints.join("; ")}`
    )
    .join("\n\n");
}


function formatArtifacts(
  artifacts: WorkspaceContext["artifactSummaries"]
): string {
  if (artifacts.length === 0) return "No artifacts yet.";
  return artifacts
    .map(
      (a) =>
        `- [${a.type}] "${a.title}" (${a.status}, v${a.version}): ${a.content.slice(0, 200)}`
    )
    .join("\n");
}

function formatEvents(events: PersistedEvent[]): string {
  if (events.length === 0) return "No events in current round.";
  return events
    .map(
      (e) =>
        `[${e.id}] ${e.type} (agent: ${e.agentId ?? "system"}, stage: ${e.stage ?? "n/a"})`
    )
    .join("\n");
}


// =============================================================================
// PROMPT BUILDER IMPLEMENTATION
// =============================================================================

export class PromptBuilderImpl implements IPromptBuilder {
  /**
   * Builds a proposal prompt for a specific agent.
   */
  buildProposalPrompt(
    agent: AgentConfig,
    context: WorkspaceContext
  ): LLMRequest {
    const systemPrompt = [
      `You are ${agent.displayName}.`,
      ``,
      `## Your Objective Function`,
      agent.objectiveFunction,
      ``,
      `## Your Evaluation Criteria`,
      agent.evaluationCriteria.map((c) => `- ${c}`).join("\n"),
      ``,
      `## Output Schema`,
      PROPOSAL_SCHEMA_DESC,
      ``,
      JSON_ONLY_INSTRUCTION,
    ].join("\n");

    const userMessage = [
      `## Problem Description`,
      context.problemDescription,
      ``,
      `## Active Constraints`,
      formatConstraints(context.constraints),
      ``,
      `## Workspace Summary`,
      context.workspaceSummary || "Empty workspace.",
      ``,
      `## Current Artifacts`,
      formatArtifacts(context.artifactSummaries),
      ``,
      `## Prior Round Summaries`,
      formatRoundSummaries(context.roundSummaries),
      ``,
      `## Task`,
      `Generate your proposal for solving this engineering problem.`,
    ].join("\n");

    return { systemPrompt, userMessage, responseFormat: "json" };
  }


  /**
   * Builds a critique prompt for a specific agent.
   * Uses CRITIQUE_ROUTING to determine which proposal to critique.
   */
  buildCritiquePrompt(
    agent: AgentConfig,
    proposals: ProposalOutput[],
    context: WorkspaceContext
  ): LLMRequest {
    const targetAgentId = CRITIQUE_ROUTING[agent.id];

    // Find the target's proposal from the current round events
    const targetProposal = this.findTargetProposal(
      targetAgentId,
      proposals,
      context
    );

    const systemPrompt = [
      `You are ${agent.displayName}.`,
      ``,
      `## Your Objective Function`,
      agent.objectiveFunction,
      ``,
      `## Target Proposal to Critique`,
      `You are critiquing the proposal from: ${targetAgentId}`,
      `Set "targetAgentId" to "${targetAgentId}" in your response.`,
      ``,
      `## Target's Proposal`,
      targetProposal
        ? JSON.stringify(targetProposal, null, 2)
        : "No proposal found for target agent.",
      ``,
      `## Output Schema`,
      CRITIQUE_SCHEMA_DESC,
      ``,
      JSON_ONLY_INSTRUCTION,
    ].join("\n");

    const userMessage = [
      `## All Proposals This Round`,
      JSON.stringify(proposals, null, 2),
      ``,
      `## Problem Description`,
      context.problemDescription,
      ``,
      `## Active Constraints`,
      formatConstraints(context.constraints),
      ``,
      `## Workspace Summary`,
      context.workspaceSummary || "Empty workspace.",
      ``,
      `## Current Artifacts`,
      formatArtifacts(context.artifactSummaries),
      ``,
      `## Task`,
      `Critique the proposal from ${targetAgentId} based on your`,
      `objective function and evaluation criteria.`,
    ].join("\n");

    return { systemPrompt, userMessage, responseFormat: "json" };
  }


  /**
   * Builds a revision prompt for a specific agent.
   * Only includes critiques targeted at this agent.
   */
  buildRevisionPrompt(
    agent: AgentConfig,
    critiques: CritiqueOutput[],
    context: WorkspaceContext
  ): LLMRequest {
    // Filter to only critiques targeting this agent
    const relevantCritiques = critiques.filter(
      (c) => c.targetAgentId === agent.id
    );

    // Find this agent's original proposal from current round events
    const originalProposal = this.findOwnProposal(agent.id, context);

    const systemPrompt = [
      `You are ${agent.displayName}.`,
      ``,
      `## Your Objective Function`,
      agent.objectiveFunction,
      ``,
      `## Stance Options`,
      `- "agree": You fully accept the critique and change your position`,
      `- "disagree": You reject the critique and maintain your position`,
      `- "partially-concede": You accept some points but not all`,
      `  (MUST include at least one entry in concededPoints)`,
      `- "strengthen": You use the critique to reinforce your position`,
      ``,
      `## Output Schema`,
      REVISION_SCHEMA_DESC,
      ``,
      JSON_ONLY_INSTRUCTION,
    ].join("\n");

    const userMessage = [
      `## Your Original Proposal`,
      originalProposal
        ? JSON.stringify(originalProposal, null, 2)
        : "Original proposal not found in context.",
      ``,
      `## Critiques Directed At You`,
      relevantCritiques.length > 0
        ? JSON.stringify(relevantCritiques, null, 2)
        : "No critiques directed at you this round.",
      ``,
      `## Problem Description`,
      context.problemDescription,
      ``,
      `## Active Constraints`,
      formatConstraints(context.constraints),
      ``,
      `## Task`,
      `Revise your position based on the critiques received.`,
    ].join("\n");

    return { systemPrompt, userMessage, responseFormat: "json" };
  }


  /**
   * Builds a consensus synthesis prompt.
   * Includes all round events and workspace context.
   */
  buildConsensusPrompt(
    roundEvents: PersistedEvent[],
    context: WorkspaceContext
  ): LLMRequest {
    const systemPrompt = [
      `You are the Consensus Synthesizer.`,
      ``,
      `## Role`,
      `Analyze all proposals, critiques, and revisions from the current`,
      `round to synthesize areas of agreement and disagreement.`,
      ``,
      `## Important`,
      `- Include event IDs in evidenceChain arrays to link back to source events`,
      `- Identify all areas of agreement and disagreement`,
      `- Recommend concrete decisions based on the debate`,
      `- Flag identified risks with the agents who raised them`,
      `- List any open questions that remain unresolved`,
      ``,
      `## Output Schema`,
      CONSENSUS_SCHEMA_DESC,
      ``,
      JSON_ONLY_INSTRUCTION,
    ].join("\n");

    const userMessage = [
      `## Round Events (proposals, critiques, revisions)`,
      formatEvents(roundEvents),
      ``,
      `## Full Event Details`,
      JSON.stringify(
        roundEvents.map((e) => ({
          id: e.id,
          type: e.type,
          agentId: e.agentId,
          content: safeParseContent(e.content),
        })),
        null,
        2
      ),
      ``,
      `## Problem Description`,
      context.problemDescription,
      ``,
      `## Active Constraints`,
      formatConstraints(context.constraints),
      ``,
      `## Workspace Summary`,
      context.workspaceSummary || "Empty workspace.",
      ``,
      `## Current Artifacts`,
      formatArtifacts(context.artifactSummaries),
      ``,
      `## Task`,
      `Synthesize the consensus from this round's debate.`,
    ].join("\n");

    return { systemPrompt, userMessage, responseFormat: "json" };
  }


  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  /**
   * Finds the target agent's proposal from the proposals array.
   * Falls back to searching current round events in the context.
   */
  private findTargetProposal(
    targetAgentId: string,
    proposals: ProposalOutput[],
    context: WorkspaceContext
  ): ProposalOutput | null {
    // Proposals array passed directly — find by matching round events
    // Since ProposalOutput doesn't have agentId, we look in events
    const proposalEvents = context.currentRoundEvents.filter(
      (e) => e.type === "proposal" && e.agentId === targetAgentId
    );

    if (proposalEvents.length > 0) {
      try {
        return JSON.parse(proposalEvents[0].content) as ProposalOutput;
      } catch {
        // Fall through
      }
    }

    // If we have proposals but can't match by agent, return first one
    // (this case shouldn't happen with proper event tracking)
    return proposals.length > 0 ? proposals[0] : null;
  }

  /**
   * Finds this agent's own proposal from the current round events.
   */
  private findOwnProposal(
    agentId: string,
    context: WorkspaceContext
  ): ProposalOutput | null {
    const proposalEvent = context.currentRoundEvents.find(
      (e) => e.type === "proposal" && e.agentId === agentId
    );

    if (proposalEvent) {
      try {
        return JSON.parse(proposalEvent.content) as ProposalOutput;
      } catch {
        return null;
      }
    }

    return null;
  }
}


// =============================================================================
// UTILITY
// =============================================================================

/**
 * Safely parses JSON content string, returning parsed object or raw string.
 */
function safeParseContent(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    return content;
  }
}
