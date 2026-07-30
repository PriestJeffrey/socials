import { describe, expect, it } from "vitest";
import {
  formatMetricValue,
  isAnalyticsPlatform,
  readPlatformAnalytics,
} from "@/lib/analytics/platform";

describe("platform analytics", () => {
  it("validates platform ids", () => {
    expect(isAnalyticsPlatform("instagram")).toBe(true);
    expect(isAnalyticsPlatform("x")).toBe(true);
    expect(isAnalyticsPlatform("myspace")).toBe(false);
  });

  it("formats pct delta and compact numbers", () => {
    expect(formatMetricValue(0.068, "pct")).toMatch(/%/);
    expect(formatMetricValue(-12, "delta")).toBe("-12");
    expect(formatMetricValue(12, "delta")).toBe("+12");
    expect(formatMetricValue(20700, "number")).toMatch(/20/);
  });

  it("returns manual mode for X without DB metrics", async () => {
    const board = await readPlatformAnalytics("user-x-manual", "x");
    expect(board.mode).toBe("manual");
    expect(board.metrics).toEqual([]);
    expect(board.focus).toMatch(/no free analytics/i);
  });
});
