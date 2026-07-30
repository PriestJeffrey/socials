import { prisma } from "@/lib/db/prisma";
import { encryptAesGcm, decryptAesGcm } from "@/lib/crypto/aes";
import { createOAuthState, verifyOAuthState } from "@/lib/platforms/oauth-state";
import { writeAudit } from "@/lib/audit/log";
import { jobQueue } from "@/lib/jobs";
import { clock } from "@/lib/clock";
import type { PlatformAdapter } from "@/lib/platforms/types";
import { getPinterestConfig } from "./config";
import {
  buildPinterestOAuthAuthorizeUrl,
  exchangePinterestCode,
  fetchPinterestPins,
  fetchPinterestUser,
  fixturePinterestSyncPayload,
  insightsFromPins,
  refreshPinterestToken,
} from "./client";

function requirePinterestReady(): void {
  const cfg = getPinterestConfig();
  if (!cfg.configured) {
    throw new Error(
      "Pinterest not configured. Set PINTEREST_APP_ID + SECRET, or PINTEREST_USE_FIXTURES=true",
    );
  }
}

export const pinterestAdapter: PlatformAdapter = {
  id: "pinterest",
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
    requirePinterestReady();
    const { state } = createOAuthState(userId);
    return buildPinterestOAuthAuthorizeUrl(state);
  },

  async handleOAuthCallback(
    userId: string,
    query: Record<string, string>,
  ): Promise<{ connectionId: string }> {
    requirePinterestReady();
    const state = query.state ?? "";
    const code = query.code ?? "";
    const verified = verifyOAuthState(state);
    if (!verified || verified.userId !== userId) {
      throw new Error("Invalid OAuth state");
    }
    if (!code) throw new Error("Missing OAuth code");

    const cfg = getPinterestConfig();
    let accessToken: string;
    let refreshToken: string | undefined;
    let expiresIn: number | undefined;
    let externalAccountId: string;
    let displayName: string;

    if (cfg.useFixtures) {
      const fix = fixturePinterestSyncPayload(userId);
      accessToken = fix.accessToken;
      refreshToken = fix.refreshToken;
      expiresIn = 60 * 60 * 24 * 30;
      externalAccountId = fix.externalAccountId;
      displayName = fix.displayName;
    } else {
      const tok = await exchangePinterestCode(code);
      accessToken = tok.accessToken;
      refreshToken = tok.refreshToken;
      expiresIn = tok.expiresIn;
      const profile = await fetchPinterestUser(accessToken);
      externalAccountId = profile.id;
      displayName = profile.username;
    }

    const tokenExpiresAt = expiresIn
      ? new Date(clock.now().getTime() + expiresIn * 1000)
      : null;

    const connection = await prisma.socialConnection.upsert({
      where: {
        userId_platform_externalAccountId: {
          userId,
          platform: "pinterest",
          externalAccountId,
        },
      },
      create: {
        userId,
        platform: "pinterest",
        externalAccountId,
        displayName,
        accessTokenEnc: encryptAesGcm(accessToken),
        refreshTokenEnc: refreshToken ? encryptAesGcm(refreshToken) : null,
        tokenExpiresAt,
        scopes: "boards:read,pins:read",
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
      action: "platform.pinterest.connected",
      metadata: { connectionId: connection.id, externalAccountId },
    });

    await jobQueue.enqueue({
      userId,
      type: "sync",
      payload: { platform: "pinterest", connectionId: connection.id },
      idempotencyKey: `sync:pinterest:${connection.id}:${clock.now().toISOString().slice(0, 13)}`,
    });

    return { connectionId: connection.id };
  },

  async refreshToken(userId: string, connectionId: string): Promise<void> {
    const conn = await prisma.socialConnection.findFirst({
      where: { id: connectionId, userId, platform: "pinterest" },
    });
    if (!conn?.refreshTokenEnc) throw new Error("Connection not found");
    const current = decryptAesGcm(conn.refreshTokenEnc);
    const next = await refreshPinterestToken(current);
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
      where: { id: connectionId, userId, platform: "pinterest" },
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
      action: "platform.pinterest.disconnected",
      metadata: { connectionId },
    });
  },

  async fetchPosts(userId: string, connectionId: string): Promise<unknown> {
    const conn = await prisma.socialConnection.findFirst({
      where: {
        id: connectionId,
        userId,
        platform: "pinterest",
        status: "connected",
      },
    });
    if (!conn?.accessTokenEnc) throw new Error("Not connected");
    const cfg = getPinterestConfig();
    if (cfg.useFixtures) return fixturePinterestSyncPayload(userId).pins;
    return fetchPinterestPins(decryptAesGcm(conn.accessTokenEnc));
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
        platform: "pinterest",
        status: "connected",
      },
    });
    if (!conn?.accessTokenEnc) throw new Error("Not connected");
    const cfg = getPinterestConfig();
    if (cfg.useFixtures) return fixturePinterestSyncPayload(userId).insights;
    const pins = await fetchPinterestPins(decryptAesGcm(conn.accessTokenEnc));
    return insightsFromPins(pins);
  },

  async publish(): Promise<unknown> {
    throw new Error(
      "Pinterest pin create requires pins:write + media — not in Phase 13 live path",
    );
  },
};
