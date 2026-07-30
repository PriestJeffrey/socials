import { describe, expect, it } from "vitest";
import { fixtureAiProvider } from "@/lib/ai/providers/fixture";
import { MemoryRateLimiter } from "@/lib/rate-limit";
import { SystemClock } from "@/lib/clock";

describe("ai fixture provider", () => {
  it("returns competitor JSON-shaped text", async () => {
    const res = await fixtureAiProvider.complete({
      system: "competitor hook analysis",
      user: "sample caption about growth",
    });
    expect(res.provider).toBe("fixture");
    expect(res.text).toContain("hook");
  });

  it("returns draft text", async () => {
    const res = await fixtureAiProvider.complete({
      system: "compose a draft",
      user: "platform=instagram",
    });
    expect(res.text.toLowerCase()).toContain("fixture draft");
  });
});

describe("ai rate limiter key", () => {
  it("trips after limit", async () => {
    const rl = new MemoryRateLimiter(new SystemClock());
    const key = `ai:test-${Date.now()}`;
    for (let i = 0; i < 3; i++) {
      expect((await rl.check(key, 3, 60_000)).ok).toBe(true);
    }
    const blocked = await rl.check(key, 3, 60_000);
    expect(blocked.ok).toBe(false);
  });
});
