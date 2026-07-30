import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createOAuthState } from "@/lib/platforms/oauth-state";
import { redditAdapter } from "@/lib/platforms/reddit/adapter";
import { runRedditSync } from "@/lib/platforms/reddit/sync";
import { readOverview } from "@/lib/analytics/pipeline";
import { readPlatformAnalytics } from "@/lib/analytics/platform";
import { getHealthReport } from "@/lib/health/types";
import { listAdapters, oauthPlatforms } from "@/lib/platforms";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.runIf(hasDb)("phase 16 Reddit", () => {
  const suffix = Date.now();
  const email = `p15-${suffix}@example.com`;
  let userId = "";
  let connectionId = "";

  beforeAll(async () => {
    process.env.REDDIT_USE_FIXTURES = "true";
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
      await redditAdapter.handleOAuthCallback(userId, {
        code: "fixture_reddit_code",
        state: createOAuthState(userId).state,
      })
    ).connectionId;
    await runRedditSync({ userId, connectionId });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  });

  it("registers Reddit in adapters and oauth platforms", () => {
    expect(listAdapters().map((a) => a.id)).toContain("reddit");
    expect(oauthPlatforms().some((a) => a.id === "reddit")).toBe(true);
  });

  it("fixture sync fills Overview Reddit cards", async () => {
    const board = await readOverview(userId);
    expect(board.empty).toBe(false);
    expect(
      board.wins.concat(board.issues).some((c) => c.platform === "reddit"),
    ).toBe(true);
  });

  it("analytics surfaces Reddit focus metrics", async () => {
    const analytics = await readPlatformAnalytics(userId, "reddit");
    expect(analytics.empty).toBe(false);
    expect(analytics.metrics.some((m) => m.key === "comments")).toBe(true);
    expect(analytics.metrics.some((m) => m.key === "upvote_ratio")).toBe(true);
    expect(analytics.metrics.some((m) => m.key === "engagement_rate")).toBe(
      true,
    );
  });

  it("health reports reddit + phase 16", async () => {
    const report = await getHealthReport(userId);
    expect(report.phase).toBe(16);
    expect(report.subsystems.find((s) => s.id === "reddit")?.status).toBe(
      "ok",
    );
  });

  it("disconnect clears Reddit snapshots", async () => {
    await redditAdapter.disconnect(userId, connectionId);
    expect(
      await prisma.metricSnapshot.count({
        where: { userId, platform: "reddit" },
      }),
    ).toBe(0);
  });
});
