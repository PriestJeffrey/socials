export type MastodonConfig = {
  instanceUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  useFixtures: boolean;
  configured: boolean;
};

export function getMastodonConfig(): MastodonConfig {
  const rawInstance =
    process.env.MASTODON_INSTANCE_URL?.trim() || "https://mastodon.social";
  const instanceUrl = rawInstance.replace(/\/+$/, "");
  const clientId = process.env.MASTODON_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.MASTODON_CLIENT_SECRET?.trim() ?? "";
  const redirectUri =
    process.env.MASTODON_REDIRECT_URI?.trim() ||
    `${process.env.APP_URL ?? "http://localhost:3000"}/api/oauth/mastodon/callback`;
  const useFixtures = process.env.MASTODON_USE_FIXTURES === "true";
  return {
    instanceUrl,
    clientId,
    clientSecret,
    redirectUri,
    useFixtures,
    configured: Boolean(clientId && clientSecret) || useFixtures,
  };
}

/** Read-only V1 — write:statuses deferred with publish. */
export const MASTODON_OAUTH_SCOPES = "read:accounts read:statuses";
