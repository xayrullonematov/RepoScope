import { describe, expect, it } from "vitest";
import { isRoundActive } from "../workspace-status";

describe("isRoundActive", () => {
  it("returns true for an active session in a working stage", () => {
    expect(isRoundActive({ status: "active", currentStage: "critique" })).toBe(true);
  });

  it("returns false when a completed session retains a stale working stage", () => {
    expect(isRoundActive({ status: "completed", currentStage: "consensus" })).toBe(false);
  });

  it("returns false for paused sessions", () => {
    expect(isRoundActive({ status: "paused", currentStage: "revision" })).toBe(false);
  });

  it("returns false while awaiting intervention or without a stage", () => {
    expect(isRoundActive({ status: "active", currentStage: "awaiting-intervention" })).toBe(false);
    expect(isRoundActive({ status: "active", currentStage: null })).toBe(false);
  });
});
