import { jobRunner } from "@/lib/jobs";
import { runInstagramSync } from "@/lib/platforms/instagram/sync";
import { runFacebookSync } from "@/lib/platforms/facebook/sync";
import { runLinkedInSync } from "@/lib/platforms/linkedin/sync";
import { runPublishDraft } from "@/lib/content/publish";
import { prisma } from "@/lib/db/prisma";
import { log, createRequestId } from "@/lib/logging/logger";
import { toSafeErrorMessage } from "@/lib/security/redact-error";

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
      const message = toSafeErrorMessage(err, "job failed");
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
