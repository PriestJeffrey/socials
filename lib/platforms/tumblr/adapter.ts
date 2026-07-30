import { prisma } from "@/lib/db/prisma";
import { encryptAesGcm, decryptAesGcm } from "@/lib/crypto/aes";
import { createOAuthState, verifyOAuthState } from "@/lib/platforms/oauth-state";
import { writeAudit } from "@/lib/audit/log";
import { jobQueue } from "@/lib/jobs";
import { clock } from "@/lib/clock";
import type { PlatformAdapter } from "@/lib/platforms/types";
import { getTumblrConfig, TUMBLR_OAUTH_SCOPES } from "./config";
import {
  buildTumblrOAuthAuthorizeUrl,
  exchangeTumblrCode,
  fetchTumblrPosts,
  fetchTumblrUserInfo,
  fixtureTumblrSyncPayload,
  insightsFromTumblrPosts,
  refreshTumblrToken,
} from "./client";

function requireTumblrReady(): void {
  const cfg = getTumblrConfig();
  if (!cfg.configured) {
    throw new Error(
      "Tumblr not configured. Set TUMBLR_CLIENT_ID + SECRET, or TUMBLR_USE_FIXTURES=true",
    );
  }
}

export const tumblrAdapter: PlatformAdapter = {
  id: "tumblr",
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
    requireTumblrReady();
    const { state } = createOAuthState(userId);
    return buildTumblrOAuthAuthorizeUrl(state);
  },

  async handleOAuthCallback(
    userId: string,
    query: Record<string, string>,
  ): Promise<{ connectionId: string }> {
    requireTumblrReady();
    const state = query.state ?? "";
    const code = query.code ?? "";
    const verified = verifyOAuthState(state);
    if (!verified || verified.userId !== userId) {
      throw new Error("Invalid OAuth state");
    }
    if (!code) throw new Error("Missing OAuth code");

    const cfg = getTumblrConfig();
    let accessToken: string;
    let refreshToken: string | undefined;
    let expiresIn: number | undefined;
    let externalAccountId: string;
    let displayName: string;

    if (cfg.useFixtures) {
      const fix = fixtureTumblrSyncPayload(userId);
      accessToken = fix.accessToken;
      refreshToken = fix.refreshToken;
      expiresIn = 60 * 60;
      externalAccountId = fix.externalAccountId;
      displayName = fix.displayName;
    } else {
      const tok = await exchangeTumblrCode(code);
      accessToken = tok.accessToken;
      refreshToken = tok.refreshToken;
      expiresIn = tok.expiresIn;
      const me = await fetchTumblrUserInfo(accessToken);
      externalAccountId = me.primaryBlog;
      displayName = me.name;
    }

    const tokenExpiresAt = expiresIn
      ? new Date(clock.now().getTime() + expiresIn * 1000)
      : null;

    const connection = await prisma.socialConnection.upsert({
      where: {
        userId_platform_externalAccountId: {
          userId,
          platform: "tumblr",
          externalAccountId,
        },
      },
      create: {
        userId,
        platform: "tumblr",
        externalAccountId,
        displayName,
        accessTokenEnc: encryptAesGcm(accessToken),
        refreshTokenEnc: refreshToken ? encryptAesGcm(refreshToken) : null,
        tokenExpiresAt,
        scopes: TUMBLR_OAUTH_SCOPES,
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
      action: "platform.tumblr.connected",
      metadata: { connectionId: connection.id, externalAccountId },
    });

    await jobQueue.enqueue({
      userId,
      type: "sync",
      payload: { platform: "tumblr", connectionId: connection.id },
      idempotencyKey: `sync:tumblr:${connection.id}:${clock.now().toISOString().slice(0, 13)}`,
    });

    return { connectionId: connection.id };
  },

  async refreshToken(userId: string, connectionId: string): Promise<void> {
    const conn = await prisma.socialConnection.findFirst({
      where: { id: connectionId, userId, platform: "tumblr" },
    });
    if (!conn?.refreshTokenEnc) throw new Error("Connection not found");
    const current = decryptAesGcm(conn.refreshTokenEnc);
    const next = await refreshTumblrToken(current);
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
      where: { id: connectionId, userId, platform: "tumblr" },
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
      action: "platform.tumblr.disconnected",
      metadata: { connectionId },
    });
  },

  async fetchPosts(userId: string, connectionId: string): Promise<unknown> {
    const conn = await prisma.socialConnection.findFirst({
      where: {
        id: connectionId,
        userId,
        platform: "tumblr",
        status: "connected",
      },
    });
    if (!conn?.accessTokenEnc) throw new Error("Not connected");
    const cfg = getTumblrConfig();
    if (cfg.useFixtures) return fixtureTumblrSyncPayload(userId).posts;
    const token = decryptAesGcm(conn.accessTokenEnc);
    return fetchTumblrPosts(token, conn.externalAccountId);
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
        platform: "tumblr",
        status: "connected",
      },
    });
    if (!conn?.accessTokenEnc) throw new Error("Not connected");
    const cfg = getTumblrConfig();
    if (cfg.useFixtures) return fixtureTumblrSyncPayload(userId).insights;
    const token = decryptAesGcm(conn.accessTokenEnc);
    const posts = await fetchTumblrPosts(token, conn.externalAccountId);
    return insightsFromTumblrPosts(posts);
  },

  async publish(): Promise<unknown> {
    throw new Error(
      "Tumblr NPF create requires write scope — not in Phase 17 live path",
    );
  },
};
