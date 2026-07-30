import { prisma } from "@/lib/db/prisma";
import { encryptAesGcm, decryptAesGcm } from "@/lib/crypto/aes";
import { createOAuthState, verifyOAuthState } from "@/lib/platforms/oauth-state";
import { writeAudit } from "@/lib/audit/log";
import { jobQueue } from "@/lib/jobs";
import { clock } from "@/lib/clock";
import type { PlatformAdapter } from "@/lib/platforms/types";
import { getBlueskyConfig } from "./config";
import {
  buildBlueskyOAuthAuthorizeUrl,
  fetchBlueskyAuthorFeed,
  fixtureBlueskySyncPayload,
  insightsFromBlueskyPosts,
} from "./client";

function requireBlueskyReady(): void {
  const cfg = getBlueskyConfig();
  if (!cfg.configured && !cfg.useFixtures) {
    throw new Error(
      "Bluesky not configured. Set BLUESKY_USE_FIXTURES=true (live OAuth deferred)",
    );
  }
}

export const blueskyAdapter: PlatformAdapter = {
  id: "bluesky",
  capabilities: {
    oauth: true,
    readMetrics: true,
    readPosts: true,
    publish: false,
    schedule: false,
    comments: false,
    manualCopy: false,
  },

  async beginOAuth(userId: string): Promise<string> {
    requireBlueskyReady();
    const { state } = createOAuthState(userId);
    return buildBlueskyOAuthAuthorizeUrl(state);
  },

  async handleOAuthCallback(
    userId: string,
    query: Record<string, string>,
  ): Promise<{ connectionId: string }> {
    requireBlueskyReady();
    const state = query.state ?? "";
    const code = query.code ?? "";
    const verified = verifyOAuthState(state);
    if (!verified || verified.userId !== userId) {
      throw new Error("Invalid OAuth state");
    }
    if (!code) throw new Error("Missing OAuth code");

    const cfg = getBlueskyConfig();
    if (!cfg.useFixtures) {
      throw new Error(
        "Live Bluesky ATProto OAuth (DPoP) is deferred — set BLUESKY_USE_FIXTURES=true",
      );
    }

    const fix = fixtureBlueskySyncPayload(userId);
    const connection = await prisma.socialConnection.upsert({
      where: {
        userId_platform_externalAccountId: {
          userId,
          platform: "bluesky",
          externalAccountId: fix.externalAccountId,
        },
      },
      create: {
        userId,
        platform: "bluesky",
        externalAccountId: fix.externalAccountId,
        displayName: fix.displayName,
        accessTokenEnc: encryptAesGcm(fix.accessToken),
        refreshTokenEnc: encryptAesGcm(fix.refreshToken),
        tokenExpiresAt: new Date(clock.now().getTime() + 60 * 60 * 24 * 30 * 1000),
        scopes: "fixture",
        status: "connected",
      },
      update: {
        displayName: fix.displayName,
        accessTokenEnc: encryptAesGcm(fix.accessToken),
        refreshTokenEnc: encryptAesGcm(fix.refreshToken),
        status: "connected",
        lastSyncError: null,
      },
    });

    await writeAudit({
      userId,
      action: "platform.bluesky.connected",
      metadata: { connectionId: connection.id },
    });

    await jobQueue.enqueue({
      userId,
      type: "sync",
      payload: { platform: "bluesky", connectionId: connection.id },
      idempotencyKey: `sync:bluesky:${connection.id}:${clock.now().toISOString().slice(0, 13)}`,
    });

    return { connectionId: connection.id };
  },

  async refreshToken(): Promise<void> {
    throw new Error(
      "Bluesky token refresh awaits live ATProto OAuth — reconnect via fixtures for now",
    );
  },

  async disconnect(userId: string, connectionId: string): Promise<void> {
    const conn = await prisma.socialConnection.findFirst({
      where: { id: connectionId, userId, platform: "bluesky" },
    });
    if (!conn) return;

    await prisma.$transaction([
      prisma.post.deleteMany({ where: { connectionId } }),
      prisma.metricSnapshot.deleteMany({ where: { connectionId } }),
      prisma.socialConnection.update({
        where: { id: connectionId },
        data: {
          status: "disconnected",
          accessTokenEnc: null,
          refreshTokenEnc: null,
          lastSyncError: null,
          lastSyncAt: null,
        },
      }),
    ]);

    const { cacheStore } = await import("@/lib/cache");
    await cacheStore.delByPrefix(`overview:v1:${userId}`);
    await cacheStore.delByPrefix(`analytics:v1:${userId}:`);

    await writeAudit({
      userId,
      action: "platform.bluesky.disconnected",
      metadata: { connectionId },
    });
  },

  async fetchPosts(userId: string, connectionId: string): Promise<unknown> {
    const conn = await prisma.socialConnection.findFirst({
      where: {
        id: connectionId,
        userId,
        platform: "bluesky",
        status: "connected",
      },
    });
    if (!conn?.accessTokenEnc) throw new Error("Not connected");
    const cfg = getBlueskyConfig();
    if (cfg.useFixtures) return fixtureBlueskySyncPayload(userId).posts;
    return fetchBlueskyAuthorFeed({
      accessToken: decryptAesGcm(conn.accessTokenEnc),
      actor: conn.externalAccountId,
    });
  },

  async fetchMetrics(
    userId: string,
    connectionId: string,
    _range: { from: Date; to: Date },
  ): Promise<unknown> {
    const conn = await prisma.socialConnection.findFirst({
      where: {
        id: connectionId,
        userId,
        platform: "bluesky",
        status: "connected",
      },
    });
    if (!conn?.accessTokenEnc) throw new Error("Not connected");
    const cfg = getBlueskyConfig();
    if (cfg.useFixtures) return fixtureBlueskySyncPayload(userId).insights;
    const posts = await fetchBlueskyAuthorFeed({
      accessToken: decryptAesGcm(conn.accessTokenEnc),
      actor: conn.externalAccountId,
    });
    return insightsFromBlueskyPosts(posts);
  },

  async publish(): Promise<unknown> {
    throw new Error(
      "Bluesky createRecord publish is deferred — not in Phase 14 live path",
    );
  },
};
