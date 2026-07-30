/**
 * Platform analytics — snapshot/Post DB only.
 * Never call PlatformAdapter.fetch* on the analytics request path.
 */
import { prisma } from "@/lib/db/prisma";
import { cacheStore } from "@/lib/cache";
import {
  contentFatigue,
  shadowbanHeuristic,
} from "@/lib/analytics/formulas";

export const ANALYTICS_PLATFORMS = [
  "instagram",
  "facebook",
  "linkedin",
  "threads",
  "tiktok",
  "x",
] as const;

export type AnalyticsPlatform = (typeof ANALYTICS_PLATFORMS)[number];

export function isAnalyticsPlatform(value: string): value is AnalyticsPlatform {
  return (ANALYTICS_PLATFORMS as readonly string[]).includes(value);
}

export type MetricRow = {
  key: string;
  label: string;
  value: number;
  display: string;
  highlighted: boolean;
};

export type AnalyticsPostRow = {
  id: string;
  caption: string | null;
  kind: string | null;
  publishedAt: string | null;
  platformPostId: string;
};

export type PlatformAnalytics = {
  platform: AnalyticsPlatform;
  label: string;
  mode: "snapshots" | "manual";
  connected: boolean;
  connectionStatus: string | null;
  lastSyncAt: string | null;
  empty: boolean;
  focus: string;
  metrics: MetricRow[];
  posts: AnalyticsPostRow[];
  heuristics: { id: string; flag: boolean; reason: string; score: number }[];
  syncedAt: string | null;
};

type Presentation = {
  label: string;
  focus: string;
  /** metricKey → display label; order = display order; first keys highlighted */
  keys: { key: string; label: string; highlight?: boolean; format?: "pct" | "number" | "delta" }[];
};

const PRESENTATION: Record<Exclude<AnalyticsPlatform, "x">, Presentation> = {
  instagram: {
    label: "Instagram",
    focus: "Saves, engagement, and reach trend — reels vs static when kind is present.",
    keys: [
      { key: "saves_rate", label: "Saves rate", highlight: true, format: "pct" },
      { key: "engagement_rate", label: "Engagement rate", highlight: true, format: "pct" },
      { key: "reach_delta_7d", label: "Reach Δ 7d", highlight: true, format: "delta" },
      { key: "reach", label: "Reach", format: "number" },
    ],
  },
  facebook: {
    label: "Facebook",
    focus: "Shares and organic page signal — fans and engaged users.",
    keys: [
      { key: "organic_share_ratio", label: "Organic share ratio", highlight: true, format: "pct" },
      { key: "page_fans_delta_7d", label: "Fans Δ 7d", highlight: true, format: "delta" },
      { key: "page_engaged_users", label: "Engaged users", highlight: true, format: "number" },
      { key: "page_impressions", label: "Impressions", format: "number" },
    ],
  },
  linkedin: {
    label: "LinkedIn",
    focus: "Dwell / comment quality and first-hour velocity — not vanity likes alone.",
    keys: [
      { key: "dwell_proxy", label: "Dwell proxy", highlight: true, format: "number" },
      { key: "comment_quality", label: "Comment quality", highlight: true, format: "number" },
      { key: "first_hour_velocity", label: "First-hour velocity", highlight: true, format: "number" },
      { key: "impressions", label: "Impressions", format: "number" },
      { key: "reach", label: "Reach", format: "number" },
      { key: "engagement_rate", label: "Engagement rate", format: "pct" },
      { key: "engagement_rate_prior", label: "Prior engagement", format: "pct" },
      { key: "posts_7d", label: "Posts (7d)", format: "number" },
    ],
  },
  threads: {
    label: "Threads",
    focus: "Replies and reposts vs likes — conversation over vanity.",
    keys: [
      { key: "replies", label: "Replies", highlight: true, format: "number" },
      { key: "reposts", label: "Reposts", highlight: true, format: "number" },
      { key: "quotes", label: "Quotes", highlight: true, format: "number" },
      { key: "likes", label: "Likes", format: "number" },
      { key: "views", label: "Views", format: "number" },
      { key: "engagement_rate", label: "Engagement rate", format: "pct" },
      { key: "followers_delta_7d", label: "Followers Δ 7d", format: "delta" },
    ],
  },
  tiktok: {
    label: "TikTok",
    focus: "Watch ratio and engagement — opening hook quality.",
    keys: [
      { key: "avg_watch_ratio", label: "Avg watch ratio", highlight: true, format: "pct" },
      { key: "engagement_rate", label: "Engagement rate", highlight: true, format: "pct" },
      { key: "video_views", label: "Video views", highlight: true, format: "number" },
      { key: "likes", label: "Likes", format: "number" },
      { key: "comments", label: "Comments", format: "number" },
      { key: "shares", label: "Shares", format: "number" },
      { key: "followers_delta_7d", label: "Followers Δ 7d", format: "delta" },
    ],
  },
};

