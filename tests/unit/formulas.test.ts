import { describe, expect, it } from "vitest";
import { contentFatigue, shadowbanHeuristic } from "@/lib/analytics/formulas";

describe("contentFatigue", () => {
  it("flags high cadence with soft declining engagement", () => {
    const r = contentFatigue({
      postCount: 14,
      windowDays: 7,
      avgEngagementRate: 0.012,
      priorAvgEngagementRate: 0.05,
    });
    expect(r.flag).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(0.45);
  });

  it("does not flag light cadence with healthy engagement", () => {
    const r = contentFatigue({
      postCount: 3,
      windowDays: 7,
      avgEngagementRate: 0.06,
      priorAvgEngagementRate: 0.05,
    });
    expect(r.flag).toBe(false);
  });
});

describe("shadowbanHeuristic", () => {
  it("flags low reach vs impressions", () => {
    const r = shadowbanHeuristic({ impressions: 2000, reach: 200 });
    expect(r.flag).toBe(true);
  });

  it("does not flag healthy ratio", () => {
    const r = shadowbanHeuristic({ impressions: 2000, reach: 1200 });
    expect(r.flag).toBe(false);
  });
});
