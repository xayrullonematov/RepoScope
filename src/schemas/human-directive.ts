/**
 * Human Directive Zod Schema
 *
 * Validates input for creating human directives.
 * Text must be 1-500 characters and non-empty after trimming.
 */

import { z } from "zod";

/** Zod schema for human directive input validation */
export const humanDirectiveInputSchema = z.object({
  text: z
    .string()
    .min(1, "Directive text is required")
    .max(500, "Directive text must not exceed 500 characters")
    .refine((val) => val.trim().length > 0, {
      message: "Directive text must not be empty or whitespace-only",
    }),
});

/** Inferred TypeScript type from the Zod schema */
export type HumanDirectiveInput = z.infer<typeof humanDirectiveInputSchema>;
