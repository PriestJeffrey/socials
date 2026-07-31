import { getMetaConfig, FB_OAUTH_SCOPES } from "./config";
import { redactErrorMessage } from "@/lib/security/redact-error";

export type FbPostItem = {
  id: string;
  message?: string;
  permalink_url?: string;
  created_time?: string;
};

export type FbInsightPoint = {
  metricKey: string;
  value: number;
  windowStart?: string;
  windowEnd?: string;
};

export type FbSyncPayload = {
  externalAccountId: string;
  displayName: string;
  accessToken: string;
  posts: FbPostItem[];
  insights: FbInsightPoint[];
};

export function fixtureFbSyncPayload(userId: string): FbSyncPayload {
  const day = new Date().toISOString().slice(0, 10);
  return {
    externalAccountId: `fixture_fb_${userId.slice(0, 8)}`,
    displayName: "Fixture FB Page",
    accessToken: "fixture-fb-token-not-real",
    posts: [
      {
        id: "fb_post_shares_1",
        message: "Organic post with strong shares",
        permalink_url: "https://facebook.com/fixture/posts/1",
        created_time: new Date().toISOString(),
      },
      {
        id: "fb_post_paid_1",
        message: "Boosted post - paid lift",
        permalink_url: "https://facebook.com/fixture/posts/2",
        created_time: new Date().toISOString(),
      },
    ],
    insights: [
      {
        metricKey: "page_impressions",
        value: 4200,
        windowStart: `${day}T00:00:00.000Z`,
        windowEnd: `${day}T23:59:59.000Z`,
      },
      {
        metricKey: "page_engaged_users",
        value: 180,
        windowStart: `${day}T00:00:00.000Z`,
        windowEnd: `${day}T23:59:59.000Z`,
      },
      {
        metricKey: "page_fans_delta_7d",
        value: -12,
        windowStart: `${day}T00:00:00.000Z`,
        windowEnd: `${day}T23:59:59.000Z`,
      },
      {
        metricKey: "organic_share_ratio",
        value: 0.72,
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
    throw new Error(
      redactErrorMessage(body.error?.message ?? `Graph error ${res.status}`),
    );
  }
  return body;
}

export async function exchangeCodeForToken(code: string): Promise<{
  accessToken: string;
  expiresIn?: number;
}> {
  const cfg = getMetaConfig();
  if (cfg.useFixtures) {
    return { accessToken: "fixture-fb-short", expiresIn: 3600 };
  }
  if (!cfg.appId || !cfg.appSecret) {
    throw new Error("META_APP_ID / META_APP_SECRET not configured");
  }
  const redirectUri =
    process.env.META_FB_REDIRECT_URI?.trim() ||
    `${process.env.APP_URL ?? "http://localhost:3000"}/api/oauth/facebook/callback`;
  const url = new URL(`https://graph.facebook.com/${cfg.graphVersion}/oauth/access_token`);
  url.searchParams.set("client_id", cfg.appId);
  url.searchParams.set("client_secret", cfg.appSecret);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("code", code);
  const res = await fetch(url);
  const body = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: { message?: string };
  };
  if (!body.access_token) {
    throw new Error(
      redactErrorMessage(body.error?.message ?? "Token exchange failed"),
    );
  }
  return { accessToken: body.access_token, expiresIn: body.expires_in };
}

export async function exchangeLongLivedToken(shortToken: string): Promise<{
  accessToken: string;
  expiresIn?: number;
}> {
  const cfg = getMetaConfig();
  if (cfg.useFixtures) {
    return { accessToken: "fixture-fb-long", expiresIn: 60 * 60 * 24 * 60 };
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
    throw new Error(
      redactErrorMessage(body.error?.message ?? "Long-lived token exchange failed"),
    );
  }
  return { accessToken: body.access_token, expiresIn: body.expires_in };
}

export async function discoverFbPage(accessToken: string): Promise<{
  externalAccountId: string;
  displayName: string;
  pageAccessToken: string;
}> {
  const cfg = getMetaConfig();
  if (cfg.useFixtures) {
    return {
      externalAccountId: "fixture_fb_page",
      displayName: "Fixture FB Page",
      pageAccessToken: accessToken,
    };
  }

  const pages = await graphGet<{
    data?: Array<{ id: string; name?: string; access_token?: string }>;
  }>("/me/accounts", accessToken);

  const page = (pages.data ?? []).find((p) => p.access_token);
  if (!page?.access_token) {
    throw new Error("No Facebook Page found. Create a Page and grant access.");
  }
  return {
    externalAccountId: page.id,
    displayName: page.name ?? page.id,
    pageAccessToken: page.access_token,
  };
}

export async function fetchFbPosts(
  pageId: string,
  accessToken: string,
): Promise<FbPostItem[]> {
  const cfg = getMetaConfig();
  if (cfg.useFixtures) return fixtureFbSyncPayload("x").posts;

  const res = await graphGet<{ data?: FbPostItem[] }>(`/${pageId}/posts`, accessToken, {
    fields: "id,message,permalink_url,created_time",
    limit: "25",
  });
  return res.data ?? [];
}

export async function fetchFbInsights(
  pageId: string,
  accessToken: string,
): Promise<FbInsightPoint[]> {
  const cfg = getMetaConfig();
  if (cfg.useFixtures) return fixtureFbSyncPayload("x").insights;

  try {
    const res = await graphGet<{
      data?: Array<{ name: string; values?: Array<{ value: number }> }>;
    }>(`/${pageId}/insights`, accessToken, {
      metric: "page_impressions,page_engaged_users",
      period: "day",
    });
    const points: FbInsightPoint[] = [];
    for (const row of res.data ?? []) {
      points.push({ metricKey: row.name, value: row.values?.[0]?.value ?? 0 });
    }
    return points;
  } catch {
    return [];
  }
}

export function buildFbOAuthAuthorizeUrl(state: string): string {
  const cfg = getMetaConfig();
  const redirectUri =
    process.env.META_FB_REDIRECT_URI?.trim() ||
    `${process.env.APP_URL ?? "http://localhost:3000"}/api/oauth/facebook/callback`;

  if (cfg.useFixtures) {
    const u = new URL(
      `${process.env.APP_URL ?? "http://localhost:3000"}/api/oauth/facebook/callback`,
    );
    u.searchParams.set("code", "fixture_code");
    u.searchParams.set("state", state);
    return u.toString();
  }
  if (!cfg.appId) throw new Error("META_APP_ID not configured");

  const url = new URL(`https://www.facebook.com/${cfg.graphVersion}/dialog/oauth`);
  url.searchParams.set("client_id", cfg.appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", FB_OAUTH_SCOPES);
  url.searchParams.set("response_type", "code");
  return url.toString();
}

async function graphPost<T>(
  path: string,
  accessToken: string,
  body: Record<string, string>,
): Promise<T> {
  const { graphVersion } = getMetaConfig();
  const url = new URL(`https://graph.facebook.com/${graphVersion}${path}`);
  const form = new URLSearchParams(body);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });
  const json = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok || json.error) {
    throw new Error(
      redactErrorMessage(json.error?.message ?? `Graph POST error ${res.status}`),
    );
  }
  return json;
}

/** Live Facebook Page text post. */
export async function publishFbPagePost(input: {
  pageId: string;
  accessToken: string;
  message: string;
}): Promise<{ platformPostId: string; permalink?: string }> {
  const created = await graphPost<{ id?: string }>(
    `/${input.pageId}/feed`,
    input.accessToken,
    { message: input.message.slice(0, 63206) },
  );
  if (!created.id) throw new Error("Facebook feed post missing id");
  let permalink: string | undefined;
  try {
    const detail = await graphGet<{ permalink_url?: string }>(
      `/${created.id}`,
      input.accessToken,
      { fields: "permalink_url" },
    );
    permalink = detail.permalink_url;
  } catch {
    /* optional */
  }
  return { platformPostId: created.id, permalink };
}
