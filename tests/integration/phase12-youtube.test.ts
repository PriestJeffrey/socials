import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createOAuthState } from "@/lib/platforms/oauth-state";
import { youtubeAdapter } from "@/lib/platforms/youtube/adapter";
import { runYouTubeSync } from "@/lib/platforms/youtube/sync";
import { readOverview } from "@/lib/analytics/pipeline";
import { readPlatformAnalytics } from "@/lib/analytics/platform";
import { getHealthReport } from "@/lib/health/types";
import { listAdapters, oauthPlatforms } from "@/lib/platforms";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.runIf(hasDb)("phase 12 YouTube", () => {
  const suffix = Date.now();
  const email = `p12-${suffix}@example.com`;
  let userId = "";
  let connectionId = "";

  beforeAll(async () => {
    process.env.YOUTUBE_USE_FIXTURES = "true";
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
      await youtubeAdapter.handleOAuthCallback(userId, {
        code: "fixture_youtube_code",
        state: createOAuthState(userId).state,
      })
    ).connectionId;
    await runYouTubeSync({ userId, connectionId });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  });

  it("registers YouTube in adapters and oauth platforms", () => {
    expect(listAdapters().map((a) => a.id)).toContain("youtube");
    expect(oauthPlatforms().some((a) => a.id === "youtube")).toBe(true);
  });

  it("fixture sync fills Overview YouTube cards", async () => {
    const board = await readOverview(userId);
    expect(board.empty).toBe(false);
    expect(
      board.wins.concat(board.issues).some((c) => c.platform === "youtube"),
    ).toBe(true);
  });

  it("analytics surfaces YouTube focus metrics", async () => {
    const analytics = await readPlatformAnalytics(userId, "youtube");
    expect(analytics.empty).toBe(false);
    expect(analytics.metrics.some((m) => m.key === "engagement_rate")).toBe(
      true,
    );
  });

  it("health reports youtube + phase 21", async () => {
    const report = await getHealthReport(userId);
    expect(report.phase).toBe(21);
    expect(report.subsystems.find((s) => s.id === "youtube")?.status).toBe(
      "ok",
    );
  });

  it("disconnect clears YouTube snapshots", async () => {
    await youtubeAdapter.disconnect(userId, connectionId);
    expect(
      await prisma.metricSnapshot.count({
        where: { userId, platform: "youtube" },
      }),
    ).toBe(0);
  });
});
