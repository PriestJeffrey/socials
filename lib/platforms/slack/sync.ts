import { prisma } from "@/lib/db/prisma";
import { decryptAesGcm } from "@/lib/crypto/aes";
import { clock } from "@/lib/clock";
import { getSlackConfig } from "@/lib/platforms/slack/config";
import {
  fetchSlackConversations,
  fixtureSlackSyncPayload,
  insightsFromSlackLive,
  type SlackInsightPoint,
  type SlackMessageItem,
} from "@/lib/platforms/slack/client";

export async function runSlackSync(input: {
  userId: string;
  connectionId: string;
}): Promise<{ posts: number; metrics: number }> {
  const conn = await prisma.socialConnection.findFirst({
    where: {
      id: input.connectionId,
      userId: input.userId,
      platform: "slack",
      status: "connected",
    },
  });
  if (!conn) throw new Error("Connection not found or not connected");

  const cfg = getSlackConfig();
  let messages: SlackMessageItem[];
  let insights: SlackInsightPoint[];

  try {
    if (cfg.useFixtures) {
      const fix = fixtureSlackSyncPayload(input.userId);
      messages = fix.messages;
      insights = fix.insights;
    } else {
      if (!conn.accessTokenEnc) {
        throw new Error("Missing access token — reconnect Slack");
      }
      const token = decryptAesGcm(conn.accessTokenEnc);
      const channels = await fetchSlackConversations(token);
      messages = [];
      insights = insightsFromSlackLive(channels.length);
    }

    let posts = 0;
    for (const item of messages) {
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
          kind: "TEXT",
          caption: item.content ?? null,
          permalink: item.url ?? null,
          publishedAt: item.createdAt ? new Date(item.createdAt) : null,
          raw: item as object,
        },
        update: {
          kind: "TEXT",
          caption: item.content ?? null,
          permalink: item.url ?? null,
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
          platform: "slack",
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
    const message = err instanceof Error ? err.message : "Slack sync failed";
    await prisma.socialConnection.update({
      where: { id: conn.id },
      data: { lastSyncError: message.slice(0, 500), status: "error" },
    });
    throw err;
  }
}
