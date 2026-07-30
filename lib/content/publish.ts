import { prisma } from "@/lib/db/prisma";
import { clock } from "@/lib/clock";
import { writeAudit } from "@/lib/audit/log";
import { getMetaConfig } from "@/lib/platforms/instagram/config";
import { getLinkedInConfig } from "@/lib/platforms/linkedin/config";

const PUBLISHABLE = new Set(["instagram", "facebook", "linkedin"]);

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
      : getMetaConfig().useFixtures;

  // Live Graph publish deferred — fixtures (or empty live) persist a local Post row for S3 path
  if (!useFixtures && !connection.accessTokenEnc) {
    throw new Error("Missing token — reconnect platform");
  }

  const platformPostId = useFixtures
    ? `fixture_pub_${draft.id}`
    : `local_pub_${draft.id}`;

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
      permalink: useFixtures ? `https://example.local/${draft.platform}/${draft.id}` : null,
      publishedAt: clock.now(),
      raw: {
        draftId: draft.id,
        goalTag: draft.goalTag,
        fixture: useFixtures,
      },
    },
    update: {
      caption: draft.body.slice(0, 2000),
      publishedAt: clock.now(),
    },
  });

  await prisma.draft.update({
    where: { id: draft.id },
    data: {
      status: "published",
      publishedPostId: post.id,
      connectionId: connection.id,
      scheduledAt: null,
    },
  });

  await writeAudit({
    userId: input.userId,
    action: "content.published",
    metadata: {
      draftId: draft.id,
      platform: draft.platform,
      postId: post.id,
      fixture: useFixtures,
    },
  });

  return { postId: post.id };
}
