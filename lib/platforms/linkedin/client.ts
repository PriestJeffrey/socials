import { getLinkedInConfig, LINKEDIN_OAUTH_SCOPES } from "./config";

export type LiPostItem = {
  id: string;
  commentary?: string;
  publishedAt?: string;
};

export type LiInsightPoint = {
  metricKey: string;
  value: number;
  windowStart?: string;
  windowEnd?: string;
};

export type LiSyncPayload = {
  externalAccountId: string;
  displayName: string;
  accessToken: string;
  posts: LiPostItem[];
  insights: LiInsightPoint[];
};

export function fixtureLiSyncPayload(userId: string): LiSyncPayload {
  const day = new Date().toISOString().slice(0, 10);
  return {
    externalAccountId: `fixture_li_${userId.slice(0, 8)}`,
    displayName: "Fixture LinkedIn",
    accessToken: "fixture-li-token-not-real",
    posts: [
      {
        id: "li_doc_1",
        commentary: "Carousel/doc that holds dwell",
        publishedAt: new Date().toISOString(),
      },
      {
        id: "li_text_1",
        commentary: "Text post with soft first-hour velocity",
        publishedAt: new Date().toISOString(),
      },
    ],
    insights: [
      {
        metricKey: "dwell_proxy",
        value: 0.62,
        windowStart: `${day}T00:00:00.000Z`,
        windowEnd: `${day}T23:59:59.000Z`,
      },
      {
        metricKey: "comment_quality",
        value: 0.71,
        windowStart: `${day}T00:00:00.000Z`,
        windowEnd: `${day}T23:59:59.000Z`,
      },
      {
        metricKey: "first_hour_velocity",
        value: 0.018,
        windowStart: `${day}T00:00:00.000Z`,
        windowEnd: `${day}T23:59:59.000Z`,
      },
      {
        metricKey: "impressions",
        value: 2400,
        windowStart: `${day}T00:00:00.000Z`,
        windowEnd: `${day}T23:59:59.000Z`,
      },
      {
        metricKey: "reach",
        value: 480,
        windowStart: `${day}T00:00:00.000Z`,
        windowEnd: `${day}T23:59:59.000Z`,
      },
      {
        metricKey: "posts_7d",
        value: 9,
        windowStart: `${day}T00:00:00.000Z`,
        windowEnd: `${day}T23:59:59.000Z`,
      },
      {
        metricKey: "engagement_rate",
        value: 0.015,
        windowStart: `${day}T00:00:00.000Z`,
        windowEnd: `${day}T23:59:59.000Z`,
      },
      {
        metricKey: "engagement_rate_prior",
        value: 0.04,
        windowStart: `${day}T00:00:00.000Z`,
        windowEnd: `${day}T23:59:59.000Z`,
      },
    ],
  };
}

export async function exchangeLinkedInCode(code: string): Promise<{
  accessToken: string;
  expiresIn?: number;
}> {
  const cfg = getLinkedInConfig();
  if (cfg.useFixtures) {
    return { accessToken: "fixture-li-access", expiresIn: 60 * 60 * 24 * 60 };
  }
  if (!cfg.clientId || !cfg.clientSecret) {
    throw new Error("LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET not configured");
  }
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: cfg.redirectUri,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
  });
  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error_description?: string;
  };
  if (!json.access_token) {
    throw new Error(json.error_description ?? "LinkedIn token exchange failed");
  }
  return { accessToken: json.access_token, expiresIn: json.expires_in };
}

export async function fetchLinkedInProfile(accessToken: string): Promise<{
  externalAccountId: string;
  displayName: string;
}> {
  const cfg = getLinkedInConfig();
  if (cfg.useFixtures) {
    return { externalAccountId: "fixture_li_member", displayName: "Fixture LinkedIn" };
  }
  const res = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = (await res.json()) as {
    sub?: string;
    name?: string;
    error_description?: string;
  };
  if (!json.sub) {
    throw new Error(json.error_description ?? "LinkedIn profile fetch failed");
  }
  return { externalAccountId: json.sub, displayName: json.name ?? json.sub };
}

export function allowlistPostRaw(item: {
  id: string;
  commentary?: string;
  publishedAt?: string;
}): object {
  return {
    id: item.id,
    commentary: item.commentary?.slice(0, 2000) ?? null,
    publishedAt: item.publishedAt ?? null,
  };
}

export function buildLinkedInOAuthAuthorizeUrl(state: string): string {
  const cfg = getLinkedInConfig();
  if (cfg.useFixtures) {
    const u = new URL(
      `${process.env.APP_URL ?? "http://localhost:3000"}/api/oauth/linkedin/callback`,
    );
    u.searchParams.set("code", "fixture_code");
    u.searchParams.set("state", state);
    return u.toString();
  }
  if (!cfg.clientId) throw new Error("LINKEDIN_CLIENT_ID not configured");
  const url = new URL("https://www.linkedin.com/oauth/v2/authorization");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", cfg.clientId);
  url.searchParams.set("redirect_uri", cfg.redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", LINKEDIN_OAUTH_SCOPES);
  return url.toString();
}
