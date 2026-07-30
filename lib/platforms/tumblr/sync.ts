import { prisma } from "@/lib/db/prisma";
import { decryptAesGcm } from "@/lib/crypto/aes";
import { clock } from "@/lib/clock";
import { getTumblrConfig } from "@/lib/platforms/tumblr/config";
import {
  fetchTumblrPosts,
  fixtureTumblrSyncPayload,
  insightsFromTumblrPosts,
  type TumblrInsightPoint,
  type TumblrPostItem,
} from "@/lib/platforms/tumblr/client";

function captionFromPost(item: TumblrPostItem): string | null {
  const parts = [item.title, item.summary, item.body].filter(Boolean);
  return parts.length ? parts.join("\n\n") : null;
}

export async function runTumblrSync(input: {
  userId: string;
  connectionId: string;
}): Promise<{ posts: number; metrics: number }> {
  const conn = await prisma.socialConnection.findFirst({
    where: {
      id: input.connectionId,
      userId: input.userId,
      platform: "tumblr",
      status: "connected",
    },
  });
  if (!conn) throw new Error("Connection not found or not connected");

  const cfg = getTumblrConfig();
  let postsData: TumblrPostItem[];
  let insights: TumblrInsightPoint[];

  try {
    if (cfg.useFixtures) {
      const fix = fixtureTumblrSyncPayload(input.userId);
      postsData = fix.posts;
      insights = fix.insights;
    } else {
      if (!conn.accessTokenEnc) {
        throw new Error("Missing access token — reconnect Tumblr");
      }
      const token = decryptAesGcm(conn.accessTokenEnc);
      postsData = await fetchTumblrPosts(token, conn.externalAccountId);
      insights = insightsFromTumblrPosts(postsData);
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
          kind: item.type?.toUpperCase() ?? "TEXT",
          caption: captionFromPost(item),
          permalink: item.postUrl ?? null,
          publishedAt: item.timestamp
            ? new Date(item.timestamp * 1000)
            : null,
          raw: item as object,
        },
        update: {
          kind: item.type?.toUpperCase() ?? "TEXT",
          caption: captionFromPost(item),
          permalink: item.postUrl ?? null,
          publishedAt: item.timestamp
            ? new Date(item.timestamp * 1000)
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
          platform: "tumblr",
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
    const message = err instanceof Error ? err.message : "Tumblr sync failed";
    await prisma.socialConnection.update({
      where: { id: conn.id },
      data: { lastSyncError: message.slice(0, 500), status: "error" },
    });
    throw err;
  }
}
