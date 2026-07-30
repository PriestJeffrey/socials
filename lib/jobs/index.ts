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

/** Local/tests stub — no persistence. */
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

export class DbJobRunner implements JobRunner {
  async claim(limit: number, userId?: string): Promise<JobRecord[]> {
    const now = clock.now();
    const pending = await prisma.job.findMany({
      where: {
        status: "pending",
        runAfter: { lte: now },
        ...(userId ? { userId } : {}),
      },
      orderBy: { runAfter: "asc" },
      take: limit,
    });

    const claimed: JobRecord[] = [];
    for (const job of pending) {
      const updated = await prisma.job.updateMany({
        where: { id: job.id, status: "pending" },
        data: {
          status: "running",
          lockedAt: now,
          attempts: { increment: 1 },
        },
      });
      if (updated.count === 1) {
        claimed.push({
          id: job.id,
          userId: job.userId,
          type: job.type,
          payload: job.payload as JobPayload,
          attempts: job.attempts + 1,
        });
      }
    }
    return claimed;
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
