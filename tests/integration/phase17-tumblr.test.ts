import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createOAuthState } from "@/lib/platforms/oauth-state";
import { tumblrAdapter } from "@/lib/platforms/tumblr/adapter";
import { runTumblrSync } from "@/lib/platforms/tumblr/sync";
import { readOverview } from "@/lib/analytics/pipeline";
import { readPlatformAnalytics } from "@/lib/analytics/platform";
import { getHealthReport } from "@/lib/health/types";
import { listAdapters, oauthPlatforms } from "@/lib/platforms";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.runIf(hasDb)("phase 17 Tumblr", () => {
  const suffix = Date.now();
  const email = `p17-${suffix}@example.com`;
  let userId = "";
  let connectionId = "";

  beforeAll(async () => {
    process.env.TUMBLR_USE_FIXTURES = "true";
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
      await tumblrAdapter.handleOAuthCallback(userId, {
        code: "fixture_tumblr_code",
        state: createOAuthState(userId).state,
      })
    ).connectionId;
    await runTumblrSync({ userId, connectionId });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  });

  it("registers Tumblr in adapters and oauth platforms", () => {
    expect(listAdapters().map((a) => a.id)).toContain("tumblr");
    expect(oauthPlatforms().some((a) => a.id === "tumblr")).toBe(true);
  });

  it("fixture sync fills Overview Tumblr cards", async () => {
    const board = await readOverview(userId);
    expect(board.empty).toBe(false);
    expect(
      board.wins.concat(board.issues).some((c) => c.platform === "tumblr"),
    ).toBe(true);
  });

  it("analytics surfaces Tumblr focus metrics", async () => {
    const analytics = await readPlatformAnalytics(userId, "tumblr");
    expect(analytics.empty).toBe(false);
    expect(analytics.metrics.some((m) => m.key === "notes")).toBe(true);
    expect(analytics.metrics.some((m) => m.key === "avg_notes")).toBe(true);
    expect(analytics.metrics.some((m) => m.key === "engagement_rate")).toBe(
      true,
    );
  });

  it("health reports tumblr + phase 17", async () => {
    const report = await getHealthReport(userId);
    expect(report.phase).toBe(17);
    expect(report.subsystems.find((s) => s.id === "tumblr")?.status).toBe(
      "ok",
    );
  });

  it("disconnect clears Tumblr snapshots", async () => {
    await tumblrAdapter.disconnect(userId, connectionId);
    expect(
      await prisma.metricSnapshot.count({
        where: { userId, platform: "tumblr" },
      }),
    ).toBe(0);
  });
});
