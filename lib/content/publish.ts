import { prisma } from "@/lib/db/prisma";
import { clock } from "@/lib/clock";
import { writeAudit } from "@/lib/audit/log";
import { decryptAesGcm } from "@/lib/crypto/aes";
import { getMetaConfig } from "@/lib/platforms/instagram/config";
import { getLinkedInConfig } from "@/lib/platforms/linkedin/config";
import { publishIgMedia } from "@/lib/platforms/instagram/meta-client";
import { publishFbPagePost } from "@/lib/platforms/facebook/meta-client";
import { publishLinkedInUgcPost } from "@/lib/platforms/linkedin/client";
import { assertPublicHttpsMediaUrl } from "@/lib/security/public-media-url";
import { toSafeErrorMessage } from "@/lib/security/redact-error";

const PUBLISHABLE = new Set(["instagram", "facebook", "linkedin"]);
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
    throw new Error("X is copy-only - open /x instead of publishing");
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
  if (!connection.accessTokenEnc) {
    throw new Error("Missing token - reconnect platform");
  }

  const useFixtures =
    draft.platform === "linkedin"
      ? getLinkedInConfig().useFixtures
      : getMetaConfig().useFixtures;

  if (!useFixtures && draft.platform === "instagram") {
    if (!draft.mediaUrl?.trim()) {
      throw new Error(
        "Live Instagram publish needs a public https image or video URL (media URL)",
      );
    }
    assertPublicHttpsMediaUrl(draft.mediaUrl);
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

  try {
    let platformPostId: string;
    let permalink: string | undefined;
    let kind = "STATUS";

    if (useFixtures) {
      platformPostId = `fixture_pub_${draft.id}`;
      permalink = `https://example.local/${draft.platform}/${draft.id}`;
    } else if (draft.externalPublishId) {
      // Live API already succeeded on a prior attempt - finalize only (no duplicate).
      platformPostId = draft.externalPublishId;
      kind = draft.platform === "instagram" ? "MEDIA" : "STATUS";
    } else {
      const accessToken = decryptAesGcm(connection.accessTokenEnc);
      if (draft.platform === "instagram") {
        const mediaUrl = assertPublicHttpsMediaUrl(draft.mediaUrl!);
        const live = await publishIgMedia({
          igUserId: connection.externalAccountId,
          accessToken,
          caption: draft.body,
          mediaUrl,
        });
        platformPostId = live.platformPostId;
        permalink = live.permalink;
        kind = "MEDIA";
      } else if (draft.platform === "facebook") {
        const live = await publishFbPagePost({
          pageId: connection.externalAccountId,
          accessToken,
          message: draft.body,
        });
        platformPostId = live.platformPostId;
        permalink = live.permalink;
      } else {
        const live = await publishLinkedInUgcPost({
          accessToken,
          authorId: connection.externalAccountId,
          commentary: draft.body,
        });
        platformPostId = live.platformPostId;
      }

      // Persist platform id before local finalize so retries do not double-post.
      await prisma.draft.update({
        where: { id: draft.id },
        data: { externalPublishId: platformPostId },
      });
    }

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
        kind,
        caption: draft.body.slice(0, 2000),
        permalink: permalink ?? null,
        publishedAt: clock.now(),
        raw: {
          draftId: draft.id,
          goalTag: draft.goalTag,
          fixture: useFixtures,
          mediaUrl: draft.mediaUrl ?? null,
        },
      },
      update: {
        caption: draft.body.slice(0, 2000),
        permalink: permalink ?? undefined,
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
        fixture: useFixtures,
        platformPostId,
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
    throw new Error(toSafeErrorMessage(err));
  }
}
