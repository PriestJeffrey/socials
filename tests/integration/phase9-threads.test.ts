import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createOAuthState } from "@/lib/platforms/oauth-state";
import { threadsAdapter } from "@/lib/platforms/threads/adapter";
import { runThreadsSync } from "@/lib/platforms/threads/sync";
import { readOverview } from "@/lib/analytics/pipeline";
import { getHealthReport } from "@/lib/health/types";
import { listAdapters, oauthPlatforms } from "@/lib/platforms";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.runIf(hasDb)("phase 9 Threads", () => {
  const suffix = Date.now();
  const email = `p9-${suffix}@example.com`;
  let userId = "";
  let connectionId = "";

  beforeAll(async () => {
    process.env.THREADS_USE_FIXTURES = "true";
    process.env.SESSION_SECRET =
      process.env.SESSION_SECRET ?? "test-session-secret-min-32-characters-long";
    process.env.TOKEN_ENCRYPTION_KEY =
      process.env.TOKEN_ENCRYPTION_KEY ??
      Buffer.from("0123456789abcdef0123456789abcdef").toString("base64");

    const passwordHash = await hashPassword("password123");
    userId = (
      await prisma.user.create({ data: { email, passwordHash } })
    ).id;

    connectionId = (
      await threadsAdapter.handleOAuthCallback(userId, {
        code: "fixture_threads_code",
        state: createOAuthState(userId).state,
      })
    ).connectionId;
    await runThreadsSync({ userId, connectionId });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  });

  it("registers Threads in adapters and oauth platforms", () => {
    expect(listAdapters().map((a) => a.id)).toContain("threads");
    expect(oauthPlatforms().some((a) => a.id === "threads")).toBe(true);
  });

  it("sync fills Overview with Threads cards", async () => {
    const board = await readOverview(userId);
    expect(board.empty).toBe(false);
    const th = [...board.wins, ...board.issues].filter(
      (c) => c.platform === "threads",
    );
    expect(th.length).toBeGreaterThan(0);
  });

  it("Health includes Threads ok", async () => {
    const report = await getHealthReport(userId);
    expect(report.phase).toBe(9);
    expect(report.subsystems.find((s) => s.id === "threads")?.status).toBe(
      "ok",
    );
  });

  it("disconnect clears Threads snapshots", async () => {
    await threadsAdapter.disconnect(userId, connectionId);
    expect(
      await prisma.metricSnapshot.count({ where: { connectionId } }),
    ).toBe(0);
  });
});
