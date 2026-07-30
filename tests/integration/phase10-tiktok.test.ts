import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createOAuthState } from "@/lib/platforms/oauth-state";
import { tiktokAdapter } from "@/lib/platforms/tiktok/adapter";
import { runTikTokSync } from "@/lib/platforms/tiktok/sync";
import { readOverview } from "@/lib/analytics/pipeline";
import { getHealthReport } from "@/lib/health/types";
import { listAdapters, oauthPlatforms } from "@/lib/platforms";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.runIf(hasDb)("phase 10 TikTok", () => {
  const suffix = Date.now();
  const email = `p10-${suffix}@example.com`;
  let userId = "";
  let connectionId = "";

  beforeAll(async () => {
    process.env.TIKTOK_USE_FIXTURES = "true";
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
      await tiktokAdapter.handleOAuthCallback(userId, {
        code: "fixture_tiktok_code",
        state: createOAuthState(userId).state,
      })
    ).connectionId;
    await runTikTokSync({ userId, connectionId });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  });

  it("registers TikTok in adapters and oauth platforms", () => {
    expect(listAdapters().map((a) => a.id)).toContain("tiktok");
    expect(oauthPlatforms().some((a) => a.id === "tiktok")).toBe(true);
  });

  it("sync fills Overview with TikTok cards", async () => {
    const board = await readOverview(userId);
    expect(board.empty).toBe(false);
    const tt = [...board.wins, ...board.issues].filter(
      (c) => c.platform === "tiktok",
    );
    expect(tt.length).toBeGreaterThan(0);
  });

  it("Health includes TikTok ok at phase 10", async () => {
    const report = await getHealthReport(userId);
    expect(report.phase).toBe(19);
    expect(report.subsystems.find((s) => s.id === "tiktok")?.status).toBe(
      "ok",
    );
  });

  it("disconnect clears TikTok snapshots", async () => {
    await tiktokAdapter.disconnect(userId, connectionId);
    expect(
      await prisma.metricSnapshot.count({ where: { connectionId } }),
    ).toBe(0);
  });
});
