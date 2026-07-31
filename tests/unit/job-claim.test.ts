import { beforeEach, describe, expect, it, vi } from "vitest";

const queryRaw = vi.fn();
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $queryRaw: (...args: unknown[]) => queryRaw(...args),
  },
}));

vi.mock("@/lib/clock", () => ({
  clock: {
    now: () => new Date("2026-07-31T12:00:00.000Z"),
  },
}));

import { DbJobRunner } from "@/lib/jobs";

describe("DbJobRunner.claim", () => {
  beforeEach(() => {
    queryRaw.mockReset();
  });

  it("returns empty when limit is non-positive", async () => {
    const runner = new DbJobRunner();
    expect(await runner.claim(0)).toEqual([]);
    expect(await runner.claim(-1)).toEqual([]);
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it("claims via one atomic UPDATE … RETURNING (no findMany race)", async () => {
    queryRaw.mockResolvedValue([
      {
        id: "job1",
        userId: "u1",
        type: "sync",
        payload: { platform: "instagram" },
        attempts: 2,
      },
    ]);

    const claimed = await new DbJobRunner().claim(5);

    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(claimed).toEqual([
      {
        id: "job1",
        userId: "u1",
        type: "sync",
        payload: { platform: "instagram" },
        attempts: 2,
      },
    ]);
  });

  it("still issues a single raw claim when scoped by userId", async () => {
    queryRaw.mockResolvedValue([]);
    await new DbJobRunner().claim(3, "user-a");
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });
});
