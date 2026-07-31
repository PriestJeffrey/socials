import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createOAuthState } from "@/lib/platforms/oauth-state";
import { instagramAdapter } from "@/lib/platforms/instagram/adapter";
import { runInstagramSync } from "@/lib/platforms/instagram/sync";
import { runPublishDraft } from "@/lib/content/publish";
import { repurposeBody } from "@/lib/content/repurpose";
import { jobQueue } from "@/lib/jobs";
import { processPendingJobs } from "@/lib/jobs/runner";
import { clock } from "@/lib/clock";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.runIf(hasDb)("phase 5 drafts + publish", () => {
  const suffix = Date.now();
  const emailA = `p5a-${suffix}@example.com`;
  const emailB = `p5b-${suffix}@example.com`;
  let userA = "";
  let userB = "";
  let connectionId = "";

  beforeAll(async () => {
    process.env.SESSION_SECRET =
      process.env.SESSION_SECRET ?? "test-session-secret-min-32-characters-long";
    process.env.TOKEN_ENCRYPTION_KEY =
      process.env.TOKEN_ENCRYPTION_KEY ??
      Buffer.from("0123456789abcdef0123456789abcdef").toString("base64");
    process.env.META_USE_FIXTURES = "true";

    const passwordHash = await hashPassword("password123");
    userA = (
      await prisma.user.create({ data: { email: emailA, passwordHash } })
    ).id;
    userB = (
      await prisma.user.create({ data: { email: emailB, passwordHash } })
    ).id;

    connectionId = (
      await instagramAdapter.handleOAuthCallback(userA, {
        code: "fixture_code",
        state: createOAuthState(userA).state,
      })
    ).connectionId;
    await runInstagramSync({ userId: userA, connectionId });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: [emailA, emailB] } } });
    await prisma.$disconnect();
  });

  it("publishes own draft via fixture path", async () => {
    const draft = await prisma.draft.create({
      data: {
        userId: userA,
        platform: "instagram",
        body: "Phase 5 fixture publish",
        goalTag: "awareness",
        status: "draft",
      },
    });
    const { postId } = await runPublishDraft({ userId: userA, draftId: draft.id });
    expect(postId).toBeTruthy();
    const updated = await prisma.draft.findUniqueOrThrow({ where: { id: draft.id } });
    expect(updated.status).toBe("published");
    expect(updated.publishedPostId).toBe(postId);
  });

  it("cannot publish another user's draft", async () => {
    const draft = await prisma.draft.create({
      data: {
        userId: userA,
        platform: "instagram",
        body: "secret",
        status: "draft",
      },
    });
    await expect(
      runPublishDraft({ userId: userB, draftId: draft.id }),
    ).rejects.toThrow(/not found/i);
  });

  it("schedules publish job with future runAfter", async () => {
    const draft = await prisma.draft.create({
      data: {
        userId: userA,
        platform: "instagram",
        body: "scheduled post",
        status: "scheduled",
        scheduledAt: new Date(clock.now().getTime() + 60_000),
      },
    });
    const when = draft.scheduledAt!;
    await jobQueue.enqueue({
      userId: userA,
      type: "publish",
      payload: { draftId: draft.id },
      idempotencyKey: `publish:${draft.id}:${when.toISOString()}`,
      runAfter: when,
    });
    // Drain any due jobs (e.g. leftover syncs) - future publish must remain pending
    await processPendingJobs(10, userA);
    const still = await prisma.draft.findUniqueOrThrow({ where: { id: draft.id } });
    expect(still.status).toBe("scheduled");
    const futureJob = await prisma.job.findFirst({
      where: {
        userId: userA,
        type: "publish",
        idempotencyKey: `publish:${draft.id}:${when.toISOString()}`,
      },
    });
    expect(futureJob?.status).toBe("pending");
  });

  it("refuses live Instagram publish without media URL when fixtures are off", async () => {
    const prev = process.env.META_USE_FIXTURES;
    process.env.META_USE_FIXTURES = "false";
    const draft = await prisma.draft.create({
      data: {
        userId: userA,
        platform: "instagram",
        body: "must not fake live",
        status: "draft",
      },
    });
    await expect(
      runPublishDraft({ userId: userA, draftId: draft.id }),
    ).rejects.toThrow(/media URL/i);
    const still = await prisma.draft.findUniqueOrThrow({ where: { id: draft.id } });
    expect(still.status).toBe("draft");
    process.env.META_USE_FIXTURES = prev ?? "true";
  });

  it("repurpose creates sibling body for X", () => {
    const out = repurposeBody("hello from ig", "x");
    expect(out.length).toBeGreaterThan(0);
    expect(out.length).toBeLessThanOrEqual(280);
  });
});
