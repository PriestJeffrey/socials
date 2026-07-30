import { prisma } from "@/lib/db/prisma";
import { encryptAesGcm, decryptAesGcm } from "@/lib/crypto/aes";
import { createOAuthState, verifyOAuthState } from "@/lib/platforms/oauth-state";
import { writeAudit } from "@/lib/audit/log";
import { jobQueue } from "@/lib/jobs";
import { clock } from "@/lib/clock";
import type { PlatformAdapter } from "@/lib/platforms/types";
import { getThreadsConfig } from "./config";
import {
  buildThreadsOAuthAuthorizeUrl,
  exchangeThreadsCode,
  exchangeThreadsLongLived,
  fetchThreadsInsights,
  fetchThreadsMedia,
  fetchThreadsProfile,
  fixtureThreadsSyncPayload,
} from "./client";

function requireThreadsReady(): void {
  const cfg = getThreadsConfig();
  if (!cfg.configured) {
    throw new Error(
      "Threads not configured. Set THREADS_APP_ID + SECRET (or META_*), or THREADS_USE_FIXTURES=true",
    );
  }
}

export const threadsAdapter: PlatformAdapter = {
  id: "threads",
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
    requireThreadsReady();
    const { state } = createOAuthState(userId);
    return buildThreadsOAuthAuthorizeUrl(state);
  },

  async handleOAuthCallback(
    userId: string,
    query: Record<string, string>,
  ): Promise<{ connectionId: string }> {
    requireThreadsReady();
    const state = query.state ?? "";
    const code = query.code ?? "";
    const verified = verifyOAuthState(state);
    if (!verified || verified.userId !== userId) {
      throw new Error("Invalid OAuth state");
    }
    if (!code) throw new Error("Missing OAuth code");

    const cfg = getThreadsConfig();
    let accessToken: string;
    let expiresIn: number | undefined;
    let externalAccountId: string;
    let displayName: string;

    if (cfg.useFixtures) {
      const fix = fixtureThreadsSyncPayload(userId);
      accessToken = fix.accessToken;
      expiresIn = 60 * 60 * 24 * 60;
      externalAccountId = fix.externalAccountId;
      displayName = fix.displayName;
    } else {
      const short = await exchangeThreadsCode(code);
      const long = await exchangeThreadsLongLived(short.accessToken);
      accessToken = long.accessToken;
      expiresIn = long.expiresIn;
      const profile = await fetchThreadsProfile(accessToken);
      externalAccountId = profile.id;
      displayName = profile.username ?? `Threads ${profile.id}`;
    }

    const tokenExpiresAt = expiresIn
      ? new Date(clock.now().getTime() + expiresIn * 1000)
      : null;

    const connection = await prisma.socialConnection.upsert({
      where: {
        userId_platform_externalAccountId: {
          userId,
          platform: "threads",
          externalAccountId,
        },
      },
      create: {
        userId,
        platform: "threads",
        externalAccountId,
        displayName,
        accessTokenEnc: encryptAesGcm(accessToken),
        tokenExpiresAt,
        scopes: "threads",
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
      action: "platform.threads.connected",
      metadata: { connectionId: connection.id, externalAccountId },
    });

    await jobQueue.enqueue({
      userId,
      type: "sync",
      payload: { platform: "threads", connectionId: connection.id },
      idempotencyKey: `sync:threads:${connection.id}:${clock.now().toISOString().slice(0, 13)}`,
    });

    return { connectionId: connection.id };
  },

  async refreshToken(userId: string, connectionId: string): Promise<void> {
    const conn = await prisma.socialConnection.findFirst({
      where: { id: connectionId, userId, platform: "threads" },
    });
    if (!conn?.accessTokenEnc) throw new Error("Connection not found");
    const current = decryptAesGcm(conn.accessTokenEnc);
    const long = await exchangeThreadsLongLived(current);
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
      where: { id: connectionId, userId, platform: "threads" },
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
      action: "platform.threads.disconnected",
      metadata: { connectionId },
    });
  },

  async fetchPosts(userId: string, connectionId: string): Promise<unknown> {
    const conn = await prisma.socialConnection.findFirst({
      where: {
        id: connectionId,
        userId,
        platform: "threads",
        status: "connected",
      },
    });
    if (!conn?.accessTokenEnc) throw new Error("Not connected");
    const token = decryptAesGcm(conn.accessTokenEnc);
    const cfg = getThreadsConfig();
    if (cfg.useFixtures) return fixtureThreadsSyncPayload(userId).media;
    return fetchThreadsMedia(conn.externalAccountId, token);
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
        platform: "threads",
        status: "connected",
      },
    });
    if (!conn?.accessTokenEnc) throw new Error("Not connected");
    const token = decryptAesGcm(conn.accessTokenEnc);
    const cfg = getThreadsConfig();
    if (cfg.useFixtures) return fixtureThreadsSyncPayload(userId).insights;
    return fetchThreadsInsights(conn.externalAccountId, token);
  },

  async publish(): Promise<unknown> {
    throw new Error("Threads publish not wired for live Graph — use fixtures path");
  },
};
