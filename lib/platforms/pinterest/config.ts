export type PinterestConfig = {
  appId: string;
  appSecret: string;
  redirectUri: string;
  useFixtures: boolean;
  configured: boolean;
};

export function getPinterestConfig(): PinterestConfig {
  const appId = process.env.PINTEREST_APP_ID?.trim() ?? "";
  const appSecret = process.env.PINTEREST_APP_SECRET?.trim() ?? "";
  const redirectUri =
    process.env.PINTEREST_REDIRECT_URI?.trim() ||
    `${process.env.APP_URL ?? "http://localhost:3000"}/api/oauth/pinterest/callback`;
  const useFixtures = process.env.PINTEREST_USE_FIXTURES === "true";
  return {
    appId,
    appSecret,
    redirectUri,
    useFixtures,
    configured: Boolean(appId && appSecret) || useFixtures,
  };
}

/** V1 read scopes — no write/publish. */
export const PINTEREST_OAUTH_SCOPES = ["boards:read", "pins:read"].join(",");
