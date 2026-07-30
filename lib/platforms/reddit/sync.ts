import { prisma } from "@/lib/db/prisma";
import { decryptAesGcm } from "@/lib/crypto/aes";
import { clock } from "@/lib/clock";
import { getRedditConfig } from "@/lib/platforms/reddit/config";
import {
  fetchRedditSubmitted,
  fixtureRedditSyncPayload,
  insightsFromRedditPosts,
  type RedditInsightPoint,
  type RedditPostItem,
} from "@/lib/platforms/reddit/client";

export async function runRedditSync(input: {
  userId: string;
  connectionId: string;
}): Promise<{ posts: number; metrics: number }> {
  const conn = await prisma.socialConnection.findFirst({
    where: {
      id: input.connectionId,
      userId: input.userId,
      platform: "reddit",
      status: "connected",
    },
  });
  if (!conn) throw new Error("Connection not found or not connected");

  const cfg = getRedditConfig();
  let postsData: RedditPostItem[];
  let insights: RedditInsightPoint[];

  try {
    if (cfg.useFixtures) {
      const fix = fixtureRedditSyncPayload(input.userId);
      postsData = fix.posts;
      insights = fix.insights;
    } else {
      if (!conn.accessTokenEnc) {
        throw new Error("Missing access token — reconnect Reddit");
      }
      const token = decryptAesGcm(conn.accessTokenEnc);
      const name = conn.displayName ?? conn.externalAccountId;
      postsData = await fetchRedditSubmitted(token, name);
      insights = insightsFromRedditPosts(postsData);
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
          kind: "LINK",
          caption: item.selftext
            ? `${item.title ?? ""}\n\n${item.selftext}`.trim()
            : item.title ?? null,
          permalink: item.permalink ?? null,
          publishedAt: item.createdUtc
            ? new Date(item.createdUtc * 1000)
            : null,
          raw: item as object,
        },
        update: {
          kind: "LINK",
          caption: item.selftext
            ? `${item.title ?? ""}\n\n${item.selftext}`.trim()
            : item.title ?? null,
          permalink: item.permalink ?? null,
          publishedAt: item.createdUtc
            ? new Date(item.createdUtc * 1000)
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
          platform: "reddit",
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
    const message = err instanceof Error ? err.message : "Reddit sync failed";
    await prisma.socialConnection.update({
      where: { id: conn.id },
      data: { lastSyncError: message.slice(0, 500), status: "error" },
    });
    throw err;
  }
}
