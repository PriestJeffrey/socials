export type BlueskyConfig = {
  serviceUrl: string;
  useFixtures: boolean;
  /** Fixtures always “configured”; live needs service URL only until OAuth ships. */
  configured: boolean;
};

export function getBlueskyConfig(): BlueskyConfig {
  const serviceUrl =
    process.env.BLUESKY_SERVICE_URL?.trim() || "https://bsky.social";
  const useFixtures = process.env.BLUESKY_USE_FIXTURES === "true";
  return {
    serviceUrl: serviceUrl.replace(/\/$/, ""),
    useFixtures,
    configured: useFixtures || Boolean(process.env.BLUESKY_SERVICE_URL?.trim()),
  };
}
