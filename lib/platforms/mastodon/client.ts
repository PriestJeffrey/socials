import {
  getMastodonConfig,
  MASTODON_OAUTH_SCOPES,
} from "@/lib/platforms/mastodon/config";

export type MastodonStatusItem = {
  id: string;
  content?: string;
  url?: string;
  createdAt?: string;
  repliesCount?: number;
  reblogsCount?: number;
  favouritesCount?: number;
  visibility?: string;
};

export type MastodonInsightPoint = {
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

export function fixtureMastodonSyncPayload(userId: string) {
  const externalAccountId = `mastodon_fix_${userId.slice(0, 8)}`;
  return {
    accessToken: `fixture_mastodon_token_${userId}`,
    refreshToken: undefined as string | undefined,
    externalAccountId,
    displayName: "fixture_pulseboard@mastodon.social",
    statuses: [
      {
        id: `mstdn_${userId.slice(0, 6)}1`,
        content:
          "Fixture Mastodon: replies beat vanity favourites — ask one clear question.",
        url: "https://mastodon.social/@fixture/1",
        createdAt: new Date().toISOString(),
        repliesCount: 28,
        reblogsCount: 12,
        favouritesCount: 64,
        visibility: "public",
      },
      {
        id: `mstdn_${userId.slice(0, 6)}2`,
        content:
          "Fixture Mastodon: boosts signal distribution — lead with the useful takeaway.",
        url: "https://mastodon.social/@fixture/2",
        createdAt: new Date(Date.now() - 86_400_000).toISOString(),
        repliesCount: 9,
        reblogsCount: 21,
        favouritesCount: 41,
        visibility: "public",
      },
    ] satisfies MastodonStatusItem[],
    insights: [
      { metricKey: "replies", value: 37 },
      { metricKey: "reblogs", value: 33 },
      { metricKey: "favourites", value: 105 },
      { metricKey: "posts_7d", value: 2 },
      { metricKey: "engagement_rate", value: 0.35 },
      { metricKey: "followers_delta_7d", value: 6 },
    ] satisfies MastodonInsightPoint[],
  };
}

export function buildMastodonOAuthAuthorizeUrl(state: string): string {
  const cfg = getMastodonConfig();
  if (cfg.useFixtures) {
    const u = new URL(cfg.redirectUri);
    u.searchParams.set("code", "fixture_mastodon_code");
    u.searchParams.set("state", state);
    return u.toString();
  }
  const u = new URL(`${cfg.instanceUrl}/oauth/authorize`);
  u.searchParams.set("client_id", cfg.clientId);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("redirect_uri", cfg.redirectUri);
  u.searchParams.set("scope", MASTODON_OAUTH_SCOPES);
  u.searchParams.set("state", state);
  return u.toString();
}

export async function exchangeMastodonCode(code: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}> {
  const cfg = getMastodonConfig();
  const res = await fetch(`${cfg.instanceUrl}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri: cfg.redirectUri,
      scope: MASTODON_OAUTH_SCOPES,
    }),
  });
  if (!res.ok) throw new Error(`Mastodon token exchange failed (${res.status})`);
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
  };
  if (!data.access_token) {
    throw new Error(data.error || "Mastodon token response incomplete");
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export async function fetchMastodonMe(accessToken: string): Promise<{
  id: string;
  username: string;
  acct: string;
}> {
  const cfg = getMastodonConfig();
  const res = await fetch(
    `${cfg.instanceUrl}/api/v1/accounts/verify_credentials`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (!res.ok) {
    throw new Error(`Mastodon verify_credentials failed (${res.status})`);
  }
  const data = (await res.json()) as {
    id?: string;
    username?: string;
    acct?: string;
  };
  if (!data.id || !data.username) {
    throw new Error("Mastodon verify_credentials incomplete");
  }
  return {
    id: data.id,
    username: data.username,
    acct: data.acct ?? data.username,
  };
}

export async function fetchMastodonStatuses(
  accessToken: string,
  accountId: string,
): Promise<MastodonStatusItem[]> {
  const cfg = getMastodonConfig();
  const url = new URL(
    `${cfg.instanceUrl}/api/v1/accounts/${encodeURIComponent(accountId)}/statuses`,
  );
  url.searchParams.set("limit", "40");
  url.searchParams.set("exclude_replies", "false");
  url.searchParams.set("exclude_reblogs", "true");
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Mastodon statuses failed (${res.status})`);
  const data = (await res.json()) as Array<{
    id?: string;
    content?: string;
    url?: string;
    created_at?: string;
    replies_count?: number;
    reblogs_count?: number;
    favourites_count?: number;
    visibility?: string;
  }>;
  return (Array.isArray(data) ? data : [])
    .filter((s): s is typeof s & { id: string } => Boolean(s?.id))
    .map((s) => ({
      id: s.id,
      content: s.content ? stripHtml(s.content) : undefined,
      url: s.url,
      createdAt: s.created_at,
      repliesCount: s.replies_count ?? 0,
      reblogsCount: s.reblogs_count ?? 0,
      favouritesCount: s.favourites_count ?? 0,
      visibility: s.visibility,
    }));
}

export function insightsFromMastodonStatuses(
  statuses: MastodonStatusItem[],
): MastodonInsightPoint[] {
  const replies = statuses.reduce((s, p) => s + (p.repliesCount ?? 0), 0);
  const reblogs = statuses.reduce((s, p) => s + (p.reblogsCount ?? 0), 0);
  const favourites = statuses.reduce(
    (s, p) => s + (p.favouritesCount ?? 0),
    0,
  );
  const denom = favourites + reblogs + replies;
  const eng = denom > 0 ? (replies + reblogs) / Math.max(denom, 1) : 0;
  return [
    { metricKey: "replies", value: replies },
    { metricKey: "reblogs", value: reblogs },
    { metricKey: "favourites", value: favourites },
    { metricKey: "posts_7d", value: statuses.length },
    {
      metricKey: "engagement_rate",
      value: Number(Math.min(1, eng).toFixed(4)),
    },
    { metricKey: "followers_delta_7d", value: 0 },
  ];
}
