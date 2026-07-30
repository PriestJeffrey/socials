import { prisma } from "@/lib/db/prisma";
import { encryptAesGcm, decryptAesGcm } from "@/lib/crypto/aes";
import { createOAuthState, verifyOAuthState } from "@/lib/platforms/oauth-state";
import { writeAudit } from "@/lib/audit/log";
import { jobQueue } from "@/lib/jobs";
import { clock } from "@/lib/clock";
import type { PlatformAdapter } from "@/lib/platforms/types";
import { getRedditConfig } from "./config";
import {
  buildRedditOAuthAuthorizeUrl,
  exchangeRedditCode,
  fetchRedditMe,
  fetchRedditSubmitted,
  fixtureRedditSyncPayload,
  insightsFromRedditPosts,
  refreshRedditToken,
} from "./client";

function requireRedditReady(): void {
  const cfg = getRedditConfig();
  if (!cfg.configured) {
    throw new Error(
      "Reddit not configured. Set REDDIT_CLIENT_ID + SECRET, or REDDIT_USE_FIXTURES=true",
    );
  }
}

export const redditAdapter: PlatformAdapter = {
  id: "reddit",
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
    requireRedditReady();
    const { state } = createOAuthState(userId);
    return buildRedditOAuthAuthorizeUrl(state);
  },

  async handleOAuthCallback(
    userId: string,
    query: Record<string, string>,
  ): Promise<{ connectionId: string }> {
    requireRedditReady();
    const state = query.state ?? "";
    const code = query.code ?? "";
    const verified = verifyOAuthState(state);
    if (!verified || verified.userId !== userId) {
      throw new Error("Invalid OAuth state");
    }
    if (!code) throw new Error("Missing OAuth code");

    const cfg = getRedditConfig();
    let accessToken: string;
    let refreshToken: string | undefined;
    let expiresIn: number | undefined;
    let externalAccountId: string;
    let displayName: string;

    if (cfg.useFixtures) {
      const fix = fixtureRedditSyncPayload(userId);
      accessToken = fix.accessToken;
      refreshToken = fix.refreshToken;
      expiresIn = 60 * 60;
      externalAccountId = fix.externalAccountId;
      displayName = fix.displayName;
    } else {
      const tok = await exchangeRedditCode(code);
      accessToken = tok.accessToken;
      refreshToken = tok.refreshToken;
      expiresIn = tok.expiresIn;
      const me = await fetchRedditMe(accessToken);
      externalAccountId = me.id;
      displayName = me.name;
    }

    const tokenExpiresAt = expiresIn
      ? new Date(clock.now().getTime() + expiresIn * 1000)
      : null;

    const connection = await prisma.socialConnection.upsert({
      where: {
        userId_platform_externalAccountId: {
          userId,
          platform: "reddit",
          externalAccountId,
        },
      },
      create: {
        userId,
        platform: "reddit",
        externalAccountId,
        displayName,
        accessTokenEnc: encryptAesGcm(accessToken),
        refreshTokenEnc: refreshToken ? encryptAesGcm(refreshToken) : null,
        tokenExpiresAt,
        scopes: "identity,read,history",
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
      action: "platform.reddit.connected",
      metadata: { connectionId: connection.id, externalAccountId },
    });

    await jobQueue.enqueue({
      userId,
      type: "sync",
      payload: { platform: "reddit", connectionId: connection.id },
      idempotencyKey: `sync:reddit:${connection.id}:${clock.now().toISOString().slice(0, 13)}`,
    });

    return { connectionId: connection.id };
  },

  async refreshToken(userId: string, connectionId: string): Promise<void> {
    const conn = await prisma.socialConnection.findFirst({
      where: { id: connectionId, userId, platform: "reddit" },
    });
    if (!conn?.refreshTokenEnc) throw new Error("Connection not found");
    const current = decryptAesGcm(conn.refreshTokenEnc);
    const next = await refreshRedditToken(current);
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
      where: { id: connectionId, userId, platform: "reddit" },
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
      action: "platform.reddit.disconnected",
      metadata: { connectionId },
    });
  },

  async fetchPosts(userId: string, connectionId: string): Promise<unknown> {
    const conn = await prisma.socialConnection.findFirst({
      where: {
        id: connectionId,
        userId,
        platform: "reddit",
        status: "connected",
      },
    });
    if (!conn?.accessTokenEnc) throw new Error("Not connected");
    const cfg = getRedditConfig();
    if (cfg.useFixtures) return fixtureRedditSyncPayload(userId).posts;
    const token = decryptAesGcm(conn.accessTokenEnc);
    const name = conn.displayName ?? conn.externalAccountId;
    return fetchRedditSubmitted(token, name);
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
        platform: "reddit",
        status: "connected",
      },
    });
    if (!conn?.accessTokenEnc) throw new Error("Not connected");
    const cfg = getRedditConfig();
    if (cfg.useFixtures) return fixtureRedditSyncPayload(userId).insights;
    const token = decryptAesGcm(conn.accessTokenEnc);
    const name = conn.displayName ?? conn.externalAccountId;
    const posts = await fetchRedditSubmitted(token, name);
    return insightsFromRedditPosts(posts);
  },

  async publish(): Promise<unknown> {
    throw new Error(
      "Reddit submit requires submit scope — not in Phase 15 live path",
    );
  },
};
