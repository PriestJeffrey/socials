import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createOAuthState } from "@/lib/platforms/oauth-state";
import { vimeoAdapter } from "@/lib/platforms/vimeo/adapter";
import { runVimeoSync } from "@/lib/platforms/vimeo/sync";
import { readOverview } from "@/lib/analytics/pipeline";
import { readPlatformAnalytics } from "@/lib/analytics/platform";
import { getHealthReport } from "@/lib/health/types";
import { listAdapters, oauthPlatforms } from "@/lib/platforms";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.runIf(hasDb)("phase 21 Vimeo", () => {
  const suffix = Date.now();
  const email = `p21-${suffix}@example.com`;
  let userId = "";
  let connectionId = "";

  beforeAll(async () => {
    process.env.VIMEO_USE_FIXTURES = "true";
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
      await vimeoAdapter.handleOAuthCallback(userId, {
        code: "fixture_vimeo_code",
        state: createOAuthState(userId).state,
      })
    ).connectionId;
    await runVimeoSync({ userId, connectionId });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  });

  it("registers Vimeo in adapters and oauth platforms", () => {
    expect(listAdapters().map((a) => a.id)).toContain("vimeo");
    expect(oauthPlatforms().some((a) => a.id === "vimeo")).toBe(true);
  });

  it("fixture sync fills Overview Vimeo cards", async () => {
    const board = await readOverview(userId);
    expect(board.empty).toBe(false);
    expect(
      board.wins.concat(board.issues).some((c) => c.platform === "vimeo"),
    ).toBe(true);
  });

  it("analytics surfaces Vimeo focus metrics", async () => {
    const analytics = await readPlatformAnalytics(userId, "vimeo");
    expect(analytics.empty).toBe(false);
    expect(analytics.metrics.some((m) => m.key === "views")).toBe(true);
    expect(analytics.metrics.some((m) => m.key === "engagement_rate")).toBe(
      true,
    );
  });

  it("health reports vimeo + phase 21", async () => {
    const report = await getHealthReport(userId);
    expect(report.phase).toBe(21);
    expect(report.subsystems.find((s) => s.id === "vimeo")?.status).toBe(
      "ok",
    );
  });

  it("disconnect clears Vimeo snapshots", async () => {
    await vimeoAdapter.disconnect(userId, connectionId);
    expect(
      await prisma.metricSnapshot.count({
        where: { userId, platform: "vimeo" },
      }),
    ).toBe(0);
  });
});
