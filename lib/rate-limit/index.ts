import { clock, type Clock } from "@/lib/clock";

export type RateLimitResult = { ok: true } | { ok: false; retryAfterMs: number };

export interface RateLimiter {
  check(key: string, limit: number, windowMs: number): Promise<RateLimitResult>;
}

type Bucket = { count: number; resetAt: number };

export class MemoryRateLimiter implements RateLimiter {
  private buckets = new Map<string, Bucket>();

  constructor(private readonly clockImpl: Clock = clock) {}

  async check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = this.clockImpl.now().getTime();
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      return { ok: true };
    }
    if (bucket.count >= limit) {
      return { ok: false, retryAfterMs: Math.max(0, bucket.resetAt - now) };
    }
    bucket.count += 1;
    return { ok: true };
  }
}

const backend = process.env.RATE_LIMIT_BACKEND ?? "memory";

export const rateLimiter: RateLimiter =
  backend === "memory" ? new MemoryRateLimiter() : new MemoryRateLimiter();
