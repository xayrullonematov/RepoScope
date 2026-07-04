/**
 * Review Limits — Hard caps for default review execution.
 * These ensure reviews stay concise, fast, and token-efficient.
 */

/** Max review passes (rounds) before stopping */
export const MAX_ROUNDS = 1;

/** Max artifact suggestions processed per agent per stage */
export const MAX_ARTIFACTS_PER_AGENT = 3;

/** Max total raw findings (artifacts) before synthesis */
export const MAX_RAW_FINDINGS = 20;

/** Max main findings in the final report */
export const MAX_FINAL_FINDINGS = 10;

/** Max open questions in the final report */
export const MAX_OPEN_QUESTIONS = 5;

/** Max assumptions in the final report */
export const MAX_ASSUMPTIONS = 5;

/** Max time (ms) for a full review before returning partial report */
export const MAX_REVIEW_TIME_MS = 5 * 60 * 1000; // 5 minutes

/** Budget threshold (fraction) at which to stop early */
export const BUDGET_STOP_THRESHOLD = 0.9;
