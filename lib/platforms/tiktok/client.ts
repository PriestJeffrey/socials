import { getTikTokConfig, TIKTOK_OAUTH_SCOPES } from "@/lib/platforms/tiktok/config";

export type TikTokVideoItem = {
  id: string;
  title?: string;
  video_description?: string;
  create_time?: number;
  share_url?: string;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
};

export type TikTokInsightPoint = {
  metricKey: string;
  value: number;
};

export function fixtureTikTokSyncPayload(userId: string) {
  const externalAccountId = `tiktok_fix_${userId.slice(0, 8)}`;
  return {
    accessToken: `fixture_tiktok_token_${userId}`,
    refreshToken: `fixture_tiktok_refresh_${userId}`,
    externalAccountId,
    displayName: "Fixture TikTok",
    videos: [
      {
        id: `tt_vid_${userId.slice(0, 6)}_1`,
        title: "Fixture hook",
        video_description: "Fixture TikTok: hook in the first second.",
        create_time: Math.floor(Date.now() / 1000),
        share_url: "https://example.local/tiktok/1",
        view_count: 12500,
        like_count: 840,
        comment_count: 61,
        share_count: 44,
      },
      {
        id: `tt_vid_${userId.slice(0, 6)}_2`,
        title: "Fixture tip",
        video_description: "Fixture TikTok: replies beat vanity metrics.",
        create_time: Math.floor(Date.now() / 1000) - 86_400,
        share_url: "https://example.local/tiktok/2",
        view_count: 8200,
        like_count: 410,
        comment_count: 28,
        share_count: 19,
      },
    ] satisfies TikTokVideoItem[],
    insights: [
      { metricKey: "video_views", value: 20700 },
      { metricKey: "likes", value: 1250 },
      { metricKey: "comments", value: 89 },
      { metricKey: "shares", value: 63 },
      { metricKey: "followers_count", value: 3400 },
      { metricKey: "followers_delta_7d", value: 45 },
      { metricKey: "engagement_rate", value: 0.068 },
      { metricKey: "avg_watch_ratio", value: 0.41 },
    ] satisfies TikTokInsightPoint[],
  };
}

export function buildTikTokOAuthAuthorizeUrl(state: string): string {
  const cfg = getTikTokConfig();
  if (cfg.useFixtures) {
    const u = new URL(cfg.redirectUri);
    u.searchParams.set("code", "fixture_tiktok_code");
    u.searchParams.set("state", state);
    return u.toString();
  }
  const u = new URL("https://www.tiktok.com/v2/auth/authorize/");
  u.searchParams.set("client_key", cfg.clientKey);
  u.searchParams.set("redirect_uri", cfg.redirectUri);
  u.searchParams.set("scope", TIKTOK_OAUTH_SCOPES);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("state", state);
  return u.toString();
}

export async function exchangeTikTokCode(code: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  openId: string;
}> {
  const cfg = getTikTokConfig();
  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: cfg.clientKey,
      client_secret: cfg.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: cfg.redirectUri,
    }),
  });
  if (!res.ok) throw new Error(`TikTok token exchange failed (${res.status})`);
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    open_id?: string;
    error?: string;
    error_description?: string;
  };
  if (!data.access_token || !data.open_id) {
    throw new Error(
      data.error_description || data.error || "TikTok token response incomplete",
    );
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    openId: data.open_id,
  };
}

export async function refreshTikTokToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}> {
  const cfg = getTikTokConfig();
  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: cfg.clientKey,
      client_secret: cfg.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`TikTok refresh failed (${res.status})`);
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!data.access_token) throw new Error("TikTok refresh missing access_token");
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export async function fetchTikTokUser(
  token: string,
): Promise<{ openId: string; displayName: string }> {
  const url = new URL("https://open.tiktokapis.com/v2/user/info/");
  url.searchParams.set("fields", "open_id,display_name,avatar_url");
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`TikTok user info failed (${res.status})`);
  const data = (await res.json()) as {
    data?: { user?: { open_id?: string; display_name?: string } };
  };
  const user = data.data?.user;
  if (!user?.open_id) throw new Error("TikTok user missing open_id");
  return {
    openId: user.open_id,
    displayName: user.display_name ?? `TikTok ${user.open_id}`,
  };
}

export async function fetchTikTokVideos(
  token: string,
): Promise<TikTokVideoItem[]> {
  const res = await fetch(
    "https://open.tiktokapis.com/v2/video/list/?fields=id,title,video_description,create_time,share_url,view_count,like_count,comment_count,share_count",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ max_count: 20 }),
    },
  );
  if (!res.ok) throw new Error(`TikTok video list failed (${res.status})`);
  const data = (await res.json()) as {
    data?: { videos?: TikTokVideoItem[] };
  };
  return data.data?.videos ?? [];
}

/** Derive simple snapshot metrics from video list when insights product unavailable. */
export function insightsFromVideos(videos: TikTokVideoItem[]): TikTokInsightPoint[] {
  let views = 0;
  let likes = 0;
  let comments = 0;
  let shares = 0;
  for (const v of videos) {
    views += v.view_count ?? 0;
    likes += v.like_count ?? 0;
    comments += v.comment_count ?? 0;
    shares += v.share_count ?? 0;
  }
  const eng =
    views > 0 ? (likes + comments + shares) / views : 0;
  return [
    { metricKey: "video_views", value: views },
    { metricKey: "likes", value: likes },
    { metricKey: "comments", value: comments },
    { metricKey: "shares", value: shares },
    { metricKey: "engagement_rate", value: Number(eng.toFixed(4)) },
  ];
}