export function formatMetricValue(
  value: number,
  format: "pct" | "number" | "delta" = "number",
): string {
  if (format === "pct") {
    return `${(value * 100).toFixed(value * 100 >= 10 ? 1 : 2)}%`;
  }
  if (format === "delta") {
    const sign = value > 0 ? "+" : "";
    return `${sign}${Number.isInteger(value) ? value : value.toFixed(2)}`;
  }
  if (Math.abs(value) >= 1000) {
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function buildHeuristics(byKey: Map<string, number>) {
  const out: PlatformAnalytics["heuristics"] = [];
  const posts7d = byKey.get("posts_7d");
  const eng = byKey.get("engagement_rate");
  const prior = byKey.get("engagement_rate_prior");
  if (posts7d != null && eng != null) {
    const fatigue = contentFatigue({
      postCount: posts7d,
      windowDays: 7,
      avgEngagementRate: eng,
      priorAvgEngagementRate: prior,
    });
    out.push({
      id: "content_fatigue",
      flag: fatigue.flag,
      reason: fatigue.reason,
      score: fatigue.score,
    });
  }
  const impressions = byKey.get("impressions");
  const reach = byKey.get("reach");
  if (impressions != null && reach != null) {
    const shadow = shadowbanHeuristic({ impressions, reach });
    out.push({
      id: "shadowban_heuristic",
      flag: shadow.flag,
      reason: shadow.reason,
      score: shadow.score,
    });
  }
  return out;
}

export async function listAnalyticsHub(userId: string): Promise<
  {
    platform: AnalyticsPlatform;
    label: string;
    href: string;
    connected: boolean;
    status: string | null;
    lastSyncAt: string | null;
    mode: "snapshots" | "manual";
  }[]
> {
  const connections = await prisma.socialConnection.findMany({
    where: { userId },
    orderBy: { platform: "asc" },
  });
  const byPlatform = new Map(connections.map((c) => [c.platform, c]));

  return ANALYTICS_PLATFORMS.map((platform) => {
    if (platform === "x") {
      return {
        platform,
        label: "X",
        href: "/analytics/x",
        connected: false,
        status: null,
        lastSyncAt: null,
        mode: "manual" as const,
      };
    }
    const conn = byPlatform.get(platform);
    const connected = conn?.status === "connected" || conn?.status === "error";
    return {
      platform,
      label: PRESENTATION[platform].label,
      href: `/analytics/${platform}`,
      connected: Boolean(connected),
      status: conn?.status ?? null,
      lastSyncAt: conn?.lastSyncAt?.toISOString() ?? null,
      mode: "snapshots" as const,
    };
  });
}

export async function readPlatformAnalytics(
  userId: string,
  platform: AnalyticsPlatform,
): Promise<PlatformAnalytics> {
  const cacheKey = `analytics:v1:${userId}:${platform}`;
  const cached = await cacheStore.get(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached) as PlatformAnalytics;
    } catch {
      /* rebuild */
    }
  }

  if (platform === "x") {
    const board: PlatformAnalytics = {
      platform: "x",
      label: "X",
      mode: "manual",
      connected: false,
      connectionStatus: null,
      lastSyncAt: null,
      empty: true,
      focus:
        "X has no free analytics API in V1. Compose and copy from /x — no auto-publish, no fake metrics.",
      metrics: [],
      posts: [],
      heuristics: [],
      syncedAt: null,
    };
    await cacheStore.set(cacheKey, JSON.stringify(board), 60_000);
    return board;
  }

  const presentation = PRESENTATION[platform];
  const conn = await prisma.socialConnection.findFirst({
    where: { userId, platform },
    orderBy: { updatedAt: "desc" },
  });

  const snapshots = await prisma.metricSnapshot.findMany({
    where: { userId, platform },
    orderBy: { capturedAt: "desc" },
    take: 100,
  });

  const byKey = new Map<string, number>();
  let syncedAt: string | null = null;
  for (const row of snapshots) {
    if (!byKey.has(row.metricKey)) {
      byKey.set(row.metricKey, row.value);
    }
    if (!syncedAt) syncedAt = row.capturedAt.toISOString();
  }

  const metrics: MetricRow[] = [];
  for (const spec of presentation.keys) {
    const value = byKey.get(spec.key);
    if (value == null) continue;
    metrics.push({
      key: spec.key,
      label: spec.label,
      value,
      display: formatMetricValue(value, spec.format ?? "number"),
      highlighted: Boolean(spec.highlight),
    });
  }
  // Surface any other keys present (lower priority)
  for (const [key, value] of byKey) {
    if (metrics.some((m) => m.key === key)) continue;
    metrics.push({
      key,
      label: key.replace(/_/g, " "),
      value,
      display: formatMetricValue(value, "number"),
      highlighted: false,
    });
  }

  const postsRaw = conn
    ? await prisma.post.findMany({
        where: { userId, connectionId: conn.id },
        orderBy: { publishedAt: "desc" },
        take: 12,
      })
    : [];

  const posts: AnalyticsPostRow[] = postsRaw.map((p) => ({
    id: p.id,
    caption: p.caption,
    kind: p.kind,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    platformPostId: p.platformPostId,
  }));

  const heuristics =
    platform === "linkedin" ? buildHeuristics(byKey) : [];

  const connected = conn?.status === "connected" || conn?.status === "error";
  const board: PlatformAnalytics = {
    platform,
    label: presentation.label,
    mode: "snapshots",
    connected: Boolean(connected),
    connectionStatus: conn?.status ?? null,
    lastSyncAt: conn?.lastSyncAt?.toISOString() ?? null,
    empty: metrics.length === 0 && posts.length === 0,
    focus: presentation.focus,
    metrics,
    posts,
    heuristics,
    syncedAt: conn?.lastSyncAt?.toISOString() ?? syncedAt,
  };

  await cacheStore.set(cacheKey, JSON.stringify(board), 60_000);
  return board;
}
