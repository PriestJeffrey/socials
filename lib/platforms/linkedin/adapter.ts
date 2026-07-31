import { prisma } from "@/lib/db/prisma";
import { encryptAesGcm, decryptAesGcm } from "@/lib/crypto/aes";
import { createOAuthState, verifyOAuthState } from "@/lib/platforms/oauth-state";
import { writeAudit } from "@/lib/audit/log";
import { jobQueue } from "@/lib/jobs";
import { clock } from "@/lib/clock";
import type { PlatformAdapter } from "@/lib/platforms/types";
import { getLinkedInConfig, LINKEDIN_OAUTH_SCOPES } from "./config";
import {
  buildLinkedInOAuthAuthorizeUrl,
  exchangeLinkedInCode,
  fetchLinkedInProfile,
  fixtureLiSyncPayload,
} from "./client";

function requireReady(): void {
  const cfg = getLinkedInConfig();
  if (!cfg.configured) {
    throw new Error(
      "LinkedIn not configured. Set LINKEDIN_CLIENT_ID + SECRET, or LINKEDIN_USE_FIXTURES=true",
    );
  }
}

export const linkedinAdapter: PlatformAdapter = {
  id: "linkedin",
  capabilities: {
    oauth: true,
    readMetrics: true,
    readPosts: true,
    publish: true,
    schedule: false,
    comments: false,
    manualCopy: false,
  },

  async beginOAuth(userId: string): Promise<string> {
    requireReady();
    const { state } = createOAuthState(userId);
    return buildLinkedInOAuthAuthorizeUrl(state);
  },

  async handleOAuthCallback(
    userId: string,
    query: Record<string, string>,
  ): Promise<{ connectionId: string }> {
    requireReady();
    const state = query.state ?? "";
    const code = query.code ?? "";
    const verified = verifyOAuthState(state);
    if (!verified || verified.userId !== userId) {
      throw new Error("Invalid OAuth state");
    }
    if (!code) throw new Error("Missing OAuth code");

    const cfg = getLinkedInConfig();
    let accessToken: string;
    let expiresIn: number | undefined;
    let externalAccountId: string;
    let displayName: string;

    if (cfg.useFixtures) {
      const fix = fixtureLiSyncPayload(userId);
      accessToken = fix.accessToken;
      expiresIn = 60 * 60 * 24 * 60;
      externalAccountId = fix.externalAccountId;
      displayName = fix.displayName;
    } else {
      const tok = await exchangeLinkedInCode(code);
      accessToken = tok.accessToken;
      expiresIn = tok.expiresIn;
      const profile = await fetchLinkedInProfile(accessToken);
      externalAccountId = profile.externalAccountId;
      displayName = profile.displayName;
    }

    const tokenExpiresAt = expiresIn
      ? new Date(clock.now().getTime() + expiresIn * 1000)
      : null;

    const connection = await prisma.socialConnection.upsert({
      where: {
        userId_platform_externalAccountId: {
          userId,
          platform: "linkedin",
          externalAccountId,
        },
      },
      create: {
        userId,
        platform: "linkedin",
        externalAccountId,
        displayName,
        accessTokenEnc: encryptAesGcm(accessToken),
        tokenExpiresAt,
        scopes: LINKEDIN_OAUTH_SCOPES,
        status: "connected",
      },
      update: {
        displayName,
        accessTokenEnc: encryptAesGcm(accessToken),
        tokenExpiresAt,
        scopes: LINKEDIN_OAUTH_SCOPES,
        status: "connected",
        lastSyncError: null,
      },
    });

    await writeAudit({
      userId,
      action: "platform.linkedin.connected",
      metadata: { connectionId: connection.id, externalAccountId },
    });

    await jobQueue.enqueue({
      userId,
      type: "sync",
      payload: { platform: "linkedin", connectionId: connection.id },
      idempotencyKey: `sync:linkedin:${connection.id}:${clock.now().toISOString().slice(0, 13)}`,
    });

    return { connectionId: connection.id };
  },

  async refreshToken(_userId: string, _connectionId: string): Promise<void> {
    throw new Error("LinkedIn refresh not implemented in Phase 3 - reconnect");
  },

  async disconnect(userId: string, connectionId: string): Promise<void> {
    const conn = await prisma.socialConnection.findFirst({
      where: { id: connectionId, userId, platform: "linkedin" },
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
      action: "platform.linkedin.disconnected",
      metadata: { connectionId },
    });
  },

  async fetchPosts(userId: string, connectionId: string): Promise<unknown> {
    const conn = await prisma.socialConnection.findFirst({
      where: {
        id: connectionId,
        userId,
        platform: "linkedin",
        status: "connected",
      },
    });
    if (!conn?.accessTokenEnc) throw new Error("Not connected");
    decryptAesGcm(conn.accessTokenEnc);
    const cfg = getLinkedInConfig();
    if (cfg.useFixtures) return fixtureLiSyncPayload("x").posts;
    // Live member posts API varies by product - Phase 3 live path returns empty until scopes confirmed
    return [];
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
        platform: "linkedin",
        status: "connected",
      },
    });
    if (!conn?.accessTokenEnc) throw new Error("Not connected");
    decryptAesGcm(conn.accessTokenEnc);
    const cfg = getLinkedInConfig();
    if (cfg.useFixtures) return fixtureLiSyncPayload("x").insights;
    return [];
  },

  async publish(): Promise<unknown> {
    throw new Error("LinkedIn publish not in Phase 3");
  },
};
