export type PlatformId = "instagram" | "facebook" | "linkedin" | "x";

export interface PlatformAdapter {
  id: PlatformId;
  capabilities: {
    oauth: boolean;
    readMetrics: boolean;
    readPosts: boolean;
    publish: boolean;
    schedule: boolean;
    comments: boolean;
  };
  beginOAuth(userId: string): Promise<string>;
  handleOAuthCallback(
    userId: string,
    query: Record<string, string>,
  ): Promise<{ connectionId: string }>;
  refreshToken(connectionId: string): Promise<void>;
  disconnect(connectionId: string): Promise<void>;
  fetchPosts(connectionId: string, cursor?: string): Promise<unknown>;
  fetchMetrics(
    connectionId: string,
    range: { from: Date; to: Date },
  ): Promise<unknown>;
  publish(connectionId: string, payload: unknown): Promise<unknown>;
}

/** Prefer importing adapters from `@/lib/platforms` (index registers stubs). */
