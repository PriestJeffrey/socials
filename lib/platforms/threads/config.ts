export type ThreadsConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  useFixtures: boolean;
  configured: boolean;
  graphVersion: string;
};

export function getThreadsConfig(): ThreadsConfig {
  const clientId =
    process.env.THREADS_APP_ID?.trim() ||
    process.env.META_APP_ID?.trim() ||
    "";
  const clientSecret =
    process.env.THREADS_APP_SECRET?.trim() ||
    process.env.META_APP_SECRET?.trim() ||
    "";
  const redirectUri =
    process.env.THREADS_REDIRECT_URI?.trim() ||
    `${process.env.APP_URL ?? "http://localhost:3000"}/api/oauth/threads/callback`;
  const useFixtures = process.env.THREADS_USE_FIXTURES === "true";
  const graphVersion = process.env.THREADS_GRAPH_VERSION?.trim() || "v1.0";
  return {
    clientId,
    clientSecret,
    redirectUri,
    useFixtures,
    configured: Boolean(clientId && clientSecret) || useFixtures,
    graphVersion,
  };
}

export const THREADS_OAUTH_SCOPES = [
  "threads_basic",
  "threads_manage_insights",
  "threads_content_publish",
].join(",");
