import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createOAuthState } from "@/lib/platforms/oauth-state";
import { twitchAdapter } from "@/lib/platforms/twitch/adapter";
import { runTwitchSync } from "@/lib/platforms/twitch/sync";
import { readOverview } from "@/lib/analytics/pipeline";
import { readPlatformAnalytics } from "@/lib/analytics/platform";
import { getHealthReport } from "@/lib/health/types";
import { listAdapters, oauthPlatforms } from "@/lib/platforms";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.runIf(hasDb)("phase 20 Twitch", () => {
  const suffix = Date.now();
  const email = `p18-${suffix}@example.com`;
  let userId = "";
  let connectionId = "";

  beforeAll(async () => {
    process.env.TWITCH_USE_FIXTURES = "true";
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
      await twitchAdapter.handleOAuthCallback(userId, {
        code: "fixture_twitch_code",
        state: createOAuthState(userId).state,
      })
    ).connectionId;
    await runTwitchSync({ userId, connectionId });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  });

  it("registers Twitch in adapters and oauth platforms", () => {
    expect(listAdapters().map((a) => a.id)).toContain("twitch");
    expect(oauthPlatforms().some((a) => a.id === "twitch")).toBe(true);
  });

  it("fixture sync fills Overview Twitch cards", async () => {
    const board = await readOverview(userId);
    expect(board.empty).toBe(false);
    expect(
      board.wins.concat(board.issues).some((c) => c.platform === "twitch"),
    ).toBe(true);
  });

  it("analytics surfaces Twitch focus metrics", async () => {
    const analytics = await readPlatformAnalytics(userId, "twitch");
    expect(analytics.empty).toBe(false);
    expect(analytics.metrics.some((m) => m.key === "views")).toBe(true);
    expect(analytics.metrics.some((m) => m.key === "avg_views")).toBe(true);
    expect(analytics.metrics.some((m) => m.key === "engagement_rate")).toBe(
      true,
    );
  });

  it("health reports twitch + phase 20", async () => {
    const report = await getHealthReport(userId);
    expect(report.phase).toBe(20);
    expect(report.subsystems.find((s) => s.id === "twitch")?.status).toBe(
      "ok",
    );
  });

  it("disconnect clears Twitch snapshots", async () => {
    await twitchAdapter.disconnect(userId, connectionId);
    expect(
      await prisma.metricSnapshot.count({
        where: { userId, platform: "twitch" },
      }),
    ).toBe(0);
  });
});
