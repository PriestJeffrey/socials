import { jobRunner } from "@/lib/jobs";
import { runInstagramSync } from "@/lib/platforms/instagram/sync";
import { runFacebookSync } from "@/lib/platforms/facebook/sync";
import { log, createRequestId } from "@/lib/logging/logger";

/** Claim pending jobs and run handlers. Safe to call from route or after connect. */
export async function processPendingJobs(limit = 5): Promise<number> {
  const requestId = createRequestId();
  const claimed = await jobRunner.claim(limit);
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
      } else {
        throw new Error(`Unsupported job type: ${job.type}`);
      }
      await jobRunner.markDone(job.id);
      done += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : "job failed";
      await jobRunner.markFailed(job.id, message);
      log({
        phase: 2,
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
