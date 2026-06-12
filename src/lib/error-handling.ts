/**
 * Error Handling — Retry policies, error types, and utilities for
 * resilient LLM call handling during agent execution.
 */

/** Error types for the Engineering Room */
export class EngRoomError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly recoverable: boolean = false
  ) {
    super(message);
    this.name = "EngRoomError";
  }
}

export class LLMFailureError extends EngRoomError {
  constructor(
    message: string,
    public readonly agentId: string | null,
    public readonly stage: string,
    public readonly attempts: number
  ) {
    super(message, "LLM_FAILURE", true);
    this.name = "LLMFailureError";
  }
}

export class ValidationFailureError extends EngRoomError {
  constructor(
    message: string,
    public readonly agentId: string | null,
    public readonly stage: string,
    public readonly errors: string[],
    public readonly rawOutput: string
  ) {
    super(message, "VALIDATION_FAILURE", true);
    this.name = "ValidationFailureError";
  }
}

export class BudgetExceededError extends EngRoomError {
  constructor(
    public readonly used: number,
    public readonly budget: number
  ) {
    super(`Token budget exceeded: ${used}/${budget}`, "BUDGET_EXCEEDED", false);
    this.name = "BudgetExceededError";
  }
}

export class SessionLockedError extends EngRoomError {
  constructor(sessionId: string) {
    super(`Session ${sessionId} is locked by another process`, "SESSION_LOCKED", false);
    this.name = "SessionLockedError";
  }
}

/** Retry policy configuration */
export interface RetryPolicy {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/** Default retry policy for LLM calls */
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/** Calculate delay for a given retry attempt */
export function calculateRetryDelay(attempt: number, policy: RetryPolicy = DEFAULT_RETRY_POLICY): number {
  const delay = policy.baseDelayMs * Math.pow(policy.backoffMultiplier, attempt);
  return Math.min(delay, policy.maxDelayMs);
}

/** Sleep utility */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extract a degraded summary from raw LLM output when validation fails.
 * Attempts to find any JSON-like content or uses the first 500 chars as summary.
 */
export function extractDegradedOutput(raw: string): string {
  // Try to find a summary field in the raw output
  const summaryMatch = raw.match(/"summary"\s*:\s*"([^"]+)"/);
  if (summaryMatch) {
    return summaryMatch[1];
  }

  // Fall back to first 500 characters
  return raw.slice(0, 500);
}
