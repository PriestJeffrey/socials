import { getTumblrConfig, TUMBLR_OAUTH_SCOPES } from "@/lib/platforms/tumblr/config";

export type TumblrPostItem = {
  id: string;
  type?: string;
  blogName?: string;
  postUrl?: string;
  summary?: string;
  title?: string;
  body?: string;
  timestamp?: number;
  noteCount?: number;
};

export type TumblrInsightPoint = {
  metricKey: string;
  value: number;
};

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

export function fixtureTumblrSyncPayload(userId: string) {
  const externalAccountId = `fixture-pulseboard-${userId.slice(0, 6)}.tumblr.com`;
  return {
    accessToken: `fixture_tumblr_token_${userId}`,
    refreshToken: `fixture_tumblr_refresh_${userId}`,
    externalAccountId,
    displayName: "fixture-pulseboard",
    posts: [
      {
        id: `${userId.slice(0, 6)}1001`,
        type: "text",
        blogName: "fixture-pulseboard",
        postUrl: "https://fixture-pulseboard.tumblr.com/post/1001",
        summary: "Fixture Tumblr: notes beat vanity — ask one clear question.",
        title: "What actually moved notes?",
        body: "Fixture post — invite reblogs and replies, not drive-by likes.",
        timestamp: Math.floor(Date.now() / 1000),
        noteCount: 86,
      },
      {
        id: `${userId.slice(0, 6)}1002`,
        type: "text",
        blogName: "fixture-pulseboard",
        postUrl: "https://fixture-pulseboard.tumblr.com/post/1002",
        summary: "Fixture Tumblr: lead with the useful takeaway.",
        title: "Saves-style notes > empty reach",
        body: "Fixture post — useful takeaway in the first line.",
        timestamp: Math.floor(Date.now() / 1000) - 86_400,
        noteCount: 41,
      },
    ] satisfies TumblrPostItem[],
    insights: [
      { metricKey: "notes", value: 127 },
      { metricKey: "posts_7d", value: 2 },
      { metricKey: "avg_notes", value: 63.5 },
      { metricKey: "engagement_rate", value: 0.28 },
      { metricKey: "followers_delta_7d", value: 5 },
    ] satisfies TumblrInsightPoint[],
  };
}

export function buildTumblrOAuthAuthorizeUrl(state: string): string {
  const cfg = getTumblrConfig();
  if (cfg.useFixtures) {
    const u = new URL(cfg.redirectUri);
    u.searchParams.set("code", "fixture_tumblr_code");
    u.searchParams.set("state", state);
    return u.toString();
  }
  const u = new URL("https://www.tumblr.com/oauth2/authorize");
  u.searchParams.set("client_id", cfg.clientId);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", TUMBLR_OAUTH_SCOPES);
  u.searchParams.set("state", state);
  u.searchParams.set("redirect_uri", cfg.redirectUri);
  return u.toString();
}

export async function exchangeTumblrCode(code: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}> {
  const cfg = getTumblrConfig();
  const res = await fetch("https://api.tumblr.com/v2/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri: cfg.redirectUri,
    }),
  });
  if (!res.ok) throw new Error(`Tumblr token exchange failed (${res.status})`);
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
  };
  if (!data.access_token) {
    throw new Error(data.error || "Tumblr token response incomplete");
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export async function refreshTumblrToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}> {
  const cfg = getTumblrConfig();
  const res = await fetch("https://api.tumblr.com/v2/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
    }),
  });
  if (!res.ok) throw new Error(`Tumblr token refresh failed (${res.status})`);
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!data.access_token) throw new Error("Tumblr refresh incomplete");
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export async function fetchTumblrUserInfo(accessToken: string): Promise<{
  name: string;
  primaryBlog: string;
}> {
  const res = await fetch("https://api.tumblr.com/v2/user/info", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Tumblr /user/info failed (${res.status})`);
  const data = (await res.json()) as {
    response?: {
      user?: {
        name?: string;
        blogs?: Array<{ name?: string; primary?: boolean; url?: string }>;
      };
    };
  };
  const user = data.response?.user;
  if (!user?.name) throw new Error("Tumblr /user/info incomplete");
  const primary =
    user.blogs?.find((b) => b.primary)?.name ??
    user.blogs?.[0]?.name ??
    user.name;
  const blogId = primary.includes(".") ? primary : `${primary}.tumblr.com`;
  return { name: user.name, primaryBlog: blogId };
}

export async function fetchTumblrPosts(
  accessToken: string,
  blogIdentifier: string,
): Promise<TumblrPostItem[]> {
  const url = new URL(
    `https://api.tumblr.com/v2/blog/${encodeURIComponent(blogIdentifier)}/posts`,
  );
  url.searchParams.set("limit", "20");
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Tumblr posts failed (${res.status})`);
  const data = (await res.json()) as {
    response?: {
      posts?: Array<{
        id?: number | string;
        id_string?: string;
        type?: string;
        blog_name?: string;
        post_url?: string;
        summary?: string;
        title?: string;
        body?: string;
        timestamp?: number;
        note_count?: number;
      }>;
    };
  };
  return (data.response?.posts ?? [])
    .map((p) => {
      const id = p.id_string ?? (p.id != null ? String(p.id) : "");
      if (!id) return null;
      const captionParts = [p.title, p.summary, p.body ? stripHtml(p.body) : ""]
        .filter(Boolean)
        .join("\n\n");
      return {
        id,
        type: p.type,
        blogName: p.blog_name,
        postUrl: p.post_url,
        summary: p.summary,
        title: p.title,
        body: p.body ? stripHtml(p.body) : undefined,
        timestamp: p.timestamp,
        noteCount: p.note_count ?? 0,
        // keep caption material available via summary/title/body
        ...(captionParts ? {} : {}),
      } satisfies TumblrPostItem;
    })
    .filter((p): p is TumblrPostItem => p != null);
}

export function insightsFromTumblrPosts(
  posts: TumblrPostItem[],
): TumblrInsightPoint[] {
  const notes = posts.reduce((s, p) => s + (p.noteCount ?? 0), 0);
  const avg = posts.length > 0 ? notes / posts.length : 0;
  const eng = avg > 0 ? Math.min(1, avg / 200) : 0;
  return [
    { metricKey: "notes", value: notes },
    { metricKey: "posts_7d", value: posts.length },
    { metricKey: "avg_notes", value: Number(avg.toFixed(2)) },
    { metricKey: "engagement_rate", value: Number(eng.toFixed(4)) },
    { metricKey: "followers_delta_7d", value: 0 },
  ];
}
