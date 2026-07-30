export type DiscordConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  useFixtures: boolean;
  configured: boolean;
};

export function getDiscordConfig(): DiscordConfig {
  const clientId = process.env.DISCORD_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.DISCORD_CLIENT_SECRET?.trim() ?? "";
  const redirectUri =
    process.env.DISCORD_REDIRECT_URI?.trim() ||
    `${process.env.APP_URL ?? "http://localhost:3000"}/api/oauth/discord/callback`;
  const useFixtures = process.env.DISCORD_USE_FIXTURES === "true";
  return {
    clientId,
    clientSecret,
    redirectUri,
    useFixtures,
    configured: Boolean(clientId && clientSecret) || useFixtures,
  };
}

/** Read-only V1 — message create and channel history (bot) deferred. */
export const DISCORD_OAUTH_SCOPES = "identify guilds";
