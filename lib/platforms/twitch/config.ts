export type TwitchConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  useFixtures: boolean;
  configured: boolean;
};

export function getTwitchConfig(): TwitchConfig {
  const clientId = process.env.TWITCH_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.TWITCH_CLIENT_SECRET?.trim() ?? "";
  const redirectUri =
    process.env.TWITCH_REDIRECT_URI?.trim() ||
    `${process.env.APP_URL ?? "http://localhost:3000"}/api/oauth/twitch/callback`;
  const useFixtures = process.env.TWITCH_USE_FIXTURES === "true";
  return {
    clientId,
    clientSecret,
    redirectUri,
    useFixtures,
    configured: Boolean(clientId && clientSecret) || useFixtures,
  };
}

/** Read-only V1 — broadcast/create deferred. */
export const TWITCH_OAUTH_SCOPES = "user:read:email";
