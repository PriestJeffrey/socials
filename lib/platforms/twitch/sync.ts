import { prisma } from "@/lib/db/prisma";
import { decryptAesGcm } from "@/lib/crypto/aes";
import { clock } from "@/lib/clock";
import { getTwitchConfig } from "@/lib/platforms/twitch/config";
import {
  fetchTwitchVideos,
  fixtureTwitchSyncPayload,
  insightsFromTwitchVideos,
  type TwitchInsightPoint,
  type TwitchVideoItem,
} from "@/lib/platforms/twitch/client";

export async function runTwitchSync(input: {
  userId: string;
  connectionId: string;
}): Promise<{ posts: number; metrics: number }> {
  const conn = await prisma.socialConnection.findFirst({
    where: {
      id: input.connectionId,
      userId: input.userId,
      platform: "twitch",
      status: "connected",
    },
  });
  if (!conn) throw new Error("Connection not found or not connected");

  const cfg = getTwitchConfig();
  let videos: TwitchVideoItem[];
  let insights: TwitchInsightPoint[];

  try {
    if (cfg.useFixtures) {
      const fix = fixtureTwitchSyncPayload(input.userId);
      videos = fix.videos;
      insights = fix.insights;
    } else {
      if (!conn.accessTokenEnc) {
        throw new Error("Missing access token — reconnect Twitch");
      }
      const token = decryptAesGcm(conn.accessTokenEnc);
      videos = await fetchTwitchVideos(token, conn.externalAccountId);
      insights = insightsFromTwitchVideos(videos);
    }

    let posts = 0;
    for (const item of videos) {
      const caption = [item.title, item.description].filter(Boolean).join("\n\n");
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
          kind: item.type?.toUpperCase() ?? "VIDEO",
          caption: caption || null,
          permalink: item.url ?? null,
          publishedAt: item.createdAt ? new Date(item.createdAt) : null,
          raw: item as object,
        },
        update: {
          kind: item.type?.toUpperCase() ?? "VIDEO",
          caption: caption || null,
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
          platform: "twitch",
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
    const message = err instanceof Error ? err.message : "Twitch sync failed";
    await prisma.socialConnection.update({
      where: { id: conn.id },
      data: { lastSyncError: message.slice(0, 500), status: "error" },
    });
    throw err;
  }
}
