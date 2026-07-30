import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createOAuthState } from "@/lib/platforms/oauth-state";
import { instagramAdapter } from "@/lib/platforms/instagram/adapter";
import { runInstagramSync } from "@/lib/platforms/instagram/sync";
import { linkedinAdapter } from "@/lib/platforms/linkedin/adapter";
import { runLinkedInSync } from "@/lib/platforms/linkedin/sync";
import {
  listAnalyticsHub,
  readPlatformAnalytics,
} from "@/lib/analytics/platform";
import { getHealthReport } from "@/lib/health/types";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.runIf(hasDb)("phase 11 analytics", () => {
  const suffix = Date.now();
  const emailA = `p11a-${suffix}@example.com`;
  const emailB = `p11b-${suffix}@example.com`;
  let userA = "";
  let userB = "";
  let igConnectionId = "";
  let liConnectionId = "";

  beforeAll(async () => {
    process.env.META_USE_FIXTURES = "true";
    process.env.LINKEDIN_USE_FIXTURES = "true";
    process.env.SESSION_SECRET =
      process.env.SESSION_SECRET ?? "test-session-secret-min-32-characters-long";
    process.env.TOKEN_ENCRYPTION_KEY =
      process.env.TOKEN_ENCRYPTION_KEY ??
      Buffer.from("0123456789abcdef0123456789abcdef").toString("base64");

    const passwordHash = await hashPassword("password123");
    userA = (await prisma.user.create({ data: { email: emailA, passwordHash } }))
      .id;
    userB = (await prisma.user.create({ data: { email: emailB, passwordHash } }))
      .id;

    igConnectionId = (
      await instagramAdapter.handleOAuthCallback(userA, {
        code: "fixture_ig_code",
        state: createOAuthState(userA).state,
      })
    ).connectionId;
    await runInstagramSync({ userId: userA, connectionId: igConnectionId });

    liConnectionId = (
      await linkedinAdapter.handleOAuthCallback(userA, {
        code: "fixture_li_code",
        state: createOAuthState(userA).state,
      })
    ).connectionId;
    await runLinkedInSync({ userId: userA, connectionId: liConnectionId });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: [emailA, emailB] } } });
    await prisma.$disconnect();
  });

  it("health reports phase 11", async () => {
    const report = await getHealthReport(userA);
    expect(report.phase).toBe(17);
  });

  it("hub marks Instagram connected after sync", async () => {
    const hub = await listAnalyticsHub(userA);
    const ig = hub.find((h) => h.platform === "instagram");
    expect(ig?.connected).toBe(true);
    const x = hub.find((h) => h.platform === "x");
    expect(x?.mode).toBe("manual");
  });

  it("Instagram analytics surfaces focus metrics from snapshots", async () => {
    const board = await readPlatformAnalytics(userA, "instagram");
    expect(board.mode).toBe("snapshots");
    expect(board.empty).toBe(false);
    expect(board.metrics.some((m) => m.key === "saves_rate")).toBe(true);
    expect(board.posts.length).toBeGreaterThan(0);
  });

  it("LinkedIn analytics includes heuristics when keys exist", async () => {
    const board = await readPlatformAnalytics(userA, "linkedin");
    expect(board.empty).toBe(false);
    expect(board.heuristics.length).toBeGreaterThan(0);
    expect(board.metrics.some((m) => m.key === "dwell_proxy")).toBe(true);
  });

  it("isolates analytics by userId", async () => {
    const boardB = await readPlatformAnalytics(userB, "instagram");
    expect(boardB.empty).toBe(true);
    expect(boardB.metrics).toEqual([]);
  });
});
