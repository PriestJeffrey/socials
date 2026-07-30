export type TikTokConfig = {
  clientKey: string;
  clientSecret: string;
  redirectUri: string;
  useFixtures: boolean;
  configured: boolean;
};

export function getTikTokConfig(): TikTokConfig {
  const clientKey = process.env.TIKTOK_CLIENT_KEY?.trim() ?? "";
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET?.trim() ?? "";
  const redirectUri =
    process.env.TIKTOK_REDIRECT_URI?.trim() ||
    `${process.env.APP_URL ?? "http://localhost:3000"}/api/oauth/tiktok/callback`;
  const useFixtures = process.env.TIKTOK_USE_FIXTURES === "true";
  return {
    clientKey,
    clientSecret,
    redirectUri,
    useFixtures,
    configured: Boolean(clientKey && clientSecret) || useFixtures,
  };
}

/** Display / Login Kit scopes for V1 read path. */
export const TIKTOK_OAUTH_SCOPES = ["user.info.basic", "video.list"].join(",");
