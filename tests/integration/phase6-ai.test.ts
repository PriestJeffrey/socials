import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { analyzeCompetitorPaste } from "@/lib/ai/features/analyze-competitor";
import { draftAssist } from "@/lib/ai/features/draft-assist";
import { getHealthReport } from "@/lib/health/types";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.runIf(hasDb)("phase 6 AI + hook library", () => {
  const suffix = Date.now();
  const emailA = `p6a-${suffix}@example.com`;
  const emailB = `p6b-${suffix}@example.com`;
  let userA = "";
  let userB = "";

  beforeAll(async () => {
    process.env.GEMINI_USE_FIXTURES = "true";
    process.env.SESSION_SECRET =
      process.env.SESSION_SECRET ?? "test-session-secret-min-32-characters-long";

    const passwordHash = await hashPassword("password123");
    userA = (
      await prisma.user.create({ data: { email: emailA, passwordHash } })
    ).id;
    userB = (
      await prisma.user.create({ data: { email: emailB, passwordHash } })
    ).id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: [emailA, emailB] } } });
    await prisma.$disconnect();
  });

  it("analyzes paste into own hook library", async () => {
    const { itemId, analysis } = await analyzeCompetitorPaste({
      userId: userA,
      platform: "instagram",
      sourceText:
        "Stop scrolling — three moves that doubled our saves last week. Comment READY if you want the checklist.",
    });
    expect(analysis.hook.length).toBeGreaterThan(5);
    const row = await prisma.hookLibraryItem.findFirst({
      where: { id: itemId, userId: userA },
    });
    expect(row?.hook).toBeTruthy();
    const other = await prisma.hookLibraryItem.findFirst({
      where: { id: itemId, userId: userB },
    });
    expect(other).toBeNull();
  });

  it("draft assist returns body text", async () => {
    const body = await draftAssist({
      userId: userA,
      platform: "linkedin",
      goalTag: "trust",
      seed: "operator tip",
    });
    expect(body.length).toBeGreaterThan(10);
  });

  it("Health phase includes AI subsystem", async () => {
    const report = await getHealthReport(userA);
    expect(report.phase).toBeGreaterThanOrEqual(6);
    expect(report.subsystems.find((s) => s.id === "ai")?.status).toBe("ok");
  });
});
