import type { PlatformAdapter, PlatformId } from "./types";
import { instagramAdapter } from "./instagram/adapter";

export type { PlatformAdapter, PlatformId } from "./types";
export { createOAuthState, verifyOAuthState } from "./oauth-state";

/** Registered adapters. Phase 0: Instagram stub only (methods throw until Phase 1). */
export const adapters: PlatformAdapter[] = [instagramAdapter];

export function getAdapter(id: PlatformId): PlatformAdapter | undefined {
  return adapters.find((a) => a.id === id);
}

export function listAdapters(): PlatformAdapter[] {
  return [...adapters];
}
