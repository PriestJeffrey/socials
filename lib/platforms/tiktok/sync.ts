import { prisma } from "@/lib/db/prisma";
import { decryptAesGcm } from "@/lib/crypto/aes";
import { clock } from "@/lib/clock";
import { getTikTokConfig } from "@/lib/platforms/tiktok/config";
import {
  fetchTikTokVideos,
  fixtureTikTokSyncPayload,
  insightsFromVideos,
  type TikTokInsightPoint,
  type TikTokVideoItem,
} from "@/lib/platforms/tiktok/client";

export async function runTikTokSync(input: {
  userId: string;
  connectionId: string;
}): Promise<{ posts: number; metrics: number }> {
  const conn = await prisma.socialConnection.findFirst({
    where: {
      id: input.connectionId,
      userId: input.userId,
      platform: "tiktok",
      status: "connected",
    },
  });
  if (!conn) throw new Error("Connection not found or not connected");

  const cfg = getTikTokConfig();
  let videos: TikTokVideoItem[];
  let insights: TikTokInsightPoint[];

  try {
    if (cfg.useFixtures) {
      const fix = fixtureTikTokSyncPayload(input.userId);
      videos = fix.videos;
      insights = fix.insights;
    } else {
      if (!conn.accessTokenEnc) {
        throw new Error("Missing access token — reconnect TikTok");
      }
      const token = decryptAesGcm(conn.accessTokenEnc);
      videos = await fetchTikTokVideos(token);
      insights = insightsFromVideos(videos);
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
          caption: item.video_description ?? item.title ?? null,
          permalink: item.share_url ?? null,
          publishedAt: item.create_time
            ? new Date(item.create_time * 1000)
            : null,
          raw: item as object,
        },
        update: {
          kind: "VIDEO",
          caption: item.video_description ?? item.title ?? null,
          permalink: item.share_url ?? null,
          publishedAt: item.create_time
            ? new Date(item.create_time * 1000)
            : null,
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
          platform: "tiktok",
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

    return { posts, metrics };
  } catch (err) {
    const message = err instanceof Error ? err.message : "TikTok sync failed";
    await prisma.socialConnection.update({
      where: { id: conn.id },
      data: { lastSyncError: message.slice(0, 500), status: "error" },
    });
    throw err;
  }
}
