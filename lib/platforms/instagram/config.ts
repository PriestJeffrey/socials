export type MetaConfig = {
  appId: string;
  appSecret: string;
  redirectUri: string;
  graphVersion: string;
  useFixtures: boolean;
  configured: boolean;
};

export function getMetaConfig(): MetaConfig {
  const appId = process.env.META_APP_ID?.trim() ?? "";
  const appSecret = process.env.META_APP_SECRET?.trim() ?? "";
  const redirectUri =
    process.env.META_REDIRECT_URI?.trim() ||
    `${process.env.APP_URL ?? "http://localhost:3000"}/api/oauth/instagram/callback`;
  const graphVersion = process.env.META_GRAPH_VERSION?.trim() || "v21.0";
  const useFixtures = process.env.META_USE_FIXTURES === "true";
  return {
    appId,
    appSecret,
    redirectUri,
    graphVersion,
    useFixtures,
    configured: Boolean(appId && appSecret) || useFixtures,
  };
}

export const IG_OAUTH_SCOPES = [
  "instagram_basic",
  "instagram_manage_insights",
  "pages_show_list",
  "pages_read_engagement",
  "business_management",
].join(",");
