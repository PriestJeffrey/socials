export type VimeoConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  useFixtures: boolean;
  configured: boolean;
};

export function getVimeoConfig(): VimeoConfig {
  const clientId = process.env.VIMEO_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.VIMEO_CLIENT_SECRET?.trim() ?? "";
  const redirectUri =
    process.env.VIMEO_REDIRECT_URI?.trim() ||
    `${process.env.APP_URL ?? "http://localhost:3000"}/api/oauth/vimeo/callback`;
  const useFixtures = process.env.VIMEO_USE_FIXTURES === "true";
  return {
    clientId,
    clientSecret,
    redirectUri,
    useFixtures,
    configured: Boolean(clientId && clientSecret) || useFixtures,
  };
}

/** Read-only V1 — upload/edit deferred. */
export const VIMEO_OAUTH_SCOPES = "public private stats";
