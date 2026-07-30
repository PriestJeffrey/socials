import type { PlatformAdapter, PlatformId } from "./types";
import { instagramAdapter } from "./instagram/adapter";
import { facebookAdapter } from "./facebook/adapter";
import { linkedinAdapter } from "./linkedin/adapter";
import { threadsAdapter } from "./threads/adapter";
import { tiktokAdapter } from "./tiktok/adapter";
import { youtubeAdapter } from "./youtube/adapter";
import { pinterestAdapter } from "./pinterest/adapter";
import { blueskyAdapter } from "./bluesky/adapter";
import { redditAdapter } from "./reddit/adapter";
import { mastodonAdapter } from "./mastodon/adapter";
import { tumblrAdapter } from "./tumblr/adapter";
import { xAdapter } from "./x/adapter";

export type { PlatformAdapter, PlatformId, PlatformCapabilities } from "./types";
export { createOAuthState, verifyOAuthState } from "./oauth-state";

/** Registered adapters. Phase 17: + Tumblr. */
export const adapters: PlatformAdapter[] = [
  instagramAdapter,
  facebookAdapter,
  linkedinAdapter,
  threadsAdapter,
  tiktokAdapter,
  youtubeAdapter,
  pinterestAdapter,
  blueskyAdapter,
  redditAdapter,
  mastodonAdapter,
  tumblrAdapter,
  xAdapter,
];

export function getAdapter(id: PlatformId): PlatformAdapter | undefined {
  return adapters.find((a) => a.id === id);
}

export function listAdapters(): PlatformAdapter[] {
  return [...adapters];
}

export function oauthPlatforms(): PlatformAdapter[] {
  return adapters.filter((a) => a.capabilities.oauth);
}
