import { prisma } from "@/lib/db/prisma";
import { decryptAesGcm } from "@/lib/crypto/aes";
import { clock } from "@/lib/clock";
import { getBlueskyConfig } from "@/lib/platforms/bluesky/config";
import {
  fetchBlueskyAuthorFeed,
  fixtureBlueskySyncPayload,
  insightsFromBlueskyPosts,
  type BlueskyInsightPoint,
  type BlueskyPostItem,
} from "@/lib/platforms/bluesky/client";

export async function runBlueskySync(input: {
  userId: string;
  connectionId: string;
}): Promise<{ posts: number; metrics: number }> {
  const conn = await prisma.socialConnection.findFirst({
    where: {
      id: input.connectionId,
      userId: input.userId,
      platform: "bluesky",
      status: "connected",
    },
  });
  if (!conn) throw new Error("Connection not found or not connected");

  const cfg = getBlueskyConfig();
  let postsData: BlueskyPostItem[];
  let insights: BlueskyInsightPoint[];

  try {
    if (cfg.useFixtures) {
      const fix = fixtureBlueskySyncPayload(input.userId);
      postsData = fix.posts;
      insights = fix.insights;
    } else {
      if (!conn.accessTokenEnc) {
        throw new Error("Missing access token — reconnect Bluesky");
      }
      postsData = await fetchBlueskyAuthorFeed({
        accessToken: decryptAesGcm(conn.accessTokenEnc),
        actor: conn.externalAccountId,
      });
      insights = insightsFromBlueskyPosts(postsData);
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
          kind: "POST",
          caption: item.text ?? null,
          permalink: item.permalink ?? null,
          publishedAt: item.createdAt ? new Date(item.createdAt) : null,
          raw: item as object,
        },
        update: {
          kind: "POST",
          caption: item.text ?? null,
          permalink: item.permalink ?? null,
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
          platform: "bluesky",
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
    const message = err instanceof Error ? err.message : "Bluesky sync failed";
    await prisma.socialConnection.update({
      where: { id: conn.id },
      data: { lastSyncError: message.slice(0, 500), status: "error" },
    });
    throw err;
  }
}
