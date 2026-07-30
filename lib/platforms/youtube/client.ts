import { getYouTubeConfig, YOUTUBE_OAUTH_SCOPES } from "@/lib/platforms/youtube/config";

export type YouTubeVideoItem = {
  id: string;
  title?: string;
  description?: string;
  publishedAt?: string;
  permalink?: string;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
};

export type YouTubeInsightPoint = {
  metricKey: string;
  value: number;
};

export function fixtureYouTubeSyncPayload(userId: string) {
  const externalAccountId = `yt_fix_${userId.slice(0, 8)}`;
  return {
    accessToken: `fixture_yt_token_${userId}`,
    refreshToken: `fixture_yt_refresh_${userId}`,
    externalAccountId,
    displayName: "Fixture YouTube",
    videos: [
      {
        id: `yt_vid_${userId.slice(0, 6)}_1`,
        title: "Fixture: first 3 seconds",
        description: "Fixture YouTube: hook early, retain watch time.",
        publishedAt: new Date().toISOString(),
        permalink: "https://example.local/youtube/1",
        viewCount: 18400,
        likeCount: 920,
        commentCount: 74,
      },
      {
        id: `yt_vid_${userId.slice(0, 6)}_2`,
        title: "Fixture: chapter tips",
        description: "Fixture YouTube: chapters beat drop-off.",
        publishedAt: new Date(Date.now() - 86_400_000).toISOString(),
        permalink: "https://example.local/youtube/2",
        viewCount: 9600,
        likeCount: 410,
        commentCount: 33,
      },
    ] satisfies YouTubeVideoItem[],
    insights: [
      { metricKey: "video_views", value: 28000 },
      { metricKey: "likes", value: 1330 },
      { metricKey: "comments", value: 107 },
      { metricKey: "subscribers_count", value: 5200 },
      { metricKey: "subscribers_delta_7d", value: 38 },
      { metricKey: "engagement_rate", value: 0.051 },
      { metricKey: "avg_view_duration_proxy", value: 0.42 },
    ] satisfies YouTubeInsightPoint[],
  };
}

export function buildYouTubeOAuthAuthorizeUrl(state: string): string {
  const cfg = getYouTubeConfig();
  if (cfg.useFixtures) {
    const u = new URL(cfg.redirectUri);
    u.searchParams.set("code", "fixture_youtube_code");
    u.searchParams.set("state", state);
    return u.toString();
  }
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.searchParams.set("client_id", cfg.clientId);
  u.searchParams.set("redirect_uri", cfg.redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", YOUTUBE_OAUTH_SCOPES);
  u.searchParams.set("access_type", "offline");
  u.searchParams.set("prompt", "consent");
  u.searchParams.set("state", state);
  return u.toString();
}

export async function exchangeYouTubeCode(code: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}> {
  const cfg = getYouTubeConfig();
  const res = await fetch("https://oauth2.googleapis.com/token", {
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
  if (!res.ok) throw new Error(`YouTube token exchange failed (${res.status})`);
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!data.access_token) {
    throw new Error(
      data.error_description || data.error || "YouTube token response incomplete",
    );
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export async function refreshYouTubeToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}> {
  const cfg = getYouTubeConfig();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`YouTube token refresh failed (${res.status})`);
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!data.access_token) throw new Error("YouTube refresh incomplete");
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export async function fetchYouTubeChannel(accessToken: string): Promise<{
  channelId: string;
  title: string;
  uploadsPlaylistId: string;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
}> {
  const url = new URL("https://www.googleapis.com/youtube/v3/channels");
  url.searchParams.set("part", "snippet,contentDetails,statistics");
  url.searchParams.set("mine", "true");
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`YouTube channels.list failed (${res.status})`);
  const data = (await res.json()) as {
    items?: Array<{
      id: string;
      snippet?: { title?: string };
      contentDetails?: { relatedPlaylists?: { uploads?: string } };
      statistics?: {
        subscriberCount?: string;
        viewCount?: string;
        videoCount?: string;
      };
    }>;
  };
  const item = data.items?.[0];
  if (!item?.id || !item.contentDetails?.relatedPlaylists?.uploads) {
    throw new Error("No YouTube channel for this account");
  }
  return {
    channelId: item.id,
    title: item.snippet?.title ?? "YouTube",
    uploadsPlaylistId: item.contentDetails.relatedPlaylists.uploads,
    subscriberCount: Number(item.statistics?.subscriberCount ?? 0),
    viewCount: Number(item.statistics?.viewCount ?? 0),
    videoCount: Number(item.statistics?.videoCount ?? 0),
  };
}

export async function fetchYouTubeVideos(accessToken: string): Promise<{
  channel: Awaited<ReturnType<typeof fetchYouTubeChannel>>;
  videos: YouTubeVideoItem[];
}> {
  const channel = await fetchYouTubeChannel(accessToken);
  const plUrl = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
  plUrl.searchParams.set("part", "contentDetails,snippet");
  plUrl.searchParams.set("playlistId", channel.uploadsPlaylistId);
  plUrl.searchParams.set("maxResults", "10");
  const plRes = await fetch(plUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!plRes.ok) {
    throw new Error(`YouTube playlistItems.list failed (${plRes.status})`);
  }
  const plData = (await plRes.json()) as {
    items?: Array<{ contentDetails?: { videoId?: string } }>;
  };
  const ids = (plData.items ?? [])
    .map((i) => i.contentDetails?.videoId)
    .filter((id): id is string => Boolean(id));
  if (ids.length === 0) {
    return { channel, videos: [] };
  }

  const vUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  vUrl.searchParams.set("part", "snippet,statistics");
  vUrl.searchParams.set("id", ids.join(","));
  const vRes = await fetch(vUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!vRes.ok) throw new Error(`YouTube videos.list failed (${vRes.status})`);
  const vData = (await vRes.json()) as {
    items?: Array<{
      id: string;
      snippet?: {
        title?: string;
        description?: string;
        publishedAt?: string;
      };
      statistics?: {
        viewCount?: string;
        likeCount?: string;
        commentCount?: string;
      };
    }>;
  };

  const videos: YouTubeVideoItem[] = (vData.items ?? []).map((item) => ({
    id: item.id,
    title: item.snippet?.title,
    description: item.snippet?.description,
    publishedAt: item.snippet?.publishedAt,
    permalink: `https://www.youtube.com/watch?v=${item.id}`,
    viewCount: Number(item.statistics?.viewCount ?? 0),
    likeCount: Number(item.statistics?.likeCount ?? 0),
    commentCount: Number(item.statistics?.commentCount ?? 0),
  }));

  return { channel, videos };
}

export function insightsFromYouTube(input: {
  channel: {
    subscriberCount: number;
    viewCount: number;
  };
  videos: YouTubeVideoItem[];
}): YouTubeInsightPoint[] {
  const views = input.videos.reduce((s, v) => s + (v.viewCount ?? 0), 0);
  const likes = input.videos.reduce((s, v) => s + (v.likeCount ?? 0), 0);
  const comments = input.videos.reduce((s, v) => s + (v.commentCount ?? 0), 0);
  const eng = views > 0 ? (likes + comments) / views : 0;
  return [
    { metricKey: "video_views", value: views || input.channel.viewCount },
    { metricKey: "likes", value: likes },
    { metricKey: "comments", value: comments },
    { metricKey: "subscribers_count", value: input.channel.subscriberCount },
    { metricKey: "subscribers_delta_7d", value: 0 },
    { metricKey: "engagement_rate", value: Number(eng.toFixed(4)) },
    { metricKey: "avg_view_duration_proxy", value: 0 },
  ];
}
