/**
 * Human Directive API Input Validation Tests
 *
 * Unit tests for the Zod schema validation used by the directive API.
 */

import { describe, it, expect } from "vitest";
import { humanDirectiveInputSchema } from "@/schemas/human-directive";

describe("Human Directive Input Schema Validation", () => {
  it("should reject empty text", () => {
    const result = humanDirectiveInputSchema.safeParse({ text: "" });
    expect(result.success).toBe(false);
  });

  it("should reject whitespace-only text", () => {
    const result = humanDirectiveInputSchema.safeParse({ text: "   " });
    expect(result.success).toBe(false);
  });

  it("should reject text over 500 characters", () => {
    const longText = "a".repeat(501);
    const result = humanDirectiveInputSchema.safeParse({ text: longText });
    expect(result.success).toBe(false);
  });

  it("should accept valid text", () => {
    const result = humanDirectiveInputSchema.safeParse({
      text: "Always consider security implications before suggesting database schema changes",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.text).toBe(
        "Always consider security implications before suggesting database schema changes"
      );
    }
  });

  it("should accept text at exactly 500 characters", () => {
    const exactText = "a".repeat(500);
    const result = humanDirectiveInputSchema.safeParse({ text: exactText });
    expect(result.success).toBe(true);
  });

  it("should accept text at exactly 1 character", () => {
    const result = humanDirectiveInputSchema.safeParse({ text: "x" });
    expect(result.success).toBe(true);
  });

  it("should reject missing text field", () => {
    const result = humanDirectiveInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("should reject non-string text field", () => {
    const result = humanDirectiveInputSchema.safeParse({ text: 123 });
    expect(result.success).toBe(false);
  });
});
