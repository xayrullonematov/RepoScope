/**
 * ProposalOutput Zod Schema
 *
 * Defines the structured output schema for the Proposal Stage.
 * Also exports shared enums (artifactTypeSchema, severitySchema, etc.)
 * used by other output schemas.
 *
 * Requirements: 14.1, 14.2
 */

import { z } from "zod";

// =============================================================================
// SHARED ENUMS (exported for use by other output schemas)
// =============================================================================

/** Zod schema for ArtifactType enum */
export const artifactTypeSchema = z.enum([
  "decision",
  "risk",
  "assumption",
  "tradeoff",
  "open-question",
  "recommendation",
]);

/** Zod schema for Severity enum */
export const severitySchema = z.enum(["high", "medium", "low"]);

/** Zod schema for AgentType enum */
export const agentTypeSchema = z.enum([
  "senior-engineer",
  "security-engineer",
  "performance-engineer",
  "product-engineer",
]);

/** Zod schema for Stance enum */
export const stanceSchema = z.enum([
  "agree",
  "disagree",
  "partially-concede",
  "strengthen",
]);

/** Shared artifact suggestion schema */
export const artifactSuggestionSchema = z.object({
  type: artifactTypeSchema,
  title: z.string().min(1),
  content: z.string().min(1),
});

/** Shared reference schema */
export const referenceSchema = z.object({
  agentId: agentTypeSchema.optional(),
  artifactId: z.string().optional(),
  description: z.string().min(1),
});

// =============================================================================
// PROPOSAL OUTPUT SCHEMA
// =============================================================================

/** Zod schema for ProposalOutput */
export const proposalOutputSchema = z.object({
  summary: z.string().min(1),
  recommendations: z.array(z.string().min(1)),
  risks: z.array(
    z.object({
      description: z.string().min(1),
      severity: severitySchema,
      mitigation: z.string().optional(),
    })
  ),
  assumptions: z.array(z.string().min(1)),
  confidence: z.number().min(0).max(1),
  artifactSuggestions: z.array(artifactSuggestionSchema),
  references: z.array(referenceSchema),
  needsClarification: z.boolean(),
  clarificationQuestions: z.array(z.string().min(1)).optional(),
});

/** Inferred TypeScript type from the Zod schema */
export type ProposalOutputZ = z.infer<typeof proposalOutputSchema>;
