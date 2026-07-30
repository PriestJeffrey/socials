import {
  getSlackConfig,
  SLACK_USER_SCOPES,
} from "@/lib/platforms/slack/config";

export type SlackMessageItem = {
  id: string;
  content?: string;
  channelId?: string;
  teamId?: string;
  url?: string;
  createdAt?: string;
  reactionCount?: number;
  replyCount?: number;
};

export type SlackInsightPoint = {
  metricKey: string;
  value: number;
};

export function fixtureSlackSyncPayload(userId: string) {
  const externalAccountId = `slack_${userId.slice(0, 8)}`;
  return {
    accessToken: `fixture_slack_token_${userId}`,
    refreshToken: `fixture_slack_refresh_${userId}`,
    externalAccountId,
    displayName: "fixture_pulseboard",
    messages: [
      {
        id: `msg_${userId.slice(0, 6)}1`,
        content:
          "Fixture Slack: replies in-thread beat emoji spam — ask one clear question.",
        channelId: "C_FIXTURE_1",
        teamId: "T_FIXTURE",
        url: "https://slack.com/archives/C_FIXTURE_1/p1",
        createdAt: new Date().toISOString(),
        reactionCount: 18,
        replyCount: 9,
      },
      {
        id: `msg_${userId.slice(0, 6)}2`,
        content:
          "Fixture Slack: lead with the useful takeaway in the first line.",
        channelId: "C_FIXTURE_1",
        teamId: "T_FIXTURE",
        url: "https://slack.com/archives/C_FIXTURE_1/p2",
        createdAt: new Date(Date.now() - 86_400_000).toISOString(),
        reactionCount: 7,
        replyCount: 3,
      },
    ] satisfies SlackMessageItem[],
    insights: [
      { metricKey: "reactions", value: 25 },
      { metricKey: "replies", value: 12 },
      { metricKey: "messages", value: 2 },
      { metricKey: "channels", value: 4 },
      { metricKey: "engagement_rate", value: 0.28 },
      { metricKey: "followers_delta_7d", value: 2 },
    ] satisfies SlackInsightPoint[],
  };
}

export function buildSlackOAuthAuthorizeUrl(state: string): string {
  const cfg = getSlackConfig();
  if (cfg.useFixtures) {
    const u = new URL(cfg.redirectUri);
    u.searchParams.set("code", "fixture_slack_code");
    u.searchParams.set("state", state);
    return u.toString();
  }
  const u = new URL("https://slack.com/oauth/v2/authorize");
  u.searchParams.set("client_id", cfg.clientId);
  u.searchParams.set("user_scope", SLACK_USER_SCOPES);
  u.searchParams.set("redirect_uri", cfg.redirectUri);
  u.searchParams.set("state", state);
  return u.toString();
}

export async function exchangeSlackCode(code: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  userId: string;
  teamId?: string;
  teamName?: string;
}> {
  const cfg = getSlackConfig();
  const res = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      code,
      redirect_uri: cfg.redirectUri,
    }),
  });
  if (!res.ok) throw new Error(`Slack token exchange failed (${res.status})`);
  const data = (await res.json()) as {
    ok?: boolean;
    error?: string;
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    authed_user?: {
      id?: string;
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    team?: { id?: string; name?: string };
  };
  if (!data.ok) {
    throw new Error(data.error || "Slack token response not ok");
  }
  const accessToken =
    data.authed_user?.access_token ?? data.access_token ?? "";
  const userId = data.authed_user?.id ?? "";
  if (!accessToken || !userId) {
    throw new Error(data.error || "Slack token response incomplete");
  }
  return {
    accessToken,
    refreshToken:
      data.authed_user?.refresh_token ?? data.refresh_token ?? undefined,
    expiresIn: data.authed_user?.expires_in ?? data.expires_in,
    userId,
    teamId: data.team?.id,
    teamName: data.team?.name,
  };
}

export async function refreshSlackToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}> {
  const cfg = getSlackConfig();
  const res = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`Slack token refresh failed (${res.status})`);
  const data = (await res.json()) as {
    ok?: boolean;
    error?: string;
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    authed_user?: {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
  };
  if (!data.ok) throw new Error(data.error || "Slack refresh not ok");
  const accessToken =
    data.authed_user?.access_token ?? data.access_token ?? "";
  if (!accessToken) throw new Error("Slack refresh incomplete");
  return {
    accessToken,
    refreshToken:
      data.authed_user?.refresh_token ?? data.refresh_token ?? undefined,
    expiresIn: data.authed_user?.expires_in ?? data.expires_in,
  };
}

export async function fetchSlackAuthTest(accessToken: string): Promise<{
  userId: string;
  user?: string;
  team?: string;
  teamId?: string;
}> {
  const res = await fetch("https://slack.com/api/auth.test", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  if (!res.ok) throw new Error(`Slack auth.test failed (${res.status})`);
  const data = (await res.json()) as {
    ok?: boolean;
    error?: string;
    user_id?: string;
    user?: string;
    team?: string;
    team_id?: string;
  };
  if (!data.ok || !data.user_id) {
    throw new Error(data.error || "Slack auth.test incomplete");
  }
  return {
    userId: data.user_id,
    user: data.user,
    team: data.team,
    teamId: data.team_id,
  };
}

export async function fetchSlackConversations(accessToken: string): Promise<
  Array<{ id: string; name: string }>
> {
  const u = new URL("https://slack.com/api/users.conversations");
  // public_channel only — channels:read; private needs groups:read (deferred)
  u.searchParams.set("types", "public_channel");
  u.searchParams.set("exclude_archived", "true");
  u.searchParams.set("limit", "100");
  const res = await fetch(u.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Slack users.conversations failed (${res.status})`);
  }
  const data = (await res.json()) as {
    ok?: boolean;
    error?: string;
    channels?: Array<{ id?: string; name?: string }>;
  };
  if (!data.ok) {
    throw new Error(data.error || "Slack users.conversations not ok");
  }
  return (data.channels ?? [])
    .filter((c): c is { id: string; name: string } => Boolean(c?.id && c?.name))
    .map((c) => ({ id: c.id, name: c.name }));
}

export function insightsFromSlackLive(channelCount: number): SlackInsightPoint[] {
  return [
    { metricKey: "channels", value: channelCount },
    { metricKey: "messages", value: 0 },
    { metricKey: "reactions", value: 0 },
    { metricKey: "replies", value: 0 },
    { metricKey: "engagement_rate", value: 0 },
    { metricKey: "followers_delta_7d", value: 0 },
  ];
}

export function insightsFromSlackMessages(
  messages: SlackMessageItem[],
  channelCount = 1,
): SlackInsightPoint[] {
  const reactions = messages.reduce((s, m) => s + (m.reactionCount ?? 0), 0);
  const replies = messages.reduce((s, m) => s + (m.replyCount ?? 0), 0);
  const denom = reactions + replies + messages.length;
  const eng = denom > 0 ? (replies + reactions) / Math.max(denom, 1) : 0;
  return [
    { metricKey: "reactions", value: reactions },
    { metricKey: "replies", value: replies },
    { metricKey: "messages", value: messages.length },
    { metricKey: "channels", value: channelCount },
    {
      metricKey: "engagement_rate",
      value: Number(Math.min(1, eng).toFixed(4)),
    },
    { metricKey: "followers_delta_7d", value: 0 },
  ];
}
