import {
  getPinterestConfig,
  PINTEREST_OAUTH_SCOPES,
} from "@/lib/platforms/pinterest/config";

export type PinterestPinItem = {
  id: string;
  title?: string;
  description?: string;
  link?: string;
  createdAt?: string;
  pin_metrics?: {
    lifetime_metrics?: {
      impression?: number;
      save?: number;
      pin_click?: number;
      outbound_click?: number;
    };
  };
};

export type PinterestInsightPoint = {
  metricKey: string;
  value: number;
};

export function fixturePinterestSyncPayload(userId: string) {
  const externalAccountId = `pin_fix_${userId.slice(0, 8)}`;
  return {
    accessToken: `fixture_pin_token_${userId}`,
    refreshToken: `fixture_pin_refresh_${userId}`,
    externalAccountId,
    displayName: "Fixture Pinterest",
    pins: [
      {
        id: `pin_${userId.slice(0, 6)}_1`,
        title: "Fixture: save-worthy hook",
        description: "Fixture Pinterest: strong vertical + clear CTA.",
        link: "https://example.local/pinterest/1",
        createdAt: new Date().toISOString(),
        pin_metrics: {
          lifetime_metrics: {
            impression: 9200,
            save: 410,
            pin_click: 180,
            outbound_click: 64,
          },
        },
      },
      {
        id: `pin_${userId.slice(0, 6)}_2`,
        title: "Fixture: board idea",
        description: "Fixture Pinterest: saves beat vanity impressions.",
        link: "https://example.local/pinterest/2",
        createdAt: new Date(Date.now() - 86_400_000).toISOString(),
        pin_metrics: {
          lifetime_metrics: {
            impression: 5400,
            save: 190,
            pin_click: 95,
            outbound_click: 28,
          },
        },
      },
    ] satisfies PinterestPinItem[],
    insights: [
      { metricKey: "impressions", value: 14600 },
      { metricKey: "saves", value: 600 },
      { metricKey: "pin_clicks", value: 275 },
      { metricKey: "outbound_clicks", value: 92 },
      { metricKey: "save_rate", value: 0.041 },
      { metricKey: "engagement_rate", value: 0.066 },
      { metricKey: "followers_delta_7d", value: 22 },
    ] satisfies PinterestInsightPoint[],
  };
}

export function buildPinterestOAuthAuthorizeUrl(state: string): string {
  const cfg = getPinterestConfig();
  if (cfg.useFixtures) {
    const u = new URL(cfg.redirectUri);
    u.searchParams.set("code", "fixture_pinterest_code");
    u.searchParams.set("state", state);
    return u.toString();
  }
  const u = new URL("https://www.pinterest.com/oauth/");
  u.searchParams.set("client_id", cfg.appId);
  u.searchParams.set("redirect_uri", cfg.redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", PINTEREST_OAUTH_SCOPES);
  u.searchParams.set("state", state);
  return u.toString();
}

export async function exchangePinterestCode(code: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}> {
  const cfg = getPinterestConfig();
  const basic = Buffer.from(`${cfg.appId}:${cfg.appSecret}`).toString("base64");
  const res = await fetch("https://api.pinterest.com/v5/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: cfg.redirectUri,
    }),
  });
  if (!res.ok) throw new Error(`Pinterest token exchange failed (${res.status})`);
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    message?: string;
  };
  if (!data.access_token) {
    throw new Error(data.message || "Pinterest token response incomplete");
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export async function refreshPinterestToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}> {
  const cfg = getPinterestConfig();
  const basic = Buffer.from(`${cfg.appId}:${cfg.appSecret}`).toString("base64");
  const res = await fetch("https://api.pinterest.com/v5/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`Pinterest token refresh failed (${res.status})`);
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!data.access_token) throw new Error("Pinterest refresh incomplete");
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export async function fetchPinterestUser(accessToken: string): Promise<{
  id: string;
  username: string;
}> {
  const res = await fetch("https://api.pinterest.com/v5/user_account", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Pinterest user_account failed (${res.status})`);
  const data = (await res.json()) as {
    id?: string;
    username?: string;
  };
  if (!data.id) throw new Error("Pinterest user response incomplete");
  return { id: data.id, username: data.username ?? "Pinterest" };
}

export async function fetchPinterestPins(
  accessToken: string,
): Promise<PinterestPinItem[]> {
  const url = new URL("https://api.pinterest.com/v5/pins");
  url.searchParams.set("page_size", "25");
  url.searchParams.set("pin_metrics", "true");
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Pinterest pins.list failed (${res.status})`);
  const data = (await res.json()) as {
    items?: Array<{
      id: string;
      title?: string;
      description?: string;
      link?: string;
      created_at?: string;
      pin_metrics?: PinterestPinItem["pin_metrics"];
    }>;
  };
  return (data.items ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    link: item.link,
    createdAt: item.created_at,
    pin_metrics: item.pin_metrics,
  }));
}

export function insightsFromPins(pins: PinterestPinItem[]): PinterestInsightPoint[] {
  let impressions = 0;
  let saves = 0;
  let pinClicks = 0;
  let outbound = 0;
  for (const pin of pins) {
    const m = pin.pin_metrics?.lifetime_metrics;
    impressions += m?.impression ?? 0;
    saves += m?.save ?? 0;
    pinClicks += m?.pin_click ?? 0;
    outbound += m?.outbound_click ?? 0;
  }
  const saveRate = impressions > 0 ? saves / impressions : 0;
  const eng =
    impressions > 0 ? (saves + pinClicks + outbound) / impressions : 0;
  return [
    { metricKey: "impressions", value: impressions },
    { metricKey: "saves", value: saves },
    { metricKey: "pin_clicks", value: pinClicks },
    { metricKey: "outbound_clicks", value: outbound },
    { metricKey: "save_rate", value: Number(saveRate.toFixed(4)) },
    { metricKey: "engagement_rate", value: Number(eng.toFixed(4)) },
    { metricKey: "followers_delta_7d", value: 0 },
  ];
}
