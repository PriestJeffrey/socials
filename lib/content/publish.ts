import { prisma } from "@/lib/db/prisma";
import { clock } from "@/lib/clock";
import { writeAudit } from "@/lib/audit/log";
import { getMetaConfig } from "@/lib/platforms/instagram/config";
import { getLinkedInConfig } from "@/lib/platforms/linkedin/config";
import { getThreadsConfig } from "@/lib/platforms/threads/config";
import { getTikTokConfig } from "@/lib/platforms/tiktok/config";
import { getYouTubeConfig } from "@/lib/platforms/youtube/config";
import { getPinterestConfig } from "@/lib/platforms/pinterest/config";
import { getBlueskyConfig } from "@/lib/platforms/bluesky/config";
import { getRedditConfig } from "@/lib/platforms/reddit/config";

const PUBLISHABLE = new Set([
  "instagram",
  "facebook",
  "linkedin",
  "threads",
  "tiktok",
  "youtube",
  "pinterest",
  "bluesky",
  "reddit",
]);
const CLAIMABLE = ["draft", "approved", "scheduled", "failed"] as const;

export async function runPublishDraft(input: {
  userId: string;
  draftId: string;
}): Promise<{ postId: string | null }> {
  const draft = await prisma.draft.findFirst({
    where: { id: input.draftId, userId: input.userId },
  });
  if (!draft) throw new Error("Draft not found");
  if (draft.platform === "x") {
    throw new Error("X is copy-only — open /x instead of publishing");
  }
  if (!PUBLISHABLE.has(draft.platform)) {
    throw new Error(`Unsupported publish platform: ${draft.platform}`);
  }
  if (draft.status === "published" && draft.publishedPostId) {
    return { postId: draft.publishedPostId };
  }

  const connection = await prisma.socialConnection.findFirst({
    where: {
      userId: input.userId,
      platform: draft.platform,
      status: "connected",
    },
    orderBy: { updatedAt: "desc" },
  });
  if (!connection) {
    throw new Error(`Connect ${draft.platform} before publishing`);
  }

  const useFixtures =
    draft.platform === "linkedin"
      ? getLinkedInConfig().useFixtures
      : draft.platform === "threads"
        ? getThreadsConfig().useFixtures
        : draft.platform === "tiktok"
          ? getTikTokConfig().useFixtures
          : draft.platform === "youtube"
            ? getYouTubeConfig().useFixtures
            : draft.platform === "pinterest"
              ? getPinterestConfig().useFixtures
              : draft.platform === "bluesky"
                ? getBlueskyConfig().useFixtures
                : draft.platform === "reddit"
                  ? getRedditConfig().useFixtures
                  : getMetaConfig().useFixtures;

  if (!useFixtures) {
    throw new Error(
      "Live Graph/LinkedIn publish is not implemented — enable platform fixtures for local publish, or wait for live API wiring",
    );
  }
  if (!connection.accessTokenEnc) {
    throw new Error("Missing token — reconnect platform");
  }

  const claimed = await prisma.draft.updateMany({
    where: {
      id: draft.id,
      userId: input.userId,
      status: { in: [...CLAIMABLE] },
    },
    data: { status: "publishing", connectionId: connection.id },
  });
  if (claimed.count !== 1) {
    const again = await prisma.draft.findFirst({
      where: { id: draft.id, userId: input.userId },
    });
    if (again?.status === "published" && again.publishedPostId) {
      return { postId: again.publishedPostId };
    }
    throw new Error("Draft is not in a publishable state");
  }

  const platformPostId = `fixture_pub_${draft.id}`;

  try {
    const post = await prisma.post.upsert({
      where: {
        connectionId_platformPostId: {
          connectionId: connection.id,
          platformPostId,
        },
      },
      create: {
        userId: input.userId,
        connectionId: connection.id,
        platformPostId,
        kind: "STATUS",
        caption: draft.body.slice(0, 2000),
        permalink: `https://example.local/${draft.platform}/${draft.id}`,
        publishedAt: clock.now(),
        raw: {
          draftId: draft.id,
          goalTag: draft.goalTag,
          fixture: true,
        },
      },
      update: {
        caption: draft.body.slice(0, 2000),
        publishedAt: clock.now(),
      },
    });

    const finalized = await prisma.draft.updateMany({
      where: {
        id: draft.id,
        userId: input.userId,
        status: "publishing",
      },
      data: {
        status: "published",
        publishedPostId: post.id,
        connectionId: connection.id,
        scheduledAt: null,
      },
    });
    if (finalized.count !== 1) {
      const again = await prisma.draft.findFirst({
        where: { id: draft.id, userId: input.userId },
      });
      if (again?.status === "published" && again.publishedPostId) {
        return { postId: again.publishedPostId };
      }
      throw new Error("Failed to finalize draft publish");
    }

    await writeAudit({
      userId: input.userId,
      action: "content.published",
      metadata: {
        draftId: draft.id,
        platform: draft.platform,
        postId: post.id,
        fixture: true,
      },
    });

    return { postId: post.id };
  } catch (err) {
    await prisma.draft.updateMany({
      where: {
        id: draft.id,
        userId: input.userId,
        status: "publishing",
      },
      data: { status: "failed" },
    });
    throw err;
  }
}
