import type { PlatformAdapter, PlatformId } from "./types";
import { instagramAdapter } from "./instagram/adapter";
import { facebookAdapter } from "./facebook/adapter";
import { linkedinAdapter } from "./linkedin/adapter";
import { threadsAdapter } from "./threads/adapter";
import { xAdapter } from "./x/adapter";

export type { PlatformAdapter, PlatformId, PlatformCapabilities } from "./types";
export { createOAuthState, verifyOAuthState } from "./oauth-state";

/** Registered adapters. Phase 9: + Threads. */
export const adapters: PlatformAdapter[] = [
  instagramAdapter,
  facebookAdapter,
  linkedinAdapter,
  threadsAdapter,
  xAdapter,
];

export function getAdapter(id: PlatformId): PlatformAdapter | undefined {
  return adapters.find((a) => a.id === id);
}

export function listAdapters(): PlatformAdapter[] {
  return [...adapters];
}

/** Platforms that support live OAuth connect in Settings. */
export function oauthPlatforms(): PlatformAdapter[] {
  return adapters.filter((a) => a.capabilities.oauth);
}
