import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createOAuthState } from "@/lib/platforms/oauth-state";
import { linkedinAdapter } from "@/lib/platforms/linkedin/adapter";
import { facebookAdapter } from "@/lib/platforms/facebook/adapter";
import { runFacebookSync } from "@/lib/platforms/facebook/sync";
import { runLinkedInSync } from "@/lib/platforms/linkedin/sync";
import { readOverview } from "@/lib/analytics/pipeline";
import { getHealthReport } from "@/lib/health/types";
import { listAdapters } from "@/lib/platforms";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.runIf(hasDb)("phase 3 linkedin + formulas", () => {
  const suffix = Date.now();
  const email = `p3-${suffix}@example.com`;
  let userId = "";
  let liId = "";
  let fbId = "";

  beforeAll(async () => {
    process.env.SESSION_SECRET =
      process.env.SESSION_SECRET ?? "test-session-secret-min-32-characters-long";
    process.env.TOKEN_ENCRYPTION_KEY =
      process.env.TOKEN_ENCRYPTION_KEY ??
      Buffer.from("0123456789abcdef0123456789abcdef").toString("base64");
    process.env.META_USE_FIXTURES = "true";
    process.env.LINKEDIN_USE_FIXTURES = "true";

    const passwordHash = await hashPassword("password123");
    const user = await prisma.user.create({
      data: { email, passwordHash },
    });
    userId = user.id;

    liId = (
      await linkedinAdapter.handleOAuthCallback(userId, {
        code: "fixture_code",
        state: createOAuthState(userId).state,
      })
    ).connectionId;

    fbId = (
      await facebookAdapter.handleOAuthCallback(userId, {
        code: "fixture_code",
        state: createOAuthState(userId).state,
      })
    ).connectionId;

    await runLinkedInSync({ userId, connectionId: liId });
    await runFacebookSync({ userId, connectionId: fbId });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  });

  it("registers linkedin adapter", () => {
    expect(listAdapters().some((a) => a.id === "linkedin")).toBe(true);
  });

  it("fixture LI sync produces LinkedIn + formula cards", async () => {
    await runLinkedInSync({ userId, connectionId: liId });
    const board = await readOverview(userId);
    expect(board.empty).toBe(false);
    const liCards = board.wins.concat(board.issues).filter((c) => c.platform === "linkedin");
    expect(liCards.length).toBeGreaterThan(0);
    expect(
      liCards.some(
        (c) =>
          c.metricKey === "content_fatigue" ||
          c.metricKey === "shadowban_heuristic" ||
          c.metricKey === "dwell_proxy",
      ),
    ).toBe(true);
  });

  it("Health phase includes LinkedIn ok", async () => {
    const report = await getHealthReport(userId);
    expect(report.phase).toBeGreaterThanOrEqual(3);
    expect(report.subsystems.find((s) => s.id === "linkedin")?.status).toBe("ok");
  });

  it("disconnect LI leaves Facebook snapshots", async () => {
    await linkedinAdapter.disconnect(liId);
    expect(
      await prisma.metricSnapshot.count({ where: { connectionId: liId } }),
    ).toBe(0);
    expect(
      await prisma.metricSnapshot.count({ where: { connectionId: fbId } }),
    ).toBeGreaterThan(0);
  });
});
