import {
  getThreadsConfig,
  THREADS_OAUTH_SCOPES,
} from "@/lib/platforms/threads/config";

export type ThreadsMediaItem = {
  id: string;
  text?: string;
  permalink?: string;
  timestamp?: string;
  media_type?: string;
};

export type ThreadsInsightPoint = {
  metricKey: string;
  value: number;
  windowStart?: string;
  windowEnd?: string;
};

export function fixtureThreadsSyncPayload(userId: string) {
  const externalAccountId = `threads_fix_${userId.slice(0, 8)}`;
  return {
    accessToken: `fixture_threads_token_${userId}`,
    externalAccountId,
    displayName: "Fixture Threads",
    media: [
      {
        id: `th_post_${userId.slice(0, 6)}_1`,
        text: "Fixture Threads: keep the hook sharp.",
        permalink: "https://example.local/threads/1",
        timestamp: new Date().toISOString(),
        media_type: "TEXT_POST",
      },
      {
        id: `th_post_${userId.slice(0, 6)}_2`,
        text: "Fixture Threads: replies matter more than likes.",
        permalink: "https://example.local/threads/2",
        timestamp: new Date(Date.now() - 86_400_000).toISOString(),
        media_type: "TEXT_POST",
      },
    ] satisfies ThreadsMediaItem[],
    insights: [
      { metricKey: "views", value: 4200 },
      { metricKey: "likes", value: 180 },
      { metricKey: "replies", value: 42 },
      { metricKey: "reposts", value: 18 },
      { metricKey: "quotes", value: 7 },
      { metricKey: "followers_count", value: 910 },
      { metricKey: "followers_delta_7d", value: 12 },
      { metricKey: "engagement_rate", value: 0.038 },
    ] satisfies ThreadsInsightPoint[],
  };
}

export function buildThreadsOAuthAuthorizeUrl(state: string): string {
  const cfg = getThreadsConfig();
  if (cfg.useFixtures) {
    const u = new URL(cfg.redirectUri);
    u.searchParams.set("code", "fixture_threads_code");
    u.searchParams.set("state", state);
    return u.toString();
  }
  const u = new URL("https://threads.net/oauth/authorize");
  u.searchParams.set("client_id", cfg.clientId);
  u.searchParams.set("redirect_uri", cfg.redirectUri);
  u.searchParams.set("scope", THREADS_OAUTH_SCOPES);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("state", state);
  return u.toString();
}

export async function exchangeThreadsCode(code: string): Promise<{
  accessToken: string;
  userId: string;
  expiresIn?: number;
}> {
  const cfg = getThreadsConfig();
  const url = new URL("https://graph.threads.net/oauth/access_token");
  url.searchParams.set("client_id", cfg.clientId);
  url.searchParams.set("client_secret", cfg.clientSecret);
  url.searchParams.set("grant_type", "authorization_code");
  url.searchParams.set("redirect_uri", cfg.redirectUri);
  url.searchParams.set("code", code);
  const res = await fetch(url.toString(), { method: "POST" });
  if (!res.ok) {
    throw new Error(`Threads token exchange failed (${res.status})`);
  }
  const data = (await res.json()) as {
    access_token?: string;
    user_id?: number | string;
    expires_in?: number;
  };
  if (!data.access_token || data.user_id == null) {
    throw new Error("Threads token response missing fields");
  }
  return {
    accessToken: data.access_token,
    userId: String(data.user_id),
    expiresIn: data.expires_in,
  };
}

export async function exchangeThreadsLongLived(shortToken: string): Promise<{
  accessToken: string;
  expiresIn?: number;
}> {
  const cfg = getThreadsConfig();
  const url = new URL("https://graph.threads.net/access_token");
  url.searchParams.set("grant_type", "th_exchange_token");
  url.searchParams.set("client_secret", cfg.clientSecret);
  url.searchParams.set("access_token", shortToken);
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Threads long-lived exchange failed (${res.status})`);
  }
  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!data.access_token) throw new Error("Threads long-lived token missing");
  return { accessToken: data.access_token, expiresIn: data.expires_in };
}

export async function fetchThreadsProfile(
  token: string,
): Promise<{ id: string; username?: string }> {
  const cfg = getThreadsConfig();
  const url = new URL(
    `https://graph.threads.net/${cfg.graphVersion}/me`,
  );
  url.searchParams.set("fields", "id,username,name,threads_profile_picture_url");
  url.searchParams.set("access_token", token);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Threads profile failed (${res.status})`);
  const data = (await res.json()) as { id?: string; username?: string };
  if (!data.id) throw new Error("Threads profile missing id");
  return { id: data.id, username: data.username };
}

export async function fetchThreadsMedia(
  userId: string,
  token: string,
): Promise<ThreadsMediaItem[]> {
  const cfg = getThreadsConfig();
  const url = new URL(
    `https://graph.threads.net/${cfg.graphVersion}/${userId}/threads`,
  );
  url.searchParams.set(
    "fields",
    "id,media_type,text,permalink,timestamp",
  );
  url.searchParams.set("access_token", token);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Threads media failed (${res.status})`);
  const data = (await res.json()) as { data?: ThreadsMediaItem[] };
  return data.data ?? [];
}

export async function fetchThreadsInsights(
  userId: string,
  token: string,
): Promise<ThreadsInsightPoint[]> {
  const cfg = getThreadsConfig();
  const url = new URL(
    `https://graph.threads.net/${cfg.graphVersion}/${userId}/threads_insights`,
  );
  url.searchParams.set("metric", "views,likes,replies,reposts,quotes,followers_count");
  url.searchParams.set("access_token", token);
  const res = await fetch(url.toString());
  if (!res.ok) {
    // Soft degrade — product may lack insights scope yet
    return [];
  }
  const data = (await res.json()) as {
    data?: Array<{ name?: string; values?: Array<{ value?: number }> }>;
  };
  const out: ThreadsInsightPoint[] = [];
  for (const row of data.data ?? []) {
    const value = row.values?.[0]?.value;
    if (row.name && typeof value === "number") {
      out.push({ metricKey: row.name, value });
    }
  }
  return out;
}
