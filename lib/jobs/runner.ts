import { jobRunner } from "@/lib/jobs";
import { runInstagramSync } from "@/lib/platforms/instagram/sync";
import { runFacebookSync } from "@/lib/platforms/facebook/sync";
import { runLinkedInSync } from "@/lib/platforms/linkedin/sync";
import { runThreadsSync } from "@/lib/platforms/threads/sync";
import { runTikTokSync } from "@/lib/platforms/tiktok/sync";
import { runYouTubeSync } from "@/lib/platforms/youtube/sync";
import { runPinterestSync } from "@/lib/platforms/pinterest/sync";
import { runBlueskySync } from "@/lib/platforms/bluesky/sync";
import { runRedditSync } from "@/lib/platforms/reddit/sync";
import { runMastodonSync } from "@/lib/platforms/mastodon/sync";
import { runTumblrSync } from "@/lib/platforms/tumblr/sync";
import { runTwitchSync } from "@/lib/platforms/twitch/sync";
import { runDiscordSync } from "@/lib/platforms/discord/sync";
import { runPublishDraft } from "@/lib/content/publish";
import { prisma } from "@/lib/db/prisma";
import { log, createRequestId } from "@/lib/logging/logger";

/** Claim pending jobs and run handlers. Pass userId to scope to one tenant. */
export async function processPendingJobs(
  limit = 5,
  userId?: string,
): Promise<number> {
  const requestId = createRequestId();
  const claimed = await jobRunner.claim(limit, userId);
  let done = 0;

  for (const job of claimed) {
    try {
      if (job.type === "sync" && job.payload.platform === "instagram") {
        const connectionId = String(job.payload.connectionId ?? "");
        if (!connectionId) throw new Error("Missing connectionId");
        await runInstagramSync({ userId: job.userId, connectionId });
      } else if (job.type === "sync" && job.payload.platform === "facebook") {
        const connectionId = String(job.payload.connectionId ?? "");
        if (!connectionId) throw new Error("Missing connectionId");
        await runFacebookSync({ userId: job.userId, connectionId });
      } else if (job.type === "sync" && job.payload.platform === "linkedin") {
        const connectionId = String(job.payload.connectionId ?? "");
        if (!connectionId) throw new Error("Missing connectionId");
        await runLinkedInSync({ userId: job.userId, connectionId });
      } else if (job.type === "sync" && job.payload.platform === "threads") {
        const connectionId = String(job.payload.connectionId ?? "");
        if (!connectionId) throw new Error("Missing connectionId");
        await runThreadsSync({ userId: job.userId, connectionId });
      } else if (job.type === "sync" && job.payload.platform === "tiktok") {
        const connectionId = String(job.payload.connectionId ?? "");
        if (!connectionId) throw new Error("Missing connectionId");
        await runTikTokSync({ userId: job.userId, connectionId });
      } else if (job.type === "sync" && job.payload.platform === "youtube") {
        const connectionId = String(job.payload.connectionId ?? "");
        if (!connectionId) throw new Error("Missing connectionId");
        await runYouTubeSync({ userId: job.userId, connectionId });
      } else if (job.type === "sync" && job.payload.platform === "pinterest") {
        const connectionId = String(job.payload.connectionId ?? "");
        if (!connectionId) throw new Error("Missing connectionId");
        await runPinterestSync({ userId: job.userId, connectionId });
      } else if (job.type === "sync" && job.payload.platform === "bluesky") {
        const connectionId = String(job.payload.connectionId ?? "");
        if (!connectionId) throw new Error("Missing connectionId");
        await runBlueskySync({ userId: job.userId, connectionId });
      } else if (job.type === "sync" && job.payload.platform === "reddit") {
        const connectionId = String(job.payload.connectionId ?? "");
        if (!connectionId) throw new Error("Missing connectionId");
        await runRedditSync({ userId: job.userId, connectionId });
      } else if (job.type === "sync" && job.payload.platform === "mastodon") {
        const connectionId = String(job.payload.connectionId ?? "");
        if (!connectionId) throw new Error("Missing connectionId");
        await runMastodonSync({ userId: job.userId, connectionId });
      } else if (job.type === "sync" && job.payload.platform === "tumblr") {
        const connectionId = String(job.payload.connectionId ?? "");
        if (!connectionId) throw new Error("Missing connectionId");
        await runTumblrSync({ userId: job.userId, connectionId });
      } else if (job.type === "sync" && job.payload.platform === "twitch") {
        const connectionId = String(job.payload.connectionId ?? "");
        if (!connectionId) throw new Error("Missing connectionId");
        await runTwitchSync({ userId: job.userId, connectionId });
      } else if (job.type === "sync" && job.payload.platform === "discord") {
        const connectionId = String(job.payload.connectionId ?? "");
        if (!connectionId) throw new Error("Missing connectionId");
        await runDiscordSync({ userId: job.userId, connectionId });
      } else if (job.type === "publish") {
        const draftId = String(job.payload.draftId ?? "");
        if (!draftId) throw new Error("Missing draftId");
        await runPublishDraft({ userId: job.userId, draftId });
      } else {
        throw new Error(`Unsupported job type: ${job.type}`);
      }
      await jobRunner.markDone(job.id);
      done += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : "job failed";
      await jobRunner.markFailed(job.id, message);
      if (job.type === "publish" && job.payload.draftId) {
        await prisma.draft.updateMany({
          where: {
            id: String(job.payload.draftId),
            userId: job.userId,
            status: { in: ["draft", "scheduled", "publishing", "failed"] },
          },
          data: { status: "failed" },
        });
      }
      log({
        phase: 5,
        component: "jobs.runner",
        level: "error",
        message: "job failed",
        requestId,
        userId: job.userId,
        meta: { jobId: job.id, error: message },
      });
    }
  }

  return done;
}
