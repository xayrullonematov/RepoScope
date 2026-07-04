import { describe, expect, it } from "vitest";
import { getNextTabId } from "../tab-navigation";

const tabs = ["overview", "findings", "technical"] as const;

describe("getNextTabId", () => {
  it("moves forward and wraps", () => {
    expect(getNextTabId(tabs, "overview", "ArrowRight")).toBe("findings");
    expect(getNextTabId(tabs, "technical", "ArrowDown")).toBe("overview");
  });

  it("moves backward and wraps", () => {
    expect(getNextTabId(tabs, "technical", "ArrowLeft")).toBe("findings");
    expect(getNextTabId(tabs, "overview", "ArrowUp")).toBe("technical");
  });

  it("supports Home and End", () => {
    expect(getNextTabId(tabs, "findings", "Home")).toBe("overview");
    expect(getNextTabId(tabs, "findings", "End")).toBe("technical");
  });

  it("ignores unrelated keys and invalid state", () => {
    expect(getNextTabId(tabs, "overview", "Tab")).toBeNull();
    expect(getNextTabId([], "overview", "ArrowRight")).toBeNull();
  });
});
