/**
 * Overview must read MetricSnapshot / Post from DB (+ CacheStore).
 * Never call PlatformAdapter.fetch* on the Overview request path.
 */
import { prisma } from "@/lib/db/prisma";
import { cacheStore } from "@/lib/cache";

export type OverviewCard = {
  kind: "win" | "issue";
  title: string;
  body: string;
  platform?: "instagram" | "facebook";
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

function pushIgCards(
  byKey: Map<string, { metricKey: string; value: number }>,
  wins: OverviewCard[],
  issues: OverviewCard[],
) {
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

  const impressions = byKey.get("impressions");
  if (impressions && impressions.value > 0 && wins.length === 0 && issues.length === 0) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "Instagram is delivering impressions",
      platform: "instagram",
      metricKey: impressions.metricKey,
      value: impressions.value,
    });
  }
}

function pushFbCards(
  byKey: Map<string, { metricKey: string; value: number }>,
  wins: OverviewCard[],
  issues: OverviewCard[],
) {
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
    where: { userId, platform: { in: ["instagram", "facebook"] } },
    orderBy: { capturedAt: "desc" },
    take: 80,
  });

  const igByKey = new Map<string, (typeof latest)[0]>();
  const fbByKey = new Map<string, (typeof latest)[0]>();
  for (const row of latest) {
    const map = row.platform === "facebook" ? fbByKey : igByKey;
    if (!map.has(row.metricKey)) map.set(row.metricKey, row);
  }

  const wins: OverviewCard[] = [];
  const issues: OverviewCard[] = [];
  pushIgCards(igByKey, wins, issues);
  pushFbCards(fbByKey, wins, issues);

  const conn = await prisma.socialConnection.findFirst({
    where: {
      userId,
      platform: { in: ["instagram", "facebook"] },
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
