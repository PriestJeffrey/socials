import { getTwitchConfig, TWITCH_OAUTH_SCOPES } from "@/lib/platforms/twitch/config";

export type TwitchVideoItem = {
  id: string;
  title?: string;
  description?: string;
  url?: string;
  createdAt?: string;
  viewCount?: number;
  type?: string;
  duration?: string;
};

export type TwitchInsightPoint = {
  metricKey: string;
  value: number;
};

function helixHeaders(accessToken: string): HeadersInit {
  const cfg = getTwitchConfig();
  return {
    Authorization: `Bearer ${accessToken}`,
    "Client-Id": cfg.clientId,
  };
}

export function fixtureTwitchSyncPayload(userId: string) {
  const externalAccountId = `twitch_${userId.slice(0, 8)}`;
  return {
    accessToken: `fixture_twitch_token_${userId}`,
    refreshToken: `fixture_twitch_refresh_${userId}`,
    externalAccountId,
    displayName: "fixture_pulseboard",
    videos: [
      {
        id: `v_${userId.slice(0, 6)}1`,
        title: "Fixture Twitch: hook in the first 3 seconds",
        description: "Fixture VOD — watch retention over vanity peak viewers.",
        url: "https://www.twitch.tv/videos/1",
        createdAt: new Date().toISOString(),
        viewCount: 4200,
        type: "archive",
        duration: "1h2m3s",
      },
      {
        id: `v_${userId.slice(0, 6)}2`,
        title: "Fixture Twitch: title clarity beats vague hype",
        description: "Fixture VOD — clear promise in the title.",
        url: "https://www.twitch.tv/videos/2",
        createdAt: new Date(Date.now() - 86_400_000).toISOString(),
        viewCount: 1800,
        type: "archive",
        duration: "45m10s",
      },
    ] satisfies TwitchVideoItem[],
    insights: [
      { metricKey: "views", value: 6000 },
      { metricKey: "videos_7d", value: 2 },
      { metricKey: "avg_views", value: 3000 },
      { metricKey: "engagement_rate", value: 0.32 },
      { metricKey: "followers_delta_7d", value: 12 },
    ] satisfies TwitchInsightPoint[],
  };
}

export function buildTwitchOAuthAuthorizeUrl(state: string): string {
  const cfg = getTwitchConfig();
  if (cfg.useFixtures) {
    const u = new URL(cfg.redirectUri);
    u.searchParams.set("code", "fixture_twitch_code");
    u.searchParams.set("state", state);
    return u.toString();
  }
  const u = new URL("https://id.twitch.tv/oauth2/authorize");
  u.searchParams.set("client_id", cfg.clientId);
  u.searchParams.set("redirect_uri", cfg.redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", TWITCH_OAUTH_SCOPES);
  u.searchParams.set("state", state);
  return u.toString();
}

export async function exchangeTwitchCode(code: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}> {
  const cfg = getTwitchConfig();
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: cfg.redirectUri,
    }),
  });
  if (!res.ok) throw new Error(`Twitch token exchange failed (${res.status})`);
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    message?: string;
  };
  if (!data.access_token) {
    throw new Error(data.message || "Twitch token response incomplete");
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export async function refreshTwitchToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}> {
  const cfg = getTwitchConfig();
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`Twitch token refresh failed (${res.status})`);
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!data.access_token) throw new Error("Twitch refresh incomplete");
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export async function fetchTwitchMe(accessToken: string): Promise<{
  id: string;
  login: string;
  displayName: string;
}> {
  const res = await fetch("https://api.twitch.tv/helix/users", {
    headers: helixHeaders(accessToken),
  });
  if (!res.ok) throw new Error(`Twitch /users failed (${res.status})`);
  const data = (await res.json()) as {
    data?: Array<{ id?: string; login?: string; display_name?: string }>;
  };
  const user = data.data?.[0];
  if (!user?.id || !user.login) throw new Error("Twitch /users incomplete");
  return {
    id: user.id,
    login: user.login,
    displayName: user.display_name ?? user.login,
  };
}

export async function fetchTwitchVideos(
  accessToken: string,
  userId: string,
): Promise<TwitchVideoItem[]> {
  const url = new URL("https://api.twitch.tv/helix/videos");
  url.searchParams.set("user_id", userId);
  url.searchParams.set("first", "20");
  const res = await fetch(url, { headers: helixHeaders(accessToken) });
  if (!res.ok) throw new Error(`Twitch /videos failed (${res.status})`);
  const data = (await res.json()) as {
    data?: Array<{
      id?: string;
      title?: string;
      description?: string;
      url?: string;
      created_at?: string;
      view_count?: number;
      type?: string;
      duration?: string;
    }>;
  };
  return (data.data ?? [])
    .filter((v): v is typeof v & { id: string } => Boolean(v?.id))
    .map((v) => ({
      id: v.id,
      title: v.title,
      description: v.description,
      url: v.url,
      createdAt: v.created_at,
      viewCount: v.view_count ?? 0,
      type: v.type,
      duration: v.duration,
    }));
}

export function insightsFromTwitchVideos(
  videos: TwitchVideoItem[],
): TwitchInsightPoint[] {
  const views = videos.reduce((s, v) => s + (v.viewCount ?? 0), 0);
  const avg = videos.length > 0 ? views / videos.length : 0;
  const eng = avg > 0 ? Math.min(1, avg / 10_000) : 0;
  return [
    { metricKey: "views", value: views },
    { metricKey: "videos_7d", value: videos.length },
    { metricKey: "avg_views", value: Number(avg.toFixed(2)) },
    { metricKey: "engagement_rate", value: Number(eng.toFixed(4)) },
    { metricKey: "followers_delta_7d", value: 0 },
  ];
}
