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
  platform?: "instagram" | "facebook" | "linkedin" | "threads" | "tiktok";
  metricKey?: string;
  value?: number;
  why?: string;
};

export type OverviewBoard = {
  userId: string;
  empty: boolean;
  wins: OverviewCard[];
  issues: OverviewCard[];
  syncedAt: string | null;
  why?: string | null;
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

function pushThreadsCards(
  byKey: Map<string, Snap>,
  wins: OverviewCard[],
  issues: OverviewCard[],
) {
  const eng = byKey.get("engagement_rate");
  if (eng && eng.value >= 0.03) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "Threads: engagement rate looks healthy",
      platform: "threads",
      metricKey: eng.metricKey,
      value: eng.value,
    });
  } else if (eng && eng.value > 0 && eng.value < 0.015) {
    issues.push({
      kind: "issue",
      title: "Broken",
      body: "Threads: engagement is soft — lead with a sharper hook",
      platform: "threads",
      metricKey: eng.metricKey,
      value: eng.value,
    });
  }

  const replies = byKey.get("replies");
  if (replies && replies.value >= 20) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "Threads: replies are flowing — keep the conversation open",
      platform: "threads",
      metricKey: replies.metricKey,
      value: replies.value,
    });
  }

  const followers = byKey.get("followers_delta_7d");
  if (followers && followers.value < 0) {
    issues.push({
      kind: "issue",
      title: "Broken",
      body: "Threads: follower delta is negative on recent signal",
      platform: "threads",
      metricKey: followers.metricKey,
      value: followers.value,
    });
  } else if (followers && followers.value > 0) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "Threads: followers are trending up",
      platform: "threads",
      metricKey: followers.metricKey,
      value: followers.value,
    });
  }
}

function pushTikTokCards(
  byKey: Map<string, Snap>,
  wins: OverviewCard[],
  issues: OverviewCard[],
) {
  const eng = byKey.get("engagement_rate");
  if (eng && eng.value >= 0.05) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "TikTok: engagement rate looks strong",
      platform: "tiktok",
      metricKey: eng.metricKey,
      value: eng.value,
    });
  } else if (eng && eng.value > 0 && eng.value < 0.02) {
    issues.push({
      kind: "issue",
      title: "Broken",
      body: "TikTok: engagement is soft — tighten the opening hook",
      platform: "tiktok",
      metricKey: eng.metricKey,
      value: eng.value,
    });
  }

  const watch = byKey.get("avg_watch_ratio");
  if (watch && watch.value > 0 && watch.value < 0.25) {
    issues.push({
      kind: "issue",
      title: "Broken",
      body: "TikTok: watch ratio is low — cut the first three seconds tighter",
      platform: "tiktok",
      metricKey: watch.metricKey,
      value: watch.value,
    });
  } else if (watch && watch.value >= 0.4) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "TikTok: watch ratio looks healthy",
      platform: "tiktok",
      metricKey: watch.metricKey,
      value: watch.value,
    });
  }

  const followers = byKey.get("followers_delta_7d");
  if (followers && followers.value < 0) {
    issues.push({
      kind: "issue",
      title: "Broken",
      body: "TikTok: follower delta is negative on recent signal",
      platform: "tiktok",
      metricKey: followers.metricKey,
      value: followers.value,
    });
  } else if (followers && followers.value > 0) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "TikTok: followers are trending up",
      platform: "tiktok",
      metricKey: followers.metricKey,
      value: followers.value,
    });
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
    where: {
      userId,
      platform: {
        in: ["instagram", "facebook", "linkedin", "threads", "tiktok"],
      },
    },
    orderBy: { capturedAt: "desc" },
    take: 200,
  });

  const igByKey = new Map<string, (typeof latest)[0]>();
  const fbByKey = new Map<string, (typeof latest)[0]>();
  const liByKey = new Map<string, (typeof latest)[0]>();
  const thByKey = new Map<string, (typeof latest)[0]>();
  const ttByKey = new Map<string, (typeof latest)[0]>();
  for (const row of latest) {
    const map =
      row.platform === "facebook"
        ? fbByKey
        : row.platform === "linkedin"
          ? liByKey
          : row.platform === "threads"
            ? thByKey
            : row.platform === "tiktok"
              ? ttByKey
              : igByKey;
    if (!map.has(row.metricKey)) map.set(row.metricKey, row);
  }

  const wins: OverviewCard[] = [];
  const issues: OverviewCard[] = [];
  pushIgCards(igByKey, wins, issues);
  pushFbCards(fbByKey, wins, issues);
  pushLiCards(liByKey, wins, issues);
  pushThreadsCards(thByKey, wins, issues);
  pushTikTokCards(ttByKey, wins, issues);

  const conn = await prisma.socialConnection.findFirst({
    where: {
      userId,
      platform: {
        in: ["instagram", "facebook", "linkedin", "threads", "tiktok"],
      },
      status: { in: ["connected", "error"] },
    },
    orderBy: { lastSyncAt: "desc" },
  });

  const empty = wins.length === 0 && issues.length === 0;
  let why: string | null = null;
  if (!empty) {
    try {
      const { explainOverviewWhy } = await import("@/lib/ai/features/overview-why");
      why = await explainOverviewWhy({
        userId,
        cards: [...issues, ...wins],
      });
    } catch {
      why = null;
    }
  }

  const board: OverviewBoard = {
    userId,
    empty,
    wins,
    issues,
    syncedAt: conn?.lastSyncAt?.toISOString() ?? latest[0]?.capturedAt.toISOString() ?? null,
    why,
  };

  await cacheStore.set(cacheKey, JSON.stringify(board), 60_000);
  return board;
}
