import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createOAuthState } from "@/lib/platforms/oauth-state";
import { discordAdapter } from "@/lib/platforms/discord/adapter";
import { runDiscordSync } from "@/lib/platforms/discord/sync";
import { readOverview } from "@/lib/analytics/pipeline";
import { readPlatformAnalytics } from "@/lib/analytics/platform";
import { getHealthReport } from "@/lib/health/types";
import { listAdapters, oauthPlatforms } from "@/lib/platforms";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.runIf(hasDb)("phase 19 Discord", () => {
  const suffix = Date.now();
  const email = `p19-${suffix}@example.com`;
  let userId = "";
  let connectionId = "";

  beforeAll(async () => {
    process.env.DISCORD_USE_FIXTURES = "true";
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
      await discordAdapter.handleOAuthCallback(userId, {
        code: "fixture_discord_code",
        state: createOAuthState(userId).state,
      })
    ).connectionId;
    await runDiscordSync({ userId, connectionId });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  });

  it("registers Discord in adapters and oauth platforms", () => {
    expect(listAdapters().map((a) => a.id)).toContain("discord");
    expect(oauthPlatforms().some((a) => a.id === "discord")).toBe(true);
  });

  it("fixture sync fills Overview Discord cards", async () => {
    const board = await readOverview(userId);
    expect(board.empty).toBe(false);
    expect(
      board.wins.concat(board.issues).some((c) => c.platform === "discord"),
    ).toBe(true);
  });

  it("analytics surfaces Discord focus metrics", async () => {
    const analytics = await readPlatformAnalytics(userId, "discord");
    expect(analytics.empty).toBe(false);
    expect(analytics.metrics.some((m) => m.key === "reactions")).toBe(true);
    expect(analytics.metrics.some((m) => m.key === "replies")).toBe(true);
    expect(analytics.metrics.some((m) => m.key === "engagement_rate")).toBe(
      true,
    );
  });

  it("health reports discord + phase 19", async () => {
    const report = await getHealthReport(userId);
    expect(report.phase).toBe(19);
    expect(report.subsystems.find((s) => s.id === "discord")?.status).toBe(
      "ok",
    );
  });

  it("disconnect clears Discord snapshots", async () => {
    await discordAdapter.disconnect(userId, connectionId);
    expect(
      await prisma.metricSnapshot.count({
        where: { userId, platform: "discord" },
      }),
    ).toBe(0);
  });
});
