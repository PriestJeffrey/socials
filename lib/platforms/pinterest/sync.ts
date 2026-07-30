import { prisma } from "@/lib/db/prisma";
import { decryptAesGcm } from "@/lib/crypto/aes";
import { clock } from "@/lib/clock";
import { getPinterestConfig } from "@/lib/platforms/pinterest/config";
import {
  fetchPinterestPins,
  fixturePinterestSyncPayload,
  insightsFromPins,
  type PinterestInsightPoint,
  type PinterestPinItem,
} from "@/lib/platforms/pinterest/client";

export async function runPinterestSync(input: {
  userId: string;
  connectionId: string;
}): Promise<{ posts: number; metrics: number }> {
  const conn = await prisma.socialConnection.findFirst({
    where: {
      id: input.connectionId,
      userId: input.userId,
      platform: "pinterest",
      status: "connected",
    },
  });
  if (!conn) throw new Error("Connection not found or not connected");

  const cfg = getPinterestConfig();
  let pins: PinterestPinItem[];
  let insights: PinterestInsightPoint[];

  try {
    if (cfg.useFixtures) {
      const fix = fixturePinterestSyncPayload(input.userId);
      pins = fix.pins;
      insights = fix.insights;
    } else {
      if (!conn.accessTokenEnc) {
        throw new Error("Missing access token — reconnect Pinterest");
      }
      pins = await fetchPinterestPins(decryptAesGcm(conn.accessTokenEnc));
      insights = insightsFromPins(pins);
    }

    let posts = 0;
    for (const item of pins) {
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
          kind: "PIN",
          caption: item.description ?? item.title ?? null,
          permalink: item.link ?? null,
          publishedAt: item.createdAt ? new Date(item.createdAt) : null,
          raw: item as object,
        },
        update: {
          kind: "PIN",
          caption: item.description ?? item.title ?? null,
          permalink: item.link ?? null,
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
          platform: "pinterest",
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
    const message =
      err instanceof Error ? err.message : "Pinterest sync failed";
    await prisma.socialConnection.update({
      where: { id: conn.id },
      data: { lastSyncError: message.slice(0, 500), status: "error" },
    });
    throw err;
  }
}
