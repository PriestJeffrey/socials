import { prisma } from "@/lib/db/prisma";
import { encryptAesGcm, decryptAesGcm } from "@/lib/crypto/aes";
import { createOAuthState, verifyOAuthState } from "@/lib/platforms/oauth-state";
import { writeAudit } from "@/lib/audit/log";
import { jobQueue } from "@/lib/jobs";
import { clock } from "@/lib/clock";
import type { PlatformAdapter } from "@/lib/platforms/types";
import { getTikTokConfig } from "./config";
import {
  buildTikTokOAuthAuthorizeUrl,
  exchangeTikTokCode,
  fetchTikTokUser,
  fetchTikTokVideos,
  fixtureTikTokSyncPayload,
  insightsFromVideos,
  refreshTikTokToken,
} from "./client";

function requireTikTokReady(): void {
  const cfg = getTikTokConfig();
  if (!cfg.configured) {
    throw new Error(
      "TikTok not configured. Set TIKTOK_CLIENT_KEY + SECRET, or TIKTOK_USE_FIXTURES=true",
    );
  }
}

export const tiktokAdapter: PlatformAdapter = {
  id: "tiktok",
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
    requireTikTokReady();
    const { state } = createOAuthState(userId);
    return buildTikTokOAuthAuthorizeUrl(state);
  },

  async handleOAuthCallback(
    userId: string,
    query: Record<string, string>,
  ): Promise<{ connectionId: string }> {
    requireTikTokReady();
    const state = query.state ?? "";
    const code = query.code ?? "";
    const verified = verifyOAuthState(state);
    if (!verified || verified.userId !== userId) {
      throw new Error("Invalid OAuth state");
    }
    if (!code) throw new Error("Missing OAuth code");

    const cfg = getTikTokConfig();
    let accessToken: string;
    let refreshToken: string | undefined;
    let expiresIn: number | undefined;
    let externalAccountId: string;
    let displayName: string;

    if (cfg.useFixtures) {
      const fix = fixtureTikTokSyncPayload(userId);
      accessToken = fix.accessToken;
      refreshToken = fix.refreshToken;
      expiresIn = 60 * 60 * 24 * 60;
      externalAccountId = fix.externalAccountId;
      displayName = fix.displayName;
    } else {
      const tok = await exchangeTikTokCode(code);
      accessToken = tok.accessToken;
      refreshToken = tok.refreshToken;
      expiresIn = tok.expiresIn;
      const profile = await fetchTikTokUser(accessToken);
      externalAccountId = profile.openId;
      displayName = profile.displayName;
    }

    const tokenExpiresAt = expiresIn
      ? new Date(clock.now().getTime() + expiresIn * 1000)
      : null;

    const connection = await prisma.socialConnection.upsert({
      where: {
        userId_platform_externalAccountId: {
          userId,
          platform: "tiktok",
          externalAccountId,
        },
      },
      create: {
        userId,
        platform: "tiktok",
        externalAccountId,
        displayName,
        accessTokenEnc: encryptAesGcm(accessToken),
        refreshTokenEnc: refreshToken ? encryptAesGcm(refreshToken) : null,
        tokenExpiresAt,
        scopes: "tiktok",
        status: "connected",
      },
      update: {
        displayName,
        accessTokenEnc: encryptAesGcm(accessToken),
        refreshTokenEnc: refreshToken ? encryptAesGcm(refreshToken) : null,
        tokenExpiresAt,
        status: "connected",
        lastSyncError: null,
      },
    });

    await writeAudit({
      userId,
      action: "platform.tiktok.connected",
      metadata: { connectionId: connection.id, externalAccountId },
    });

    await jobQueue.enqueue({
      userId,
      type: "sync",
      payload: { platform: "tiktok", connectionId: connection.id },
      idempotencyKey: `sync:tiktok:${connection.id}:${clock.now().toISOString().slice(0, 13)}`,
    });

    return { connectionId: connection.id };
  },

  async refreshToken(userId: string, connectionId: string): Promise<void> {
    const conn = await prisma.socialConnection.findFirst({
      where: { id: connectionId, userId, platform: "tiktok" },
    });
    if (!conn?.refreshTokenEnc) throw new Error("Connection not found");
    const current = decryptAesGcm(conn.refreshTokenEnc);
    const next = await refreshTikTokToken(current);
    await prisma.socialConnection.update({
      where: { id: connectionId },
      data: {
        accessTokenEnc: encryptAesGcm(next.accessToken),
        refreshTokenEnc: next.refreshToken
          ? encryptAesGcm(next.refreshToken)
          : conn.refreshTokenEnc,
        tokenExpiresAt: next.expiresIn
          ? new Date(clock.now().getTime() + next.expiresIn * 1000)
          : null,
      },
    });
  },

  async disconnect(userId: string, connectionId: string): Promise<void> {
    const conn = await prisma.socialConnection.findFirst({
      where: { id: connectionId, userId, platform: "tiktok" },
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
      action: "platform.tiktok.disconnected",
      metadata: { connectionId },
    });
  },

  async fetchPosts(userId: string, connectionId: string): Promise<unknown> {
    const conn = await prisma.socialConnection.findFirst({
      where: {
        id: connectionId,
        userId,
        platform: "tiktok",
        status: "connected",
      },
    });
    if (!conn?.accessTokenEnc) throw new Error("Not connected");
    const cfg = getTikTokConfig();
    if (cfg.useFixtures) return fixtureTikTokSyncPayload(userId).videos;
    return fetchTikTokVideos(decryptAesGcm(conn.accessTokenEnc));
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
        platform: "tiktok",
        status: "connected",
      },
    });
    if (!conn?.accessTokenEnc) throw new Error("Not connected");
    const cfg = getTikTokConfig();
    if (cfg.useFixtures) return fixtureTikTokSyncPayload(userId).insights;
    const videos = await fetchTikTokVideos(decryptAesGcm(conn.accessTokenEnc));
    return insightsFromVideos(videos);
  },

  async publish(): Promise<unknown> {
    throw new Error(
      "TikTok Content Posting requires app audit + video upload — not in Phase 10 live path",
    );
  },
};
