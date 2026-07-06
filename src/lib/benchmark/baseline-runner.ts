import { createLLMProvider } from "@/lib/llm-provider";
import { runProposalToolLoop, type RepoContext } from "@/lib/agent-tool-loop";
import { OutputValidatorImpl, buildValidationErrorMessage } from "@/lib/output-validator";
import type { FilteredTreeEntry } from "@/lib/github-fetcher";
import type { LLMProvider, LLMRequest, ProposalOutput } from "@/types/domain";

const MAX_VALIDATION_RETRIES = 2;

const OUTPUT_SCHEMA = `{
  "summary": "string",
  "recommendations": ["string"],
  "risks": [{"description": "string", "severity": "high|medium|low", "mitigation": "string (optional)"}],
  "assumptions": ["string"],
  "confidence": 0.0,
  "artifactSuggestions": [{"type": "decision|risk|assumption|tradeoff|open-question|recommendation", "title": "string", "content": "string"}],
  "references": [{"description": "string"}],
  "needsClarification": false
}`;

export interface BaselineResult {
  output: ProposalOutput;
  tokenUsage: { inputTokens: number; outputTokens: number; model: string };
  toolStats: { toolCallCount: number; capHit: boolean; filesRead: string[] };
}

export async function runSingleReviewer(config: {
  repoOwner: string;
  repo: string;
  ref: string;
  problemDescription: string;
  entries: FilteredTreeEntry[];
  model?: string;
  llmProvider?: LLMProvider;
}): Promise<BaselineResult> {
  const llmProvider = config.llmProvider ?? createLLMProvider();
  const model = config.model ?? process.env.LLM_MODEL ?? "qwen3.5-plus";
  const validator = new OutputValidatorImpl();
  const baseRequest: LLMRequest = {
    systemPrompt: [
      "You are one comprehensive software reviewer.",
      "Review architecture, security, performance, and product impact in one pass.",
      "Every finding must cite a repository-relative file path and concrete code evidence.",
      "Do not ask questions; make explicit assumptions and finish autonomously.",
      `Return JSON matching this schema: ${OUTPUT_SCHEMA}`,
    ].join("\n"),
    userMessage: config.problemDescription,
    responseFormat: "json",
  };
  const repoContext: RepoContext = {
    owner: config.repoOwner,
    repo: config.repo,
    branch: config.ref,
    entries: config.entries,
    shortlist: [],
  };
  const loop = await runProposalToolLoop({
    llmProvider,
    baseRequest,
    model,
    repoContext,
    agentId: "senior-engineer",
    roleLabel: "single comprehensive reviewer",
  });
  const usage = { ...loop.combinedUsage };
  let content = loop.finalContent;
  let validation = validator.validateProposal(content);
  for (let attempt = 0; !validation.success && attempt < MAX_VALIDATION_RETRIES; attempt++) {
    const repair = await llmProvider.complete({
      ...baseRequest,
      userMessage: `${config.problemDescription}\n\n${buildValidationErrorMessage(validation.errors)}\n\nInvalid response:\n${content}`,
    }, model);
    usage.inputTokens += repair.inputTokens;
    usage.outputTokens += repair.outputTokens;
    usage.model = repair.model || usage.model;
    content = repair.content;
    validation = validator.validateProposal(content);
  }
  if (!validation.success) {
    throw new Error(`Single-reviewer output failed validation: ${validation.errors.join("; ")}`);
  }
  return {
    output: validation.data,
    tokenUsage: usage,
    toolStats: { toolCallCount: loop.toolCallCount, capHit: loop.capHit, filesRead: loop.filesRead },
  };
}
