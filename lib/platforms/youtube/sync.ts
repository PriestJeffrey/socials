import { prisma } from "@/lib/db/prisma";
import { decryptAesGcm } from "@/lib/crypto/aes";
import { clock } from "@/lib/clock";
import { getYouTubeConfig } from "@/lib/platforms/youtube/config";
import {
  fetchYouTubeVideos,
  fixtureYouTubeSyncPayload,
  insightsFromYouTube,
  type YouTubeInsightPoint,
  type YouTubeVideoItem,
} from "@/lib/platforms/youtube/client";

export async function runYouTubeSync(input: {
  userId: string;
  connectionId: string;
}): Promise<{ posts: number; metrics: number }> {
  const conn = await prisma.socialConnection.findFirst({
    where: {
      id: input.connectionId,
      userId: input.userId,
      platform: "youtube",
      status: "connected",
    },
  });
  if (!conn) throw new Error("Connection not found or not connected");

  const cfg = getYouTubeConfig();
  let videos: YouTubeVideoItem[];
  let insights: YouTubeInsightPoint[];

  try {
    if (cfg.useFixtures) {
      const fix = fixtureYouTubeSyncPayload(input.userId);
      videos = fix.videos;
      insights = fix.insights;
    } else {
      if (!conn.accessTokenEnc) {
        throw new Error("Missing access token — reconnect YouTube");
      }
      const packed = await fetchYouTubeVideos(
        decryptAesGcm(conn.accessTokenEnc),
      );
      videos = packed.videos;
      insights = insightsFromYouTube(packed);
    }

    let posts = 0;
    for (const item of videos) {
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
          kind: "VIDEO",
          caption: item.description ?? item.title ?? null,
          permalink: item.permalink ?? null,
          publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
          raw: item as object,
        },
        update: {
          kind: "VIDEO",
          caption: item.description ?? item.title ?? null,
          permalink: item.permalink ?? null,
          publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
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
          platform: "youtube",
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
    const message = err instanceof Error ? err.message : "YouTube sync failed";
    await prisma.socialConnection.update({
      where: { id: conn.id },
      data: { lastSyncError: message.slice(0, 500), status: "error" },
    });
    throw err;
  }
}
