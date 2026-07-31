import { prisma } from "@/lib/db/prisma";
import { clock } from "@/lib/clock";
import type { JobPayload, JobQueue, JobType } from "./types";

export type { JobPayload, JobQueue, JobType } from "./types";

export interface JobRecord {
  id: string;
  userId: string;
  type: string;
  payload: JobPayload;
  attempts: number;
}

export interface JobRunner {
  claim(limit: number, userId?: string): Promise<JobRecord[]>;
  markDone(id: string): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
}

/** Local/tests stub - no persistence. */
export class NoopJobQueue implements JobQueue {
  async enqueue(_input: {
    userId: string;
    type: JobType;
    payload: JobPayload;
    idempotencyKey?: string;
    runAfter?: Date;
  }): Promise<{ id: string; deduped: boolean }> {
    return { id: `noop_${crypto.randomUUID()}`, deduped: false };
  }
}

export class NoopJobRunner implements JobRunner {
  async claim(_limit: number, _userId?: string): Promise<JobRecord[]> {
    return [];
  }
  async markDone(_id: string): Promise<void> {}
  async markFailed(_id: string, _error: string): Promise<void> {}
}

/** Persists jobs for Phase 1+ workers. Dedupes on idempotencyKey. */
export class DbJobQueue implements JobQueue {
  async enqueue(input: {
    userId: string;
    type: JobType;
    payload: JobPayload;
    idempotencyKey?: string;
    runAfter?: Date;
  }): Promise<{ id: string; deduped: boolean }> {
    if (input.idempotencyKey) {
      const existing = await prisma.job.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing) return { id: existing.id, deduped: true };
    }

    try {
      const job = await prisma.job.create({
        data: {
          userId: input.userId,
          type: input.type,
          payload: input.payload as object,
          idempotencyKey: input.idempotencyKey,
          runAfter: input.runAfter ?? clock.now(),
          status: "pending",
        },
      });
      return { id: job.id, deduped: false };
    } catch (err) {
      if (
        input.idempotencyKey &&
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code?: string }).code === "P2002"
      ) {
        const existing = await prisma.job.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
        });
        if (existing) return { id: existing.id, deduped: true };
      }
      throw err;
    }
  }
}

type ClaimedJobRow = {
  id: string;
  userId: string;
  type: string;
  payload: unknown;
  attempts: number;
};

export class DbJobRunner implements JobRunner {
  /**
   * Atomically claim due jobs (Postgres `FOR UPDATE SKIP LOCKED`).
   * Avoids findMany→updateMany under-claim / double-select under concurrent cron.
   * Redis/external queue still deferred for multi-instance rate-limit/backpressure.
   */
  async claim(limit: number, userId?: string): Promise<JobRecord[]> {
    if (limit <= 0) return [];
    const now = clock.now();
    const rows = userId
      ? await prisma.$queryRaw<ClaimedJobRow[]>`
          UPDATE "Job" AS j
          SET
            status = 'running',
            "lockedAt" = ${now},
            attempts = j.attempts + 1,
            "updatedAt" = ${now}
          FROM (
            SELECT id
            FROM "Job"
            WHERE status = 'pending'
              AND "runAfter" <= ${now}
              AND "userId" = ${userId}
            ORDER BY "runAfter" ASC
            LIMIT ${limit}
            FOR UPDATE SKIP LOCKED
          ) AS picked
          WHERE j.id = picked.id
          RETURNING j.id, j."userId", j.type, j.payload, j.attempts
        `
      : await prisma.$queryRaw<ClaimedJobRow[]>`
          UPDATE "Job" AS j
          SET
            status = 'running',
            "lockedAt" = ${now},
            attempts = j.attempts + 1,
            "updatedAt" = ${now}
          FROM (
            SELECT id
            FROM "Job"
            WHERE status = 'pending'
              AND "runAfter" <= ${now}
            ORDER BY "runAfter" ASC
            LIMIT ${limit}
            FOR UPDATE SKIP LOCKED
          ) AS picked
          WHERE j.id = picked.id
          RETURNING j.id, j."userId", j.type, j.payload, j.attempts
        `;

    return rows.map((job) => ({
      id: job.id,
      userId: job.userId,
      type: job.type,
      payload: job.payload as JobPayload,
      attempts: job.attempts,
    }));
  }

  async markDone(id: string): Promise<void> {
    await prisma.job.updateMany({
      where: { id },
      data: { status: "done", completedAt: clock.now(), lastError: null },
    });
  }

  async markFailed(id: string, error: string): Promise<void> {
    await prisma.job.updateMany({
      where: { id },
      data: { status: "failed", lastError: error, completedAt: clock.now() },
    });
  }
}

function createQueue(): JobQueue {
  const backend = process.env.JOB_BACKEND ?? "db";
  if (backend === "noop" || backend === "memory") return new NoopJobQueue();
  return new DbJobQueue();
}

function createRunner(): JobRunner {
  const backend = process.env.JOB_BACKEND ?? "db";
  if (backend === "noop" || backend === "memory") return new NoopJobRunner();
  return new DbJobRunner();
}

export const jobQueue: JobQueue = createQueue();
export const jobRunner: JobRunner = createRunner();
