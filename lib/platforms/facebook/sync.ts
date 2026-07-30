import { prisma } from "@/lib/db/prisma";
import { decryptAesGcm } from "@/lib/crypto/aes";
import { clock } from "@/lib/clock";
import { getMetaConfig } from "@/lib/platforms/facebook/config";
import {
  fetchFbInsights,
  fetchFbPosts,
  fixtureFbSyncPayload,
  type FbInsightPoint,
  type FbPostItem,
} from "@/lib/platforms/facebook/meta-client";

/**
 * Persist FB posts + metric snapshots for a connection.
 * Never call from Overview request path.
 */
export async function runFacebookSync(input: {
  userId: string;
  connectionId: string;
}): Promise<{ posts: number; metrics: number }> {
  const conn = await prisma.socialConnection.findFirst({
    where: {
      id: input.connectionId,
      userId: input.userId,
      platform: "facebook",
      status: "connected",
    },
  });
  if (!conn) throw new Error("Connection not found or not connected");

  const cfg = getMetaConfig();
  let postsData: FbPostItem[];
  let insights: FbInsightPoint[];

  try {
    if (cfg.useFixtures) {
      const fix = fixtureFbSyncPayload(input.userId);
      postsData = fix.posts;
      insights = fix.insights;
    } else {
      if (!conn.accessTokenEnc) {
        throw new Error("Missing access token — reconnect Facebook");
      }
      const token = decryptAesGcm(conn.accessTokenEnc);
      postsData = await fetchFbPosts(conn.externalAccountId, token);
      insights = await fetchFbInsights(conn.externalAccountId, token);
    }

    let posts = 0;
    for (const item of postsData) {
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
          kind: "STATUS",
          caption: item.message ?? null,
          permalink: item.permalink_url ?? null,
          publishedAt: item.created_time ? new Date(item.created_time) : null,
          raw: item as object,
        },
        update: {
          caption: item.message ?? null,
          permalink: item.permalink_url ?? null,
          publishedAt: item.created_time ? new Date(item.created_time) : null,
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
          platform: "facebook",
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
