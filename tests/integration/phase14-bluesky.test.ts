import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createOAuthState } from "@/lib/platforms/oauth-state";
import { blueskyAdapter } from "@/lib/platforms/bluesky/adapter";
import { runBlueskySync } from "@/lib/platforms/bluesky/sync";
import { readOverview } from "@/lib/analytics/pipeline";
import { readPlatformAnalytics } from "@/lib/analytics/platform";
import { getHealthReport } from "@/lib/health/types";
import { listAdapters, oauthPlatforms } from "@/lib/platforms";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.runIf(hasDb)("phase 14 Bluesky", () => {
  const suffix = Date.now();
  const email = `p14-${suffix}@example.com`;
  let userId = "";
  let connectionId = "";

  beforeAll(async () => {
    process.env.BLUESKY_USE_FIXTURES = "true";
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
      await blueskyAdapter.handleOAuthCallback(userId, {
        code: "fixture_bluesky_code",
        state: createOAuthState(userId).state,
      })
    ).connectionId;
    await runBlueskySync({ userId, connectionId });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  });

  it("registers Bluesky in adapters and oauth platforms", () => {
    expect(listAdapters().map((a) => a.id)).toContain("bluesky");
    expect(oauthPlatforms().some((a) => a.id === "bluesky")).toBe(true);
  });

  it("fixture sync fills Overview Bluesky cards", async () => {
    const board = await readOverview(userId);
    expect(board.empty).toBe(false);
    expect(
      board.wins.concat(board.issues).some((c) => c.platform === "bluesky"),
    ).toBe(true);
  });

  it("analytics surfaces Bluesky focus metrics", async () => {
    const analytics = await readPlatformAnalytics(userId, "bluesky");
    expect(analytics.empty).toBe(false);
    expect(analytics.metrics.some((m) => m.key === "engagement_rate")).toBe(
      true,
    );
  });

  it("health reports bluesky + phase 19", async () => {
    const report = await getHealthReport(userId);
    expect(report.phase).toBe(19);
    expect(report.subsystems.find((s) => s.id === "bluesky")?.status).toBe(
      "ok",
    );
  });

  it("disconnect clears Bluesky snapshots", async () => {
    await blueskyAdapter.disconnect(userId, connectionId);
    expect(
      await prisma.metricSnapshot.count({
        where: { userId, platform: "bluesky" },
      }),
    ).toBe(0);
  });
});
