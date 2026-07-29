export type JobType = "sync" | "publish" | "refresh_token" | "recompute_overview";

export type JobPayload = Record<string, unknown>;

export interface JobQueue {
  enqueue(input: {
    userId: string;
    type: JobType;
    payload: JobPayload;
    idempotencyKey?: string;
    runAfter?: Date;
  }): Promise<{ id: string; deduped: boolean }>;
}
