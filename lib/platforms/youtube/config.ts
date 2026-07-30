export type YouTubeConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  useFixtures: boolean;
  configured: boolean;
};

export function getYouTubeConfig(): YouTubeConfig {
  const clientId = process.env.YOUTUBE_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET?.trim() ?? "";
  const redirectUri =
    process.env.YOUTUBE_REDIRECT_URI?.trim() ||
    `${process.env.APP_URL ?? "http://localhost:3000"}/api/oauth/youtube/callback`;
  const useFixtures = process.env.YOUTUBE_USE_FIXTURES === "true";
  return {
    clientId,
    clientSecret,
    redirectUri,
    useFixtures,
    configured: Boolean(clientId && clientSecret) || useFixtures,
  };
}

export const YOUTUBE_OAUTH_SCOPES =
  "https://www.googleapis.com/auth/youtube.readonly";
