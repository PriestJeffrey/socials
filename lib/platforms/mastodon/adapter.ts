import { prisma } from "@/lib/db/prisma";
import { encryptAesGcm, decryptAesGcm } from "@/lib/crypto/aes";
import { createOAuthState, verifyOAuthState } from "@/lib/platforms/oauth-state";
import { writeAudit } from "@/lib/audit/log";
import { jobQueue } from "@/lib/jobs";
import { clock } from "@/lib/clock";
import type { PlatformAdapter } from "@/lib/platforms/types";
import { getMastodonConfig, MASTODON_OAUTH_SCOPES } from "./config";
import {
  buildMastodonOAuthAuthorizeUrl,
  exchangeMastodonCode,
  fetchMastodonMe,
  fetchMastodonStatuses,
  fixtureMastodonSyncPayload,
  insightsFromMastodonStatuses,
} from "./client";

function requireMastodonReady(): void {
  const cfg = getMastodonConfig();
  if (!cfg.configured) {
    throw new Error(
      "Mastodon not configured. Set MASTODON_CLIENT_ID + SECRET, or MASTODON_USE_FIXTURES=true",
    );
  }
}

export const mastodonAdapter: PlatformAdapter = {
  id: "mastodon",
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
    requireMastodonReady();
    const { state } = createOAuthState(userId);
    return buildMastodonOAuthAuthorizeUrl(state);
  },

  async handleOAuthCallback(
    userId: string,
    query: Record<string, string>,
  ): Promise<{ connectionId: string }> {
    requireMastodonReady();
    const state = query.state ?? "";
    const code = query.code ?? "";
    const verified = verifyOAuthState(state);
    if (!verified || verified.userId !== userId) {
      throw new Error("Invalid OAuth state");
    }
    if (!code) throw new Error("Missing OAuth code");

    const cfg = getMastodonConfig();
    let accessToken: string;
    let refreshToken: string | undefined;
    let expiresIn: number | undefined;
    let externalAccountId: string;
    let displayName: string;

    if (cfg.useFixtures) {
      const fix = fixtureMastodonSyncPayload(userId);
      accessToken = fix.accessToken;
      refreshToken = fix.refreshToken;
      expiresIn = 60 * 60 * 24 * 30;
      externalAccountId = fix.externalAccountId;
      displayName = fix.displayName;
    } else {
      const tok = await exchangeMastodonCode(code);
      accessToken = tok.accessToken;
      refreshToken = tok.refreshToken;
      expiresIn = tok.expiresIn;
      const me = await fetchMastodonMe(accessToken);
      externalAccountId = me.id;
      displayName = me.acct.includes("@")
        ? me.acct
        : `${me.acct}@${new URL(cfg.instanceUrl).host}`;
    }

    const tokenExpiresAt = expiresIn
      ? new Date(clock.now().getTime() + expiresIn * 1000)
      : null;

    const connection = await prisma.socialConnection.upsert({
      where: {
        userId_platform_externalAccountId: {
          userId,
          platform: "mastodon",
          externalAccountId,
        },
      },
      create: {
        userId,
        platform: "mastodon",
        externalAccountId,
        displayName,
        accessTokenEnc: encryptAesGcm(accessToken),
        refreshTokenEnc: refreshToken ? encryptAesGcm(refreshToken) : null,
        tokenExpiresAt,
        scopes: MASTODON_OAUTH_SCOPES,
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
      action: "platform.mastodon.connected",
      metadata: { connectionId: connection.id, externalAccountId },
    });

    await jobQueue.enqueue({
      userId,
      type: "sync",
      payload: { platform: "mastodon", connectionId: connection.id },
      idempotencyKey: `sync:mastodon:${connection.id}:${clock.now().toISOString().slice(0, 13)}`,
    });

    return { connectionId: connection.id };
  },

  async refreshToken(): Promise<void> {
    throw new Error(
      "Mastodon token refresh not wired in Phase 16 — reconnect if expired",
    );
  },

  async disconnect(userId: string, connectionId: string): Promise<void> {
    const conn = await prisma.socialConnection.findFirst({
      where: { id: connectionId, userId, platform: "mastodon" },
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
      action: "platform.mastodon.disconnected",
      metadata: { connectionId },
    });
  },

  async fetchPosts(userId: string, connectionId: string): Promise<unknown> {
    const conn = await prisma.socialConnection.findFirst({
      where: {
        id: connectionId,
        userId,
        platform: "mastodon",
        status: "connected",
      },
    });
    if (!conn?.accessTokenEnc) throw new Error("Not connected");
    const cfg = getMastodonConfig();
    if (cfg.useFixtures) return fixtureMastodonSyncPayload(userId).statuses;
    const token = decryptAesGcm(conn.accessTokenEnc);
    return fetchMastodonStatuses(token, conn.externalAccountId);
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
        platform: "mastodon",
        status: "connected",
      },
    });
    if (!conn?.accessTokenEnc) throw new Error("Not connected");
    const cfg = getMastodonConfig();
    if (cfg.useFixtures) return fixtureMastodonSyncPayload(userId).insights;
    const token = decryptAesGcm(conn.accessTokenEnc);
    const statuses = await fetchMastodonStatuses(token, conn.externalAccountId);
    return insightsFromMastodonStatuses(statuses);
  },

  async publish(): Promise<unknown> {
    throw new Error(
      "Mastodon status create requires write:statuses — not in Phase 16 live path",
    );
  },
};
