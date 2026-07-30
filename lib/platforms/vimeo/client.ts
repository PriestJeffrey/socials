import {
  getVimeoConfig,
  VIMEO_OAUTH_SCOPES,
} from "@/lib/platforms/vimeo/config";

export type VimeoVideoItem = {
  id: string;
  title?: string;
  description?: string;
  url?: string;
  createdAt?: string;
  viewCount?: number;
  type?: string;
  duration?: number;
};

export type VimeoInsightPoint = {
  metricKey: string;
  value: number;
};

const VIMEO_ACCEPT = "application/vnd.vimeo.*+json;version=3.4";

function basicAuthHeader(): string {
  const cfg = getVimeoConfig();
  return `Basic ${Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString("base64")}`;
}

function apiHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: VIMEO_ACCEPT,
  };
}

export function fixtureVimeoSyncPayload(userId: string) {
  const externalAccountId = `vimeo_${userId.slice(0, 8)}`;
  return {
    accessToken: `fixture_vimeo_token_${userId}`,
    refreshToken: `fixture_vimeo_refresh_${userId}`,
    externalAccountId,
    displayName: "fixture_pulseboard",
    videos: [
      {
        id: `vid_${userId.slice(0, 6)}1`,
        title: "Fixture Vimeo: hook in the first 3 seconds",
        description: "Fixture video — retention over vanity plays.",
        url: "https://vimeo.com/1",
        createdAt: new Date().toISOString(),
        viewCount: 3800,
        type: "video",
        duration: 186,
      },
      {
        id: `vid_${userId.slice(0, 6)}2`,
        title: "Fixture Vimeo: title clarity beats vague hype",
        description: "Fixture video — clear promise in the title.",
        url: "https://vimeo.com/2",
        createdAt: new Date(Date.now() - 86_400_000).toISOString(),
        viewCount: 1600,
        type: "video",
        duration: 142,
      },
    ] satisfies VimeoVideoItem[],
    insights: [
      { metricKey: "views", value: 5400 },
      { metricKey: "videos_7d", value: 2 },
      { metricKey: "avg_views", value: 2700 },
      { metricKey: "engagement_rate", value: 0.3 },
      { metricKey: "followers_delta_7d", value: 8 },
    ] satisfies VimeoInsightPoint[],
  };
}

export function buildVimeoOAuthAuthorizeUrl(state: string): string {
  const cfg = getVimeoConfig();
  if (cfg.useFixtures) {
    const u = new URL(cfg.redirectUri);
    u.searchParams.set("code", "fixture_vimeo_code");
    u.searchParams.set("state", state);
    return u.toString();
  }
  const u = new URL("https://api.vimeo.com/oauth/authorize");
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", cfg.clientId);
  u.searchParams.set("redirect_uri", cfg.redirectUri);
  u.searchParams.set("state", state);
  u.searchParams.set("scope", VIMEO_OAUTH_SCOPES);
  return u.toString();
}

export async function exchangeVimeoCode(code: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}> {
  const cfg = getVimeoConfig();
  const res = await fetch("https://api.vimeo.com/oauth/access_token", {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/json",
      Accept: VIMEO_ACCEPT,
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: cfg.redirectUri,
    }),
  });
  if (!res.ok) throw new Error(`Vimeo token exchange failed (${res.status})`);
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!data.access_token) {
    throw new Error(
      data.error_description || data.error || "Vimeo token response incomplete",
    );
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export async function refreshVimeoToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}> {
  const res = await fetch("https://api.vimeo.com/oauth/access_token", {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/json",
      Accept: VIMEO_ACCEPT,
    },
    body: JSON.stringify({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`Vimeo token refresh failed (${res.status})`);
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!data.access_token) throw new Error("Vimeo refresh incomplete");
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export async function fetchVimeoMe(accessToken: string): Promise<{
  id: string;
  name: string;
}> {
  const res = await fetch("https://api.vimeo.com/me", {
    headers: apiHeaders(accessToken),
  });
  if (!res.ok) throw new Error(`Vimeo /me failed (${res.status})`);
  const data = (await res.json()) as {
    uri?: string;
    name?: string;
  };
  const id = data.uri?.split("/").pop();
  if (!id) throw new Error("Vimeo /me incomplete");
  return { id, name: data.name ?? `vimeo_${id}` };
}

export async function fetchVimeoVideos(
  accessToken: string,
): Promise<VimeoVideoItem[]> {
  const u = new URL("https://api.vimeo.com/me/videos");
  u.searchParams.set("per_page", "20");
  u.searchParams.set("sort", "date");
  u.searchParams.set("direction", "desc");
  const res = await fetch(u.toString(), { headers: apiHeaders(accessToken) });
  if (!res.ok) throw new Error(`Vimeo /me/videos failed (${res.status})`);
  const data = (await res.json()) as {
    data?: Array<{
      uri?: string;
      name?: string;
      description?: string | null;
      link?: string;
      created_time?: string;
      duration?: number;
      stats?: { plays?: number | null };
    }>;
  };
  return (data.data ?? [])
    .map((v) => {
      const id = v.uri?.split("/").pop();
      if (!id) return null;
      return {
        id,
        title: v.name,
        description: v.description ?? undefined,
        url: v.link,
        createdAt: v.created_time,
        viewCount: v.stats?.plays ?? 0,
        type: "video",
        duration: v.duration,
      } satisfies VimeoVideoItem;
    })
    .filter((v): v is VimeoVideoItem => v !== null);
}

export function insightsFromVimeoVideos(
  videos: VimeoVideoItem[],
): VimeoInsightPoint[] {
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
