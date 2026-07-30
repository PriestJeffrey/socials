/**
 * Overview must read MetricSnapshot / Post from DB (+ CacheStore).
 * Never call PlatformAdapter.fetch* on the Overview request path.
 */
import { prisma } from "@/lib/db/prisma";
import { cacheStore } from "@/lib/cache";
import { contentFatigue, shadowbanHeuristic } from "@/lib/analytics/formulas";

export type OverviewCard = {
  kind: "win" | "issue";
  title: string;
  body: string;
  platform?: "instagram" | "facebook" | "linkedin";
  metricKey?: string;
  value?: number;
};

export type OverviewBoard = {
  userId: string;
  empty: boolean;
  wins: OverviewCard[];
  issues: OverviewCard[];
  syncedAt: string | null;
};

type Snap = { metricKey: string; value: number };

function pushIgCards(byKey: Map<string, Snap>, wins: OverviewCard[], issues: OverviewCard[]) {
  const reach = byKey.get("reach_delta_7d") ?? byKey.get("reach");
  if (reach && reach.value < 0) {
    issues.push({
      kind: "issue",
      title: "Broken",
      body: "Instagram: reach decay showing up on recent signal",
      platform: "instagram",
      metricKey: reach.metricKey,
      value: reach.value,
    });
  } else if (reach && reach.value > 0) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "Instagram: reach is trending up",
      platform: "instagram",
      metricKey: reach.metricKey,
      value: reach.value,
    });
  }

  const saves = byKey.get("saves_rate");
  if (saves && saves.value >= 0.05) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "Instagram: save rate looks healthy on recent posts",
      platform: "instagram",
      metricKey: saves.metricKey,
      value: saves.value,
    });
  }

  const eng = byKey.get("engagement_rate");
  if (eng && eng.value > 0 && eng.value < 0.02) {
    issues.push({
      kind: "issue",
      title: "Broken",
      body: "Instagram: engagement rate is soft — tighten the hook",
      platform: "instagram",
      metricKey: eng.metricKey,
      value: eng.value,
    });
  }
}

function pushFbCards(byKey: Map<string, Snap>, wins: OverviewCard[], issues: OverviewCard[]) {
  const fans = byKey.get("page_fans_delta_7d");
  if (fans && fans.value < 0) {
    issues.push({
      kind: "issue",
      title: "Broken",
      body: "Facebook: Page fans declining over 7 days",
      platform: "facebook",
      metricKey: fans.metricKey,
      value: fans.value,
    });
  } else if (fans && fans.value > 0) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "Facebook: Page fans growing",
      platform: "facebook",
      metricKey: fans.metricKey,
      value: fans.value,
    });
  }

  const organic = byKey.get("organic_share_ratio");
  if (organic && organic.value >= 0.6) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "Facebook: organic share of reach looks strong",
      platform: "facebook",
      metricKey: organic.metricKey,
      value: organic.value,
    });
  } else if (organic && organic.value > 0 && organic.value < 0.35) {
    issues.push({
      kind: "issue",
      title: "Broken",
      body: "Facebook: too paid-heavy — organic share is soft",
      platform: "facebook",
      metricKey: organic.metricKey,
      value: organic.value,
    });
  }

  const impressions = byKey.get("page_impressions");
  if (
    impressions &&
    impressions.value > 0 &&
    !wins.some((w) => w.platform === "facebook") &&
    !issues.some((i) => i.platform === "facebook")
  ) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "Facebook Page is delivering impressions",
      platform: "facebook",
      metricKey: impressions.metricKey,
      value: impressions.value,
    });
  }
}

function pushLiCards(byKey: Map<string, Snap>, wins: OverviewCard[], issues: OverviewCard[]) {
  const dwell = byKey.get("dwell_proxy");
  if (dwell && dwell.value >= 0.55) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "LinkedIn: dwell proxy looks strong — docs/carousels holding attention",
      platform: "linkedin",
      metricKey: dwell.metricKey,
      value: dwell.value,
    });
  }

  const comments = byKey.get("comment_quality");
  if (comments && comments.value >= 0.6) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "LinkedIn: comment quality signal is healthy",
      platform: "linkedin",
      metricKey: comments.metricKey,
      value: comments.value,
    });
  }

  const velocity = byKey.get("first_hour_velocity");
  if (velocity && velocity.value > 0 && velocity.value < 0.025) {
    issues.push({
      kind: "issue",
      title: "Broken",
      body: "LinkedIn: first-hour velocity is soft — sharpen the opening line",
      platform: "linkedin",
      metricKey: velocity.metricKey,
      value: velocity.value,
    });
  }

  const impressions = byKey.get("impressions");
  const reach = byKey.get("reach");
  if (impressions && reach) {
    const sb = shadowbanHeuristic({
      impressions: impressions.value,
      reach: reach.value,
    });
    if (sb.flag) {
      issues.push({
        kind: "issue",
        title: "Broken",
        body: `Heuristic: ${sb.reason}`,
        platform: "linkedin",
        metricKey: "shadowban_heuristic",
        value: sb.score,
      });
    }
  }

  const posts7d = byKey.get("posts_7d");
  const eng = byKey.get("engagement_rate");
  const prior = byKey.get("engagement_rate_prior");
  if (posts7d && eng) {
    const fatigue = contentFatigue({
      postCount: posts7d.value,
      windowDays: 7,
      avgEngagementRate: eng.value,
      priorAvgEngagementRate: prior?.value,
    });
    if (fatigue.flag) {
      issues.push({
        kind: "issue",
        title: "Broken",
        body: `Content fatigue: ${fatigue.reason}`,
        platform: "linkedin",
        metricKey: "content_fatigue",
        value: fatigue.score,
      });
    }
  }
}

export async function readOverview(userId: string): Promise<OverviewBoard> {
  const cacheKey = `overview:v1:${userId}`;
  const cached = await cacheStore.get(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached) as OverviewBoard;
    } catch {
      /* rebuild */
    }
  }

  const latest = await prisma.metricSnapshot.findMany({
    where: { userId, platform: { in: ["instagram", "facebook", "linkedin"] } },
    orderBy: { capturedAt: "desc" },
    take: 120,
  });

  const igByKey = new Map<string, (typeof latest)[0]>();
  const fbByKey = new Map<string, (typeof latest)[0]>();
  const liByKey = new Map<string, (typeof latest)[0]>();
  for (const row of latest) {
    const map =
      row.platform === "facebook"
        ? fbByKey
        : row.platform === "linkedin"
          ? liByKey
          : igByKey;
    if (!map.has(row.metricKey)) map.set(row.metricKey, row);
  }

  const wins: OverviewCard[] = [];
  const issues: OverviewCard[] = [];
  pushIgCards(igByKey, wins, issues);
  pushFbCards(fbByKey, wins, issues);
  pushLiCards(liByKey, wins, issues);

  const conn = await prisma.socialConnection.findFirst({
    where: {
      userId,
      platform: { in: ["instagram", "facebook", "linkedin"] },
      status: { in: ["connected", "error"] },
    },
    orderBy: { lastSyncAt: "desc" },
  });

  const empty = wins.length === 0 && issues.length === 0;
  const board: OverviewBoard = {
    userId,
    empty,
    wins,
    issues,
    syncedAt: conn?.lastSyncAt?.toISOString() ?? latest[0]?.capturedAt.toISOString() ?? null,
  };

  await cacheStore.set(cacheKey, JSON.stringify(board), 60_000);
  return board;
}
