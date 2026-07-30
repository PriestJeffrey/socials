import type { PlatformAdapter, PlatformId } from "./types";
import { instagramAdapter } from "./instagram/adapter";
import { facebookAdapter } from "./facebook/adapter";

export type { PlatformAdapter, PlatformId } from "./types";
export { createOAuthState, verifyOAuthState } from "./oauth-state";

/** Registered adapters. Phase 2: Instagram + Facebook. */
export const adapters: PlatformAdapter[] = [instagramAdapter, facebookAdapter];

export function getAdapter(id: PlatformId): PlatformAdapter | undefined {
  return adapters.find((a) => a.id === id);
}

export function listAdapters(): PlatformAdapter[] {
  return [...adapters];
}
