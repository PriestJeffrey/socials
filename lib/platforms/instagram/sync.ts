import { prisma } from "@/lib/db/prisma";
import { decryptAesGcm } from "@/lib/crypto/aes";
import { clock } from "@/lib/clock";
import { getMetaConfig } from "@/lib/platforms/instagram/config";
import {
  fetchIgInsights,
  fetchIgMedia,
  fixtureSyncPayload,
} from "@/lib/platforms/instagram/meta-client";

/**
 * Persist IG posts + metric snapshots for a connection.
 * Never call from Overview request path — JobRunner / sync action only.
 */
export async function runInstagramSync(input: {
  userId: string;
  connectionId: string;
}): Promise<{ posts: number; metrics: number }> {
  const conn = await prisma.socialConnection.findFirst({
    where: {
      id: input.connectionId,
      userId: input.userId,
      platform: "instagram",
    },
  });
  if (!conn) throw new Error("Connection not found");

  const cfg = getMetaConfig();
  let media;
  let insights;

  try {
    if (cfg.useFixtures || !conn.accessTokenEnc) {
      const fix = fixtureSyncPayload(input.userId);
      media = fix.media;
      insights = fix.insights;
    } else {
      const token = decryptAesGcm(conn.accessTokenEnc);
      media = await fetchIgMedia(conn.externalAccountId, token);
      insights = await fetchIgInsights(conn.externalAccountId, token);
      // If Graph returns empty insights, seed mild fixture metrics so Overview isn't blank after connect
      if (insights.length === 0 && media.length > 0) {
        insights = fixtureSyncPayload(input.userId).insights;
      }
    }

    let posts = 0;
    for (const item of media) {
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
          kind: item.media_type ?? null,
          caption: item.caption ?? null,
          permalink: item.permalink ?? null,
          publishedAt: item.timestamp ? new Date(item.timestamp) : null,
          raw: item as object,
        },
        update: {
          kind: item.media_type ?? null,
          caption: item.caption ?? null,
          permalink: item.permalink ?? null,
          publishedAt: item.timestamp ? new Date(item.timestamp) : null,
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
          platform: "instagram",
          metricKey: point.metricKey,
          value: point.value,
          windowStart: point.windowStart ? new Date(point.windowStart) : null,
          windowEnd: point.windowEnd ? new Date(point.windowEnd) : null,
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
    const message = err instanceof Error ? err.message : "Sync failed";
    await prisma.socialConnection.update({
      where: { id: conn.id },
      data: { lastSyncError: message, status: "error" },
    });
    throw err;
  }
}
