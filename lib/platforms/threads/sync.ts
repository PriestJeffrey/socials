import { prisma } from "@/lib/db/prisma";
import { decryptAesGcm } from "@/lib/crypto/aes";
import { clock } from "@/lib/clock";
import { getThreadsConfig } from "@/lib/platforms/threads/config";
import {
  fetchThreadsInsights,
  fetchThreadsMedia,
  fixtureThreadsSyncPayload,
  type ThreadsInsightPoint,
  type ThreadsMediaItem,
} from "@/lib/platforms/threads/client";

export async function runThreadsSync(input: {
  userId: string;
  connectionId: string;
}): Promise<{ posts: number; metrics: number }> {
  const conn = await prisma.socialConnection.findFirst({
    where: {
      id: input.connectionId,
      userId: input.userId,
      platform: "threads",
      status: "connected",
    },
  });
  if (!conn) throw new Error("Connection not found or not connected");

  const cfg = getThreadsConfig();
  let media: ThreadsMediaItem[];
  let insights: ThreadsInsightPoint[];

  try {
    if (cfg.useFixtures) {
      const fix = fixtureThreadsSyncPayload(input.userId);
      media = fix.media;
      insights = fix.insights;
    } else {
      if (!conn.accessTokenEnc) {
        throw new Error("Missing access token — reconnect Threads");
      }
      const token = decryptAesGcm(conn.accessTokenEnc);
      media = await fetchThreadsMedia(conn.externalAccountId, token);
      insights = await fetchThreadsInsights(conn.externalAccountId, token);
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
          caption: item.text ?? null,
          permalink: item.permalink ?? null,
          publishedAt: item.timestamp ? new Date(item.timestamp) : null,
          raw: item as object,
        },
        update: {
          kind: item.media_type ?? null,
          caption: item.text ?? null,
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
          platform: "threads",
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
    const message = err instanceof Error ? err.message : "Threads sync failed";
    await prisma.socialConnection.update({
      where: { id: conn.id },
      data: { lastSyncError: message.slice(0, 500), status: "error" },
    });
    throw err;
  }
}
