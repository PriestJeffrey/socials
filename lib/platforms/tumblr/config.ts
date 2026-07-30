export type TumblrConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  useFixtures: boolean;
  configured: boolean;
};

export function getTumblrConfig(): TumblrConfig {
  const clientId = process.env.TUMBLR_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.TUMBLR_CLIENT_SECRET?.trim() ?? "";
  const redirectUri =
    process.env.TUMBLR_REDIRECT_URI?.trim() ||
    `${process.env.APP_URL ?? "http://localhost:3000"}/api/oauth/tumblr/callback`;
  const useFixtures = process.env.TUMBLR_USE_FIXTURES === "true";
  return {
    clientId,
    clientSecret,
    redirectUri,
    useFixtures,
    configured: Boolean(clientId && clientSecret) || useFixtures,
  };
}

/** Read-only V1 — write deferred with publish. */
export const TUMBLR_OAUTH_SCOPES = "basic offline_access";
