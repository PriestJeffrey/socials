import type { PlatformAdapter } from "@/lib/platforms/types";

/**
 * X (Twitter) — honest Phase 4 stub.
 * No OAuth, no tokens, no auto-publish. Compose + copy only in the UI.
 */
export const xAdapter: PlatformAdapter = {
  id: "x",
  capabilities: {
    oauth: false,
    readMetrics: false,
    readPosts: false,
    publish: false,
    schedule: false,
    comments: false,
    manualCopy: true,
  },

  async beginOAuth(): Promise<string> {
    throw new Error("X has no OAuth in Pulseboard — use compose + copy on /x");
  },

  async handleOAuthCallback(): Promise<{ connectionId: string }> {
    throw new Error("X has no OAuth callback");
  },

  async refreshToken(): Promise<void> {
    throw new Error("X has no tokens");
  },

  async disconnect(): Promise<void> {
    throw new Error("X has no connection to disconnect");
  },

  async fetchPosts(): Promise<unknown> {
    throw new Error("X API not connected — metrics/posts unavailable");
  },

  async fetchMetrics(): Promise<unknown> {
    throw new Error("X API not connected — metrics unavailable");
  },

  async publish(): Promise<unknown> {
    throw new Error("X auto-publish is not available — copy your draft from /x");
  },
};
