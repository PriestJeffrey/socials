export type PlatformId =
  | "instagram"
  | "facebook"
  | "linkedin"
  | "threads"
  | "tiktok"
  | "youtube"
  | "x";

export interface PlatformCapabilities {
  oauth: boolean;
  readMetrics: boolean;
  readPosts: boolean;
  publish: boolean;
  schedule: boolean;
  comments: boolean;
  /** Phase 4: compose locally and copy — no network publish */
  manualCopy: boolean;
}

export interface PlatformAdapter {
  id: PlatformId;
  capabilities: PlatformCapabilities;
  beginOAuth(userId: string): Promise<string>;
  handleOAuthCallback(
    userId: string,
    query: Record<string, string>,
  ): Promise<{ connectionId: string }>;
  refreshToken(userId: string, connectionId: string): Promise<void>;
  disconnect(userId: string, connectionId: string): Promise<void>;
  fetchPosts(
    userId: string,
    connectionId: string,
    cursor?: string,
  ): Promise<unknown>;
  fetchMetrics(
    userId: string,
    connectionId: string,
    range: { from: Date; to: Date },
  ): Promise<unknown>;
  publish(connectionId: string, payload: unknown): Promise<unknown>;
}
