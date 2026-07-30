/** Only types the runner implements. Add new kinds when handlers ship. */
export type JobType = "sync" | "publish";

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
