import { getMetaConfig, IG_OAUTH_SCOPES } from "./config";

export type IgMediaItem = {
  id: string;
  caption?: string;
  permalink?: string;
  timestamp?: string;
  media_type?: string;
};

export type IgInsightPoint = {
  metricKey: string;
  value: number;
  windowStart?: string;
  windowEnd?: string;
};

export type IgSyncPayload = {
  externalAccountId: string;
  displayName: string;
  accessToken: string;
  media: IgMediaItem[];
  insights: IgInsightPoint[];
};

/** Deterministic local data when META_USE_FIXTURES=true or Meta not configured for sync tests. */
export function fixtureSyncPayload(userId: string): IgSyncPayload {
  const day = new Date().toISOString().slice(0, 10);
  return {
    externalAccountId: `fixture_ig_${userId.slice(0, 8)}`,
    displayName: "Fixture IG",
    accessToken: "fixture-token-not-real",
    media: [
      {
        id: "media_broken_1",
        caption: "Reach decay on Reels",
        permalink: "https://instagram.com/p/fixture1",
        timestamp: new Date().toISOString(),
        media_type: "REELS",
      },
      {
        id: "media_working_1",
        caption: "Carousel that saves",
        permalink: "https://instagram.com/p/fixture2",
        timestamp: new Date().toISOString(),
        media_type: "CAROUSEL_ALBUM",
      },
    ],
    insights: [
      {
        metricKey: "reach_delta_7d",
        value: -32,
        windowStart: `${day}T00:00:00.000Z`,
        windowEnd: `${day}T23:59:59.000Z`,
      },
      {
        metricKey: "saves_rate",
        value: 0.08,
        windowStart: `${day}T00:00:00.000Z`,
        windowEnd: `${day}T23:59:59.000Z`,
      },
      {
        metricKey: "engagement_rate",
        value: 0.045,
        windowStart: `${day}T00:00:00.000Z`,
        windowEnd: `${day}T23:59:59.000Z`,
      },
    ],
  };
}

async function graphGet<T>(
  path: string,
  accessToken: string,
  query: Record<string, string> = {},
): Promise<T> {
  const { graphVersion } = getMetaConfig();
  const url = new URL(`https://graph.facebook.com/${graphVersion}${path}`);
  url.searchParams.set("access_token", accessToken);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  const res = await fetch(url);
  const body = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok || body.error) {
    throw new Error(body.error?.message ?? `Graph error ${res.status}`);
  }
  return body;
}

export async function exchangeCodeForToken(code: string): Promise<{
  accessToken: string;
  expiresIn?: number;
}> {
  const cfg = getMetaConfig();
  if (cfg.useFixtures) {
    return { accessToken: "fixture-short-lived", expiresIn: 3600 };
  }
  if (!cfg.appId || !cfg.appSecret) {
    throw new Error("META_APP_ID / META_APP_SECRET not configured");
  }
  const url = new URL(`https://graph.facebook.com/${cfg.graphVersion}/oauth/access_token`);
  url.searchParams.set("client_id", cfg.appId);
  url.searchParams.set("client_secret", cfg.appSecret);
  url.searchParams.set("redirect_uri", cfg.redirectUri);
  url.searchParams.set("code", code);
  const res = await fetch(url);
  const body = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: { message?: string };
  };
  if (!body.access_token) {
    throw new Error(body.error?.message ?? "Token exchange failed");
  }
  return { accessToken: body.access_token, expiresIn: body.expires_in };
}

export async function exchangeLongLivedToken(shortToken: string): Promise<{
  accessToken: string;
  expiresIn?: number;
}> {
  const cfg = getMetaConfig();
  if (cfg.useFixtures) {
    return { accessToken: "fixture-long-lived", expiresIn: 60 * 60 * 24 * 60 };
  }
  const url = new URL(`https://graph.facebook.com/${cfg.graphVersion}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", cfg.appId);
  url.searchParams.set("client_secret", cfg.appSecret);
  url.searchParams.set("fb_exchange_token", shortToken);
  const res = await fetch(url);
  const body = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: { message?: string };
  };
  if (!body.access_token) {
    throw new Error(body.error?.message ?? "Long-lived token exchange failed");
  }
  return { accessToken: body.access_token, expiresIn: body.expires_in };
}

export async function discoverIgAccount(accessToken: string): Promise<{
  externalAccountId: string;
  displayName: string;
  pageAccessToken: string;
}> {
  const cfg = getMetaConfig();
  if (cfg.useFixtures) {
    return {
      externalAccountId: "fixture_ig_account",
      displayName: "Fixture IG",
      pageAccessToken: accessToken,
    };
  }

  const pages = await graphGet<{
    data?: Array<{ id: string; name?: string; access_token?: string }>;
  }>("/me/accounts", accessToken);

  for (const page of pages.data ?? []) {
    if (!page.access_token) continue;
    const detail = await graphGet<{
      instagram_business_account?: { id: string; name?: string; username?: string };
    }>(`/${page.id}`, page.access_token, {
      fields: "instagram_business_account{id,name,username}",
    });
    const ig = detail.instagram_business_account;
    if (ig?.id) {
      return {
        externalAccountId: ig.id,
        displayName: ig.username ?? ig.name ?? page.name ?? ig.id,
        pageAccessToken: page.access_token,
      };
    }
  }

  throw new Error(
    "No Instagram Business account found on your Pages. Link IG in Meta Business Suite.",
  );
}

export async function fetchIgMedia(
  igUserId: string,
  accessToken: string,
): Promise<IgMediaItem[]> {
  const cfg = getMetaConfig();
  if (cfg.useFixtures) return fixtureSyncPayload("x").media;

  const res = await graphGet<{ data?: IgMediaItem[] }>(
    `/${igUserId}/media`,
    accessToken,
    { fields: "id,caption,permalink,timestamp,media_type", limit: "25" },
  );
  return res.data ?? [];
}

export async function fetchIgInsights(
  igUserId: string,
  accessToken: string,
): Promise<IgInsightPoint[]> {
  const cfg = getMetaConfig();
  if (cfg.useFixtures) return fixtureSyncPayload("x").insights;

  try {
    const res = await graphGet<{
      data?: Array<{ name: string; values?: Array<{ value: number }> }>;
    }>(`/${igUserId}/insights`, accessToken, {
      metric: "reach,impressions,profile_views",
      period: "day",
    });
    const points: IgInsightPoint[] = [];
    for (const row of res.data ?? []) {
      const value = row.values?.[0]?.value ?? 0;
      points.push({ metricKey: row.name, value });
    }
    return points;
  } catch {
    // Insights often need more permissions / history - soft-fail to empty
    return [];
  }
}

export function buildOAuthAuthorizeUrl(state: string): string {
  const cfg = getMetaConfig();
  if (cfg.useFixtures) {
    // Fixture connect always uses local callback - never open Meta dialog
    const u = new URL(
      `${process.env.APP_URL ?? "http://localhost:3000"}/api/oauth/instagram/callback`,
    );
    u.searchParams.set("code", "fixture_code");
    u.searchParams.set("state", state);
    return u.toString();
  }
  if (!cfg.appId) {
    throw new Error("META_APP_ID not configured");
  }
  const url = new URL(`https://www.facebook.com/${cfg.graphVersion}/dialog/oauth`);
  url.searchParams.set("client_id", cfg.appId);
  url.searchParams.set("redirect_uri", cfg.redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", IG_OAUTH_SCOPES);
  url.searchParams.set("response_type", "code");
  return url.toString();
}
