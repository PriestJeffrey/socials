import {
  getDiscordConfig,
  DISCORD_OAUTH_SCOPES,
} from "@/lib/platforms/discord/config";

export type DiscordMessageItem = {
  id: string;
  content?: string;
  channelId?: string;
  guildId?: string;
  url?: string;
  createdAt?: string;
  reactionCount?: number;
  replyCount?: number;
};

export type DiscordInsightPoint = {
  metricKey: string;
  value: number;
};

export function fixtureDiscordSyncPayload(userId: string) {
  const externalAccountId = `discord_${userId.slice(0, 8)}`;
  return {
    accessToken: `fixture_discord_token_${userId}`,
    refreshToken: `fixture_discord_refresh_${userId}`,
    externalAccountId,
    displayName: "fixture_pulseboard",
    messages: [
      {
        id: `msg_${userId.slice(0, 6)}1`,
        content:
          "Fixture Discord: replies beat vanity reactions — ask one clear question.",
        channelId: "channel_fixture_1",
        guildId: "guild_fixture",
        url: "https://discord.com/channels/guild_fixture/channel_fixture_1/1",
        createdAt: new Date().toISOString(),
        reactionCount: 24,
        replyCount: 11,
      },
      {
        id: `msg_${userId.slice(0, 6)}2`,
        content:
          "Fixture Discord: lead with the useful takeaway in the first line.",
        channelId: "channel_fixture_1",
        guildId: "guild_fixture",
        url: "https://discord.com/channels/guild_fixture/channel_fixture_1/2",
        createdAt: new Date(Date.now() - 86_400_000).toISOString(),
        reactionCount: 9,
        replyCount: 4,
      },
    ] satisfies DiscordMessageItem[],
    insights: [
      { metricKey: "reactions", value: 33 },
      { metricKey: "replies", value: 15 },
      { metricKey: "messages", value: 2 },
      { metricKey: "guilds", value: 3 },
      { metricKey: "engagement_rate", value: 0.31 },
      { metricKey: "followers_delta_7d", value: 4 },
    ] satisfies DiscordInsightPoint[],
  };
}

export function buildDiscordOAuthAuthorizeUrl(state: string): string {
  const cfg = getDiscordConfig();
  if (cfg.useFixtures) {
    const u = new URL(cfg.redirectUri);
    u.searchParams.set("code", "fixture_discord_code");
    u.searchParams.set("state", state);
    return u.toString();
  }
  const u = new URL("https://discord.com/api/oauth2/authorize");
  u.searchParams.set("client_id", cfg.clientId);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("redirect_uri", cfg.redirectUri);
  u.searchParams.set("scope", DISCORD_OAUTH_SCOPES);
  u.searchParams.set("state", state);
  u.searchParams.set("prompt", "consent");
  return u.toString();
}

export async function exchangeDiscordCode(code: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}> {
  const cfg = getDiscordConfig();
  const res = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: cfg.redirectUri,
    }),
  });
  if (!res.ok) throw new Error(`Discord token exchange failed (${res.status})`);
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
  };
  if (!data.access_token) {
    throw new Error(data.error || "Discord token response incomplete");
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export async function refreshDiscordToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}> {
  const cfg = getDiscordConfig();
  const res = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`Discord token refresh failed (${res.status})`);
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!data.access_token) throw new Error("Discord refresh incomplete");
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export async function fetchDiscordMe(accessToken: string): Promise<{
  id: string;
  username: string;
  globalName?: string;
}> {
  const res = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Discord @me failed (${res.status})`);
  const data = (await res.json()) as {
    id?: string;
    username?: string;
    global_name?: string | null;
  };
  if (!data.id || !data.username) throw new Error("Discord @me incomplete");
  return {
    id: data.id,
    username: data.username,
    globalName: data.global_name ?? undefined,
  };
}

export async function fetchDiscordGuilds(accessToken: string): Promise<
  Array<{ id: string; name: string }>
> {
  const res = await fetch("https://discord.com/api/users/@me/guilds", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Discord guilds failed (${res.status})`);
  const data = (await res.json()) as Array<{ id?: string; name?: string }>;
  return (Array.isArray(data) ? data : [])
    .filter((g): g is { id: string; name: string } => Boolean(g?.id && g?.name))
    .map((g) => ({ id: g.id, name: g.name }));
}

export function insightsFromDiscordLive(guildCount: number): DiscordInsightPoint[] {
  return [
    { metricKey: "guilds", value: guildCount },
    { metricKey: "messages", value: 0 },
    { metricKey: "reactions", value: 0 },
    { metricKey: "replies", value: 0 },
    { metricKey: "engagement_rate", value: 0 },
    { metricKey: "followers_delta_7d", value: 0 },
  ];
}

export function insightsFromDiscordMessages(
  messages: DiscordMessageItem[],
  guildCount = 1,
): DiscordInsightPoint[] {
  const reactions = messages.reduce((s, m) => s + (m.reactionCount ?? 0), 0);
  const replies = messages.reduce((s, m) => s + (m.replyCount ?? 0), 0);
  const denom = reactions + replies + messages.length;
  const eng = denom > 0 ? (replies + reactions) / Math.max(denom, 1) : 0;
  return [
    { metricKey: "reactions", value: reactions },
    { metricKey: "replies", value: replies },
    { metricKey: "messages", value: messages.length },
    { metricKey: "guilds", value: guildCount },
    {
      metricKey: "engagement_rate",
      value: Number(Math.min(1, eng).toFixed(4)),
    },
    { metricKey: "followers_delta_7d", value: 0 },
  ];
}
