export type RedditConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  userAgent: string;
  useFixtures: boolean;
  configured: boolean;
};

export function getRedditConfig(): RedditConfig {
  const clientId = process.env.REDDIT_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.REDDIT_CLIENT_SECRET?.trim() ?? "";
  const redirectUri =
    process.env.REDDIT_REDIRECT_URI?.trim() ||
    `${process.env.APP_URL ?? "http://localhost:3000"}/api/oauth/reddit/callback`;
  const userAgent =
    process.env.REDDIT_USER_AGENT?.trim() ||
    "pulseboard:v1 (by /u/pulseboard_local)";
  const useFixtures = process.env.REDDIT_USE_FIXTURES === "true";
  return {
    clientId,
    clientSecret,
    redirectUri,
    userAgent,
    useFixtures,
    configured: Boolean(clientId && clientSecret) || useFixtures,
  };
}

export const REDDIT_OAUTH_SCOPES = ["identity", "read", "history"].join(" ");
