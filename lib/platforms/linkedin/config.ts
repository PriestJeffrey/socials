export type LinkedInConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  useFixtures: boolean;
  configured: boolean;
};

export function getLinkedInConfig(): LinkedInConfig {
  const clientId = process.env.LINKEDIN_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET?.trim() ?? "";
  const redirectUri =
    process.env.LINKEDIN_REDIRECT_URI?.trim() ||
    `${process.env.APP_URL ?? "http://localhost:3000"}/api/oauth/linkedin/callback`;
  const useFixtures = process.env.LINKEDIN_USE_FIXTURES === "true";
  return {
    clientId,
    clientSecret,
    redirectUri,
    useFixtures,
    configured: Boolean(clientId && clientSecret) || useFixtures,
  };
}

/** Confirm at live connect — OpenID + member social read/write baseline. */
export const LINKEDIN_OAUTH_SCOPES = [
  "openid",
  "profile",
  "email",
  "w_member_social",
].join(" ");
