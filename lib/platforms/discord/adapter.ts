import { prisma } from "@/lib/db/prisma";
import { encryptAesGcm, decryptAesGcm } from "@/lib/crypto/aes";
import { createOAuthState, verifyOAuthState } from "@/lib/platforms/oauth-state";
import { writeAudit } from "@/lib/audit/log";
import { jobQueue } from "@/lib/jobs";
import { clock } from "@/lib/clock";
import type { PlatformAdapter } from "@/lib/platforms/types";
import { getDiscordConfig, DISCORD_OAUTH_SCOPES } from "./config";
import {
  buildDiscordOAuthAuthorizeUrl,
  exchangeDiscordCode,
  fetchDiscordGuilds,
  fetchDiscordMe,
  fixtureDiscordSyncPayload,
  insightsFromDiscordLive,
  insightsFromDiscordMessages,
  refreshDiscordToken,
} from "./client";

function requireDiscordReady(): void {
  const cfg = getDiscordConfig();
  if (!cfg.configured) {
    throw new Error(
      "Discord not configured. Set DISCORD_CLIENT_ID + SECRET, or DISCORD_USE_FIXTURES=true",
    );
  }
}

export const discordAdapter: PlatformAdapter = {
  id: "discord",
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
    requireDiscordReady();
    const { state } = createOAuthState(userId);
    return buildDiscordOAuthAuthorizeUrl(state);
  },

  async handleOAuthCallback(
    userId: string,
    query: Record<string, string>,
  ): Promise<{ connectionId: string }> {
    requireDiscordReady();
    const state = query.state ?? "";
    const code = query.code ?? "";
    const verified = verifyOAuthState(state);
    if (!verified || verified.userId !== userId) {
      throw new Error("Invalid OAuth state");
    }
    if (!code) throw new Error("Missing OAuth code");

    const cfg = getDiscordConfig();
    let accessToken: string;
    let refreshToken: string | undefined;
    let expiresIn: number | undefined;
    let externalAccountId: string;
    let displayName: string;

    if (cfg.useFixtures) {
      const fix = fixtureDiscordSyncPayload(userId);
      accessToken = fix.accessToken;
      refreshToken = fix.refreshToken;
      expiresIn = 60 * 60 * 24 * 7;
      externalAccountId = fix.externalAccountId;
      displayName = fix.displayName;
    } else {
      const tok = await exchangeDiscordCode(code);
      accessToken = tok.accessToken;
      refreshToken = tok.refreshToken;
      expiresIn = tok.expiresIn;
      const me = await fetchDiscordMe(accessToken);
      externalAccountId = me.id;
      displayName = me.globalName ?? me.username;
    }

    const tokenExpiresAt = expiresIn
      ? new Date(clock.now().getTime() + expiresIn * 1000)
      : null;

    const connection = await prisma.socialConnection.upsert({
      where: {
        userId_platform_externalAccountId: {
          userId,
          platform: "discord",
          externalAccountId,
        },
      },
      create: {
        userId,
        platform: "discord",
        externalAccountId,
        displayName,
        accessTokenEnc: encryptAesGcm(accessToken),
        refreshTokenEnc: refreshToken ? encryptAesGcm(refreshToken) : null,
        tokenExpiresAt,
        scopes: DISCORD_OAUTH_SCOPES,
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
      action: "platform.discord.connected",
      metadata: { connectionId: connection.id, externalAccountId },
    });

    await jobQueue.enqueue({
      userId,
      type: "sync",
      payload: { platform: "discord", connectionId: connection.id },
      idempotencyKey: `sync:discord:${connection.id}:${clock.now().toISOString().slice(0, 13)}`,
    });

    return { connectionId: connection.id };
  },

  async refreshToken(userId: string, connectionId: string): Promise<void> {
    const conn = await prisma.socialConnection.findFirst({
      where: { id: connectionId, userId, platform: "discord" },
    });
    if (!conn?.refreshTokenEnc) throw new Error("Connection not found");
    const current = decryptAesGcm(conn.refreshTokenEnc);
    const next = await refreshDiscordToken(current);
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
      where: { id: connectionId, userId, platform: "discord" },
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
      action: "platform.discord.disconnected",
      metadata: { connectionId },
    });
  },

  async fetchPosts(userId: string, connectionId: string): Promise<unknown> {
    const conn = await prisma.socialConnection.findFirst({
      where: {
        id: connectionId,
        userId,
        platform: "discord",
        status: "connected",
      },
    });
    if (!conn?.accessTokenEnc) throw new Error("Not connected");
    const cfg = getDiscordConfig();
    if (cfg.useFixtures) return fixtureDiscordSyncPayload(userId).messages;
    // Channel history requires a bot — deferred.
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
        platform: "discord",
        status: "connected",
      },
    });
    if (!conn?.accessTokenEnc) throw new Error("Not connected");
    const cfg = getDiscordConfig();
    if (cfg.useFixtures) return fixtureDiscordSyncPayload(userId).insights;
    const token = decryptAesGcm(conn.accessTokenEnc);
    const guilds = await fetchDiscordGuilds(token);
    return insightsFromDiscordLive(guilds.length);
  },

  async publish(): Promise<unknown> {
    throw new Error(
      "Discord message create requires bot/webhook — not in Phase 19 live path",
    );
  },
};
