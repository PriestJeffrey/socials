import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createOAuthState } from "@/lib/platforms/oauth-state";
import { pinterestAdapter } from "@/lib/platforms/pinterest/adapter";
import { runPinterestSync } from "@/lib/platforms/pinterest/sync";
import { readOverview } from "@/lib/analytics/pipeline";
import { readPlatformAnalytics } from "@/lib/analytics/platform";
import { getHealthReport } from "@/lib/health/types";
import { listAdapters, oauthPlatforms } from "@/lib/platforms";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.runIf(hasDb)("phase 13 Pinterest", () => {
  const suffix = Date.now();
  const email = `p13-${suffix}@example.com`;
  let userId = "";
  let connectionId = "";

  beforeAll(async () => {
    process.env.PINTEREST_USE_FIXTURES = "true";
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
      await pinterestAdapter.handleOAuthCallback(userId, {
        code: "fixture_pinterest_code",
        state: createOAuthState(userId).state,
      })
    ).connectionId;
    await runPinterestSync({ userId, connectionId });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  });

  it("registers Pinterest in adapters and oauth platforms", () => {
    expect(listAdapters().map((a) => a.id)).toContain("pinterest");
    expect(oauthPlatforms().some((a) => a.id === "pinterest")).toBe(true);
  });

  it("fixture sync fills Overview Pinterest cards", async () => {
    const board = await readOverview(userId);
    expect(board.empty).toBe(false);
    expect(
      board.wins.concat(board.issues).some((c) => c.platform === "pinterest"),
    ).toBe(true);
  });

  it("analytics surfaces Pinterest focus metrics", async () => {
    const analytics = await readPlatformAnalytics(userId, "pinterest");
    expect(analytics.empty).toBe(false);
    expect(analytics.metrics.some((m) => m.key === "engagement_rate")).toBe(
      true,
    );
  });

  it("health reports pinterest + phase 16", async () => {
    const report = await getHealthReport(userId);
    expect(report.phase).toBe(16);
    expect(report.subsystems.find((s) => s.id === "pinterest")?.status).toBe(
      "ok",
    );
  });

  it("disconnect clears Pinterest snapshots", async () => {
    await pinterestAdapter.disconnect(userId, connectionId);
    expect(
      await prisma.metricSnapshot.count({
        where: { userId, platform: "pinterest" },
      }),
    ).toBe(0);
  });
});
