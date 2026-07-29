import type { PlatformAdapter } from "@/lib/platforms/types";

const notReady = (method: string): never => {
  throw new Error(`Instagram adapter not implemented yet (${method}). Phase 1.`);
};

/** Phase 0 scaffold — registered so Phase 1 fills methods, not invents the module. */
export const instagramAdapter: PlatformAdapter = {
  id: "instagram",
  capabilities: {
    oauth: true,
    readMetrics: true,
    readPosts: true,
    publish: false,
    schedule: false,
    comments: false,
  },
  beginOAuth: async () => notReady("beginOAuth"),
  handleOAuthCallback: async () => notReady("handleOAuthCallback"),
  refreshToken: async () => notReady("refreshToken"),
  disconnect: async () => notReady("disconnect"),
  fetchPosts: async () => notReady("fetchPosts"),
  fetchMetrics: async () => notReady("fetchMetrics"),
  publish: async () => notReady("publish"),
};
