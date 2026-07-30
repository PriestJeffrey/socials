import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createOAuthState } from "@/lib/platforms/oauth-state";
import { slackAdapter } from "@/lib/platforms/slack/adapter";
import { runSlackSync } from "@/lib/platforms/slack/sync";
import { readOverview } from "@/lib/analytics/pipeline";
import { readPlatformAnalytics } from "@/lib/analytics/platform";
import { getHealthReport } from "@/lib/health/types";
import { listAdapters, oauthPlatforms } from "@/lib/platforms";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.runIf(hasDb)("phase 21 Slack", () => {
  const suffix = Date.now();
  const email = `p20-${suffix}@example.com`;
  let userId = "";
  let connectionId = "";

  beforeAll(async () => {
    process.env.SLACK_USE_FIXTURES = "true";
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
      await slackAdapter.handleOAuthCallback(userId, {
        code: "fixture_slack_code",
        state: createOAuthState(userId).state,
      })
    ).connectionId;
    await runSlackSync({ userId, connectionId });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  });

  it("registers Slack in adapters and oauth platforms", () => {
    expect(listAdapters().map((a) => a.id)).toContain("slack");
    expect(oauthPlatforms().some((a) => a.id === "slack")).toBe(true);
  });

  it("fixture sync fills Overview Slack cards", async () => {
    const board = await readOverview(userId);
    expect(board.empty).toBe(false);
    expect(
      board.wins.concat(board.issues).some((c) => c.platform === "slack"),
    ).toBe(true);
  });

  it("analytics surfaces Slack focus metrics", async () => {
    const analytics = await readPlatformAnalytics(userId, "slack");
    expect(analytics.empty).toBe(false);
    expect(analytics.metrics.some((m) => m.key === "reactions")).toBe(true);
    expect(analytics.metrics.some((m) => m.key === "replies")).toBe(true);
    expect(analytics.metrics.some((m) => m.key === "engagement_rate")).toBe(
      true,
    );
  });

  it("health reports slack + phase 21", async () => {
    const report = await getHealthReport(userId);
    expect(report.phase).toBe(21);
    expect(report.subsystems.find((s) => s.id === "slack")?.status).toBe(
      "ok",
    );
  });

  it("disconnect clears Slack snapshots", async () => {
    await slackAdapter.disconnect(userId, connectionId);
    expect(
      await prisma.metricSnapshot.count({
        where: { userId, platform: "slack" },
      }),
    ).toBe(0);
  });
});
