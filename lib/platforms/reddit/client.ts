import { getRedditConfig, REDDIT_OAUTH_SCOPES } from "@/lib/platforms/reddit/config";

export type RedditPostItem = {
  id: string;
  title?: string;
  selftext?: string;
  permalink?: string;
  createdUtc?: number;
  score?: number;
  numComments?: number;
  upvoteRatio?: number;
  subreddit?: string;
};

export type RedditInsightPoint = {
  metricKey: string;
  value: number;
};

export function fixtureRedditSyncPayload(userId: string) {
  const externalAccountId = `reddit_fix_${userId.slice(0, 8)}`;
  return {
    accessToken: `fixture_reddit_token_${userId}`,
    refreshToken: `fixture_reddit_refresh_${userId}`,
    externalAccountId,
    displayName: "fixture_pulseboard",
    posts: [
      {
        id: `t3_${userId.slice(0, 6)}1`,
        title: "Fixture Reddit: what actually moved comments?",
        selftext: "Fixture post — invite debate, not drive-by upvotes.",
        permalink: "/r/fixture/comments/1",
        createdUtc: Math.floor(Date.now() / 1000),
        score: 128,
        numComments: 34,
        upvoteRatio: 0.91,
        subreddit: "fixture",
      },
      {
        id: `t3_${userId.slice(0, 6)}2`,
        title: "Fixture Reddit: saves/bookmarks beat vanity score",
        selftext: "Fixture post — useful takeaway in the first line.",
        permalink: "/r/fixture/comments/2",
        createdUtc: Math.floor(Date.now() / 1000) - 86_400,
        score: 76,
        numComments: 19,
        upvoteRatio: 0.87,
        subreddit: "fixture",
      },
    ] satisfies RedditPostItem[],
    insights: [
      { metricKey: "score", value: 204 },
      { metricKey: "comments", value: 53 },
      { metricKey: "upvote_ratio", value: 0.89 },
      { metricKey: "posts_7d", value: 2 },
      { metricKey: "engagement_rate", value: 0.26 },
      { metricKey: "followers_delta_7d", value: 8 },
    ] satisfies RedditInsightPoint[],
  };
}

export function buildRedditOAuthAuthorizeUrl(state: string): string {
  const cfg = getRedditConfig();
  if (cfg.useFixtures) {
    const u = new URL(cfg.redirectUri);
    u.searchParams.set("code", "fixture_reddit_code");
    u.searchParams.set("state", state);
    return u.toString();
  }
  const u = new URL("https://www.reddit.com/api/v1/authorize");
  u.searchParams.set("client_id", cfg.clientId);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("state", state);
  u.searchParams.set("redirect_uri", cfg.redirectUri);
  u.searchParams.set("duration", "permanent");
  u.searchParams.set("scope", REDDIT_OAUTH_SCOPES);
  return u.toString();
}

export async function exchangeRedditCode(code: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}> {
  const cfg = getRedditConfig();
  const basic = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString(
    "base64",
  );
  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": cfg.userAgent,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: cfg.redirectUri,
    }),
  });
  if (!res.ok) throw new Error(`Reddit token exchange failed (${res.status})`);
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
  };
  if (!data.access_token) {
    throw new Error(data.error || "Reddit token response incomplete");
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export async function refreshRedditToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}> {
  const cfg = getRedditConfig();
  const basic = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString(
    "base64",
  );
  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": cfg.userAgent,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`Reddit token refresh failed (${res.status})`);
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!data.access_token) throw new Error("Reddit refresh incomplete");
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export async function fetchRedditMe(accessToken: string): Promise<{
  id: string;
  name: string;
}> {
  const cfg = getRedditConfig();
  const res = await fetch("https://oauth.reddit.com/api/v1/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": cfg.userAgent,
    },
  });
  if (!res.ok) throw new Error(`Reddit /me failed (${res.status})`);
  const data = (await res.json()) as { id?: string; name?: string };
  if (!data.id || !data.name) throw new Error("Reddit /me incomplete");
  return { id: data.id, name: data.name };
}

export async function fetchRedditSubmitted(
  accessToken: string,
  username: string,
): Promise<RedditPostItem[]> {
  const cfg = getRedditConfig();
  const url = new URL(
    `https://oauth.reddit.com/user/${encodeURIComponent(username)}/submitted`,
  );
  url.searchParams.set("limit", "25");
  url.searchParams.set("raw_json", "1");
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": cfg.userAgent,
    },
  });
  if (!res.ok) throw new Error(`Reddit submitted failed (${res.status})`);
  const data = (await res.json()) as {
    data?: {
      children?: Array<{
        data?: {
          id?: string;
          name?: string;
          title?: string;
          selftext?: string;
          permalink?: string;
          created_utc?: number;
          score?: number;
          num_comments?: number;
          upvote_ratio?: number;
          subreddit?: string;
        };
      }>;
    };
  };
  return (data.data?.children ?? [])
    .map((c) => c.data)
    .filter((d): d is NonNullable<typeof d> => Boolean(d?.id))
    .map((d) => ({
      id: d.name ?? d.id!,
      title: d.title,
      selftext: d.selftext,
      permalink: d.permalink
        ? `https://www.reddit.com${d.permalink}`
        : undefined,
      createdUtc: d.created_utc,
      score: d.score ?? 0,
      numComments: d.num_comments ?? 0,
      upvoteRatio: d.upvote_ratio ?? 0,
      subreddit: d.subreddit,
    }));
}

export function insightsFromRedditPosts(
  posts: RedditPostItem[],
): RedditInsightPoint[] {
  const score = posts.reduce((s, p) => s + (p.score ?? 0), 0);
  const comments = posts.reduce((s, p) => s + (p.numComments ?? 0), 0);
  const ratioAvg =
    posts.length > 0
      ? posts.reduce((s, p) => s + (p.upvoteRatio ?? 0), 0) / posts.length
      : 0;
  const eng = score > 0 ? comments / Math.max(score, 1) : 0;
  return [
    { metricKey: "score", value: score },
    { metricKey: "comments", value: comments },
    { metricKey: "upvote_ratio", value: Number(ratioAvg.toFixed(4)) },
    { metricKey: "posts_7d", value: posts.length },
    { metricKey: "engagement_rate", value: Number(Math.min(1, eng).toFixed(4)) },
    { metricKey: "followers_delta_7d", value: 0 },
  ];
}
