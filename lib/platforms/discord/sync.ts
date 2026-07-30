import { prisma } from "@/lib/db/prisma";
import { decryptAesGcm } from "@/lib/crypto/aes";
import { clock } from "@/lib/clock";
import { getDiscordConfig } from "@/lib/platforms/discord/config";
import {
  fetchDiscordGuilds,
  fixtureDiscordSyncPayload,
  insightsFromDiscordLive,
  type DiscordInsightPoint,
  type DiscordMessageItem,
} from "@/lib/platforms/discord/client";

export async function runDiscordSync(input: {
  userId: string;
  connectionId: string;
}): Promise<{ posts: number; metrics: number }> {
  const conn = await prisma.socialConnection.findFirst({
    where: {
      id: input.connectionId,
      userId: input.userId,
      platform: "discord",
      status: "connected",
    },
  });
  if (!conn) throw new Error("Connection not found or not connected");

  const cfg = getDiscordConfig();
  let messages: DiscordMessageItem[];
  let insights: DiscordInsightPoint[];

  try {
    if (cfg.useFixtures) {
      const fix = fixtureDiscordSyncPayload(input.userId);
      messages = fix.messages;
      insights = fix.insights;
    } else {
      if (!conn.accessTokenEnc) {
        throw new Error("Missing access token — reconnect Discord");
      }
      const token = decryptAesGcm(conn.accessTokenEnc);
      const guilds = await fetchDiscordGuilds(token);
      messages = [];
      insights = insightsFromDiscordLive(guilds.length);
    }

    let posts = 0;
    for (const item of messages) {
      await prisma.post.upsert({
        where: {
          connectionId_platformPostId: {
            connectionId: conn.id,
            platformPostId: item.id,
          },
        },
        create: {
          userId: input.userId,
          connectionId: conn.id,
          platformPostId: item.id,
          kind: "TEXT",
          caption: item.content ?? null,
          permalink: item.url ?? null,
          publishedAt: item.createdAt ? new Date(item.createdAt) : null,
          raw: item as object,
        },
        update: {
          kind: "TEXT",
          caption: item.content ?? null,
          permalink: item.url ?? null,
          publishedAt: item.createdAt ? new Date(item.createdAt) : null,
          raw: item as object,
        },
      });
      posts += 1;
    }

    let metrics = 0;
    const capturedAt = clock.now();
    for (const point of insights) {
      await prisma.metricSnapshot.create({
        data: {
          userId: input.userId,
          connectionId: conn.id,
          platform: "discord",
          metricKey: point.metricKey,
          value: point.value,
          capturedAt,
          raw: point as object,
        },
      });
      metrics += 1;
    }

    await prisma.socialConnection.update({
      where: { id: conn.id },
      data: {
        lastSyncAt: capturedAt,
        lastSyncError: null,
        status: "connected",
      },
    });

    const { cacheStore } = await import("@/lib/cache");
    await cacheStore.delByPrefix(`overview:v1:${input.userId}`);
    await cacheStore.delByPrefix(`analytics:v1:${input.userId}:`);

    return { posts, metrics };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Discord sync failed";
    await prisma.socialConnection.update({
      where: { id: conn.id },
      data: { lastSyncError: message.slice(0, 500), status: "error" },
    });
    throw err;
  }
}
