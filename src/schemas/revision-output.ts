/**
 * RevisionOutput Zod Schema
 *
 * Defines the structured output schema for the Revision Stage.
 * Validates that when stance is "partially-concede", concededPoints must be non-empty.
 *
 * Requirements: 14.1, 14.4
 */

import { z } from "zod";

import { artifactTypeSchema, stanceSchema } from "./proposal-output";

// =============================================================================
// REVISION OUTPUT SCHEMA
// =============================================================================

/** Schema for a conceded or maintained point with reasoning */
const reasonedPointSchema = z.object({
  point: z.string().min(1),
  reasoning: z.string().min(1),
});

/** Schema for artifact suggestions (reuses shared artifactTypeSchema) */
const artifactSuggestionSchema = z.object({
  type: artifactTypeSchema,
  title: z.string().min(1),
  content: z.string().min(1),
});

/** Zod schema for RevisionOutput with conditional validation */
export const revisionOutputSchema = z
  .object({
    summary: z.string().min(1),
    stance: stanceSchema,
    concededPoints: z.array(reasonedPointSchema),
    maintainedPoints: z.array(reasonedPointSchema),
    newArguments: z.array(z.string().min(1)),
    confidence: z.number().min(0).max(1),
    artifactSuggestions: z.array(artifactSuggestionSchema),
    needsClarification: z.boolean(),
    clarificationQuestions: z.array(z.string().min(1)).optional(),
  })
  .refine(
    (data) => {
      // When stance is "partially-concede", concededPoints MUST be non-empty
      if (data.stance === "partially-concede") {
        return data.concededPoints.length > 0;
      }
      return true;
    },
    {
      message:
        'When stance is "partially-concede", concededPoints must contain at least one entry',
      path: ["concededPoints"],
    }
  );

/** Inferred TypeScript type from the Zod schema */
export type RevisionOutputZ = z.infer<typeof revisionOutputSchema>;
