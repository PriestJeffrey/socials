import { prisma } from "@/lib/db/prisma";
import { encryptAesGcm, decryptAesGcm } from "@/lib/crypto/aes";
import { createOAuthState, verifyOAuthState } from "@/lib/platforms/oauth-state";
import { writeAudit } from "@/lib/audit/log";
import { jobQueue } from "@/lib/jobs";
import { clock } from "@/lib/clock";
import type { PlatformAdapter } from "@/lib/platforms/types";
import { getMetaConfig } from "./config";
import {
  buildOAuthAuthorizeUrl,
  discoverIgAccount,
  exchangeCodeForToken,
  exchangeLongLivedToken,
  fetchIgInsights,
  fetchIgMedia,
  fixtureSyncPayload,
} from "./meta-client";

function requireMetaReady(): void {
  const cfg = getMetaConfig();
  if (!cfg.configured) {
    throw new Error(
      "Instagram not configured. Set META_APP_ID + META_APP_SECRET, or META_USE_FIXTURES=true",
    );
  }
}

export const instagramAdapter: PlatformAdapter = {
  id: "instagram",
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
    requireMetaReady();
    const { state } = createOAuthState(userId);
    return buildOAuthAuthorizeUrl(state);
  },

  async handleOAuthCallback(
    userId: string,
    query: Record<string, string>,
  ): Promise<{ connectionId: string }> {
    requireMetaReady();
    const state = query.state ?? "";
    const code = query.code ?? "";
    const verified = verifyOAuthState(state);
    if (!verified || verified.userId !== userId) {
      throw new Error("Invalid OAuth state");
    }
    if (!code) throw new Error("Missing OAuth code");

    const cfg = getMetaConfig();
    let accessToken: string;
    let expiresIn: number | undefined;
    let externalAccountId: string;
    let displayName: string;

    if (cfg.useFixtures) {
      const fix = fixtureSyncPayload(userId);
      accessToken = fix.accessToken;
      expiresIn = 60 * 60 * 24 * 60;
      externalAccountId = fix.externalAccountId;
      displayName = fix.displayName;
    } else {
      const short = await exchangeCodeForToken(code);
      const long = await exchangeLongLivedToken(short.accessToken);
      accessToken = long.accessToken;
      expiresIn = long.expiresIn;
      const ig = await discoverIgAccount(accessToken);
      accessToken = ig.pageAccessToken;
      externalAccountId = ig.externalAccountId;
      displayName = ig.displayName;
    }

    const tokenExpiresAt = expiresIn
      ? new Date(clock.now().getTime() + expiresIn * 1000)
      : null;

    const connection = await prisma.socialConnection.upsert({
      where: {
        userId_platform_externalAccountId: {
          userId,
          platform: "instagram",
          externalAccountId,
        },
      },
      create: {
        userId,
        platform: "instagram",
        externalAccountId,
        displayName,
        accessTokenEnc: encryptAesGcm(accessToken),
        tokenExpiresAt,
        scopes: "instagram",
        status: "connected",
      },
      update: {
        displayName,
        accessTokenEnc: encryptAesGcm(accessToken),
        tokenExpiresAt,
        status: "connected",
        lastSyncError: null,
      },
    });

    await writeAudit({
      userId,
      action: "platform.instagram.connected",
      metadata: { connectionId: connection.id, externalAccountId },
    });

    await jobQueue.enqueue({
      userId,
      type: "sync",
      payload: { platform: "instagram", connectionId: connection.id },
      idempotencyKey: `sync:instagram:${connection.id}:${clock.now().toISOString().slice(0, 13)}`,
    });

    return { connectionId: connection.id };
  },

  async refreshToken(userId: string, connectionId: string): Promise<void> {
    const conn = await prisma.socialConnection.findFirst({
      where: { id: connectionId, userId, platform: "instagram" },
    });
    if (!conn?.accessTokenEnc) throw new Error("Connection not found");
    const current = decryptAesGcm(conn.accessTokenEnc);
    const long = await exchangeLongLivedToken(current);
    await prisma.socialConnection.update({
      where: { id: connectionId },
      data: {
        accessTokenEnc: encryptAesGcm(long.accessToken),
        tokenExpiresAt: long.expiresIn
          ? new Date(clock.now().getTime() + long.expiresIn * 1000)
          : null,
      },
    });
  },

  async disconnect(userId: string, connectionId: string): Promise<void> {
    const conn = await prisma.socialConnection.findFirst({
      where: { id: connectionId, userId, platform: "instagram" },
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

    await writeAudit({
      userId,
      action: "platform.instagram.disconnected",
      metadata: { connectionId },
    });
  },

  async fetchPosts(userId: string, connectionId: string): Promise<unknown> {
    const conn = await prisma.socialConnection.findFirst({
      where: {
        id: connectionId,
        userId,
        platform: "instagram",
        status: "connected",
      },
    });
    if (!conn?.accessTokenEnc) throw new Error("Not connected");
    const token = decryptAesGcm(conn.accessTokenEnc);
    return fetchIgMedia(conn.externalAccountId, token);
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
        platform: "instagram",
        status: "connected",
      },
    });
    if (!conn?.accessTokenEnc) throw new Error("Not connected");
    const token = decryptAesGcm(conn.accessTokenEnc);
    return fetchIgInsights(conn.externalAccountId, token);
  },

  async publish(): Promise<unknown> {
    throw new Error("Instagram publish not in Phase 1");
  },
};
