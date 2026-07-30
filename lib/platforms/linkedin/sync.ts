import { prisma } from "@/lib/db/prisma";
import { clock } from "@/lib/clock";
import { getLinkedInConfig } from "@/lib/platforms/linkedin/config";
import { fixtureLiSyncPayload, allowlistPostRaw } from "@/lib/platforms/linkedin/client";

export async function runLinkedInSync(input: {
  userId: string;
  connectionId: string;
}): Promise<{ posts: number; metrics: number }> {
  const conn = await prisma.socialConnection.findFirst({
    where: {
      id: input.connectionId,
      userId: input.userId,
      platform: "linkedin",
      status: "connected",
    },
  });
  if (!conn) throw new Error("Connection not found or not connected");

  const cfg = getLinkedInConfig();
  let postsData;
  let insights;

  try {
    if (cfg.useFixtures) {
      const fix = fixtureLiSyncPayload(input.userId);
      postsData = fix.posts;
      insights = fix.insights;
    } else {
      // Live analytics depend on product scopes — soft-empty until Human confirms app access
      postsData = [];
      insights = [];
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
          kind: "LINKEDIN",
          caption: item.commentary ?? null,
          permalink: null,
          publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
          raw: allowlistPostRaw(item),
        },
        update: {
          caption: item.commentary ?? null,
          publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
          raw: allowlistPostRaw(item),
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
          platform: "linkedin",
          metricKey: point.metricKey,
          value: point.value,
          windowStart: point.windowStart ? new Date(point.windowStart) : null,
          windowEnd: point.windowEnd ? new Date(point.windowEnd) : null,
          capturedAt,
          raw: { metricKey: point.metricKey, value: point.value },
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
