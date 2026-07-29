import { describe, expect, it } from "vitest";
import { MemoryRateLimiter } from "@/lib/rate-limit";
import { SystemClock } from "@/lib/clock";
import { MemoryCacheStore } from "@/lib/cache";
import { NoopJobQueue, NoopJobRunner } from "@/lib/jobs";

describe("scalability seams", () => {
  it("rate limits after N checks", async () => {
    const limiter = new MemoryRateLimiter(new SystemClock());
    for (let i = 0; i < 5; i++) {
      expect((await limiter.check("signup:1.1.1.1", 5, 60_000)).ok).toBe(true);
    }
    expect((await limiter.check("signup:1.1.1.1", 5, 60_000)).ok).toBe(false);
  });

  it("cache stores and expires by TTL semantics", async () => {
    const cache = new MemoryCacheStore(new SystemClock());
    await cache.set("overview:u1", '{"empty":true}', 60_000);
    expect(await cache.get("overview:u1")).toBe('{"empty":true}');
    await cache.delByPrefix("overview:");
    expect(await cache.get("overview:u1")).toBeNull();
  });

  it("job queue/runner noops exist", async () => {
    const q = new NoopJobQueue();
    const r = new NoopJobRunner();
    const enq = await q.enqueue({
      userId: "u1",
      type: "sync",
      payload: {},
    });
    expect(enq.id).toMatch(/^noop_/);
    expect(await r.claim(1)).toEqual([]);
  });
});
