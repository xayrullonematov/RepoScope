/**
 * CritiqueOutput Zod Schema
 *
 * Defines the structured output schema for agent critiques during the Critique Stage.
 * Each agent critiques exactly one other agent's proposal based on opposing-pair routing.
 *
 * Validates: Requirements 14.1, 14.3
 */

import { z } from "zod";

import {
  agentTypeSchema,
  artifactTypeSchema,
  severitySchema,
} from "./proposal-output";

// =============================================================================
// CRITIQUE-SPECIFIC ENUMS
// =============================================================================

/** Objection severity levels (different from risk severity!) */
export const objectionSeveritySchema = z.enum(["critical", "major", "minor"]);

// =============================================================================
// CRITIQUE OUTPUT SCHEMA
// =============================================================================

/** Zod schema for the CritiqueOutput structured output */
export const critiqueOutputSchema = z.object({
  summary: z.string().min(1),
  targetAgentId: agentTypeSchema,
  objections: z.array(
    z.object({
      point: z.string(),
      reasoning: z.string(),
      severity: objectionSeveritySchema,
    })
  ),
  acknowledgedStrengths: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  riskAssessments: z.array(
    z.object({
      description: z.string(),
      severity: severitySchema,
    })
  ),
  artifactSuggestions: z.array(
    z.object({
      type: artifactTypeSchema,
      title: z.string(),
      content: z.string(),
    })
  ),
  references: z.array(
    z.object({
      agentId: agentTypeSchema.optional(),
      artifactId: z.string().optional(),
      description: z.string(),
    })
  ),
  needsClarification: z.boolean(),
  clarificationQuestions: z.array(z.string()).optional(),
});

/** Inferred TypeScript type from the CritiqueOutput Zod schema */
export type CritiqueOutputZ = z.infer<typeof critiqueOutputSchema>;
