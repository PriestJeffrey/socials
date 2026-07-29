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
    where: { userId, platform: "instagram" },
    orderBy: { capturedAt: "desc" },
    take: 40,
  });

  const byKey = new Map<string, (typeof latest)[0]>();
  for (const row of latest) {
    if (!byKey.has(row.metricKey)) byKey.set(row.metricKey, row);
  }

  const wins: OverviewCard[] = [];
  const issues: OverviewCard[] = [];

  const reach = byKey.get("reach_delta_7d") ?? byKey.get("reach");
  if (reach && reach.value < 0) {
    issues.push({
      kind: "issue",
      title: "Broken",
      body: "Reach decay showing up on recent signal",
      metricKey: reach.metricKey,
      value: reach.value,
    });
  } else if (reach && reach.value > 0) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "Reach is trending up",
      metricKey: reach.metricKey,
      value: reach.value,
    });
  }

  const saves = byKey.get("saves_rate");
  if (saves && saves.value >= 0.05) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "Save rate looks healthy on recent posts",
      metricKey: saves.metricKey,
      value: saves.value,
    });
  }

  const eng = byKey.get("engagement_rate");
  if (eng && eng.value > 0 && eng.value < 0.02) {
    issues.push({
      kind: "issue",
      title: "Broken",
      body: "Engagement rate is soft — tighten the hook",
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
      metricKey: impressions.metricKey,
      value: impressions.value,
    });
  }

  const conn = await prisma.socialConnection.findFirst({
    where: { userId, platform: "instagram", status: { in: ["connected", "error"] } },
    orderBy: { updatedAt: "desc" },
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
