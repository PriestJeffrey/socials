/**
 * Differentiator formulas — pure functions only (no LLM, no network).
 * Overview may call these after loading snapshots from DB.
 */

export type FatigueInput = {
  /** Posts in the lookback window */
  postCount: number;
  /** Days in lookback (e.g. 7) */
  windowDays: number;
  /** Average engagement rate 0–1 over window */
  avgEngagementRate: number;
  /** Engagement rate in the prior window for comparison */
  priorAvgEngagementRate?: number;
};

export type FatigueResult = {
  score: number; // 0–1, higher = more fatigued
  flag: boolean;
  reason: string;
};

/** Content fatigue: high cadence + soft/declining engagement. */
export function contentFatigue(input: FatigueInput): FatigueResult {
  const postsPerDay = input.windowDays > 0 ? input.postCount / input.windowDays : 0;
  const cadencePressure = Math.min(1, Math.max(0, (postsPerDay - 0.5) / 2));
  const engSoft = input.avgEngagementRate < 0.02 ? 0.5 : input.avgEngagementRate < 0.04 ? 0.25 : 0;
  let decline = 0;
  if (
    input.priorAvgEngagementRate != null &&
    input.priorAvgEngagementRate > 0 &&
    input.avgEngagementRate < input.priorAvgEngagementRate * 0.7
  ) {
    decline = 0.4;
  }
  const score = Math.min(1, cadencePressure * 0.5 + engSoft + decline);
  const flag = score >= 0.45;
  return {
    score,
    flag,
    reason: flag
      ? "Posting cadence is high while engagement is soft or declining"
      : "Cadence and engagement look sustainable",
  };
}

export type ShadowbanInput = {
  impressions: number;
  reach: number;
  /** Expected reach/impressions floor for healthy distribution */
  expectedReachRatio?: number;
};

export type ShadowbanResult = {
  score: number; // 0–1, higher = more suspicious mismatch
  flag: boolean;
  reason: string;
};

/**
 * Shadowban-style heuristic: reach far below impressions suggests distribution mismatch.
 * Not a true shadowban detector — labeled as heuristic in UI.
 */
export function shadowbanHeuristic(input: ShadowbanInput): ShadowbanResult {
  const floor = input.expectedReachRatio ?? 0.35;
  if (input.impressions <= 0) {
    return { score: 0, flag: false, reason: "Not enough impression data" };
  }
  const ratio = input.reach / input.impressions;
  const deficit = Math.max(0, floor - ratio);
  const score = Math.min(1, deficit / floor);
  const flag = score >= 0.5 && input.impressions >= 100;
  return {
    score,
    flag,
    reason: flag
      ? "Reach is unusually low vs impressions — possible distribution mismatch"
      : "Reach/impressions ratio looks within a normal band",
  };
}
