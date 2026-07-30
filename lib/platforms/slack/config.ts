export type SlackConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  useFixtures: boolean;
  configured: boolean;
};

export function getSlackConfig(): SlackConfig {
  const clientId = process.env.SLACK_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.SLACK_CLIENT_SECRET?.trim() ?? "";
  const redirectUri =
    process.env.SLACK_REDIRECT_URI?.trim() ||
    `${process.env.APP_URL ?? "http://localhost:3000"}/api/oauth/slack/callback`;
  const useFixtures = process.env.SLACK_USE_FIXTURES === "true";
  return {
    clientId,
    clientSecret,
    redirectUri,
    useFixtures,
    configured: Boolean(clientId && clientSecret) || useFixtures,
  };
}

/** Read-only V1 — conversations.history + chat.postMessage deferred. */
export const SLACK_USER_SCOPES = "users:read,channels:read";
