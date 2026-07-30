import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { transitionDraft } from "@/lib/content/transitions";
import { analyzeDraftSentiment } from "@/lib/ai/features/sentiment";
import { getHealthReport } from "@/lib/health/types";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.runIf(hasDb)("phase 7 approvals + deletion", () => {
  const suffix = Date.now();
  const emailA = `p7a-${suffix}@example.com`;
  const emailB = `p7b-${suffix}@example.com`;
  const emailDel = `p7del-${suffix}@example.com`;
  let userA = "";
  let userB = "";
  let userDel = "";

  beforeAll(async () => {
    process.env.GEMINI_USE_FIXTURES = "true";
    const passwordHash = await hashPassword("password123");
    userA = (
      await prisma.user.create({ data: { email: emailA, passwordHash } })
    ).id;
    userB = (
      await prisma.user.create({ data: { email: emailB, passwordHash } })
    ).id;
    userDel = (
      await prisma.user.create({ data: { email: emailDel, passwordHash } })
    ).id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [emailA, emailB, emailDel] } },
    });
    await prisma.$disconnect();
  });

  it("runs review → approve for own draft only", async () => {
    const draft = await prisma.draft.create({
      data: {
        userId: userA,
        platform: "instagram",
        body: "Approval workflow body long enough",
        status: "draft",
      },
    });
    await transitionDraft({
      userId: userA,
      draftId: draft.id,
      transition: "submit_review",
    });
    await expect(
      transitionDraft({
        userId: userB,
        draftId: draft.id,
        transition: "approve",
      }),
    ).rejects.toThrow(/not found/i);
    const approved = await transitionDraft({
      userId: userA,
      draftId: draft.id,
      transition: "approve",
    });
    expect(approved.status).toBe("approved");
  });

  it("sentiment resilient fixture path", async () => {
    const draft = await prisma.draft.create({
      data: {
        userId: userA,
        platform: "linkedin",
        body: "We shipped a calm operator update this week.",
        status: "draft",
      },
    });
    const s = await analyzeDraftSentiment({ userId: userA, draftId: draft.id });
    expect(["positive", "neutral", "negative", "mixed", "unknown"]).toContain(
      s.label,
    );
    const row = await prisma.draft.findUniqueOrThrow({ where: { id: draft.id } });
    expect(row.sentimentLabel).toBeTruthy();
  });

  it("hard delete empties user data", async () => {
    await prisma.draft.create({
      data: {
        userId: userDel,
        platform: "instagram",
        body: "to be deleted forever content",
        status: "draft",
      },
    });
    await prisma.hookLibraryItem.create({
      data: {
        userId: userDel,
        platform: "instagram",
        hook: "doomed hook",
      },
    });
    await prisma.user.delete({ where: { id: userDel } });
    expect(await prisma.draft.count({ where: { userId: userDel } })).toBe(0);
    expect(
      await prisma.hookLibraryItem.count({ where: { userId: userDel } }),
    ).toBe(0);
    expect(await prisma.user.findUnique({ where: { id: userDel } })).toBeNull();
  });

  it("Health phase is 7", async () => {
    const report = await getHealthReport(userA);
    expect(report.phase).toBeGreaterThanOrEqual(7);
  });
});
