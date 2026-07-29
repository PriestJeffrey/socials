import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  createSession,
  destroySessionByToken,
  hashSessionToken,
} from "@/lib/auth/session";
import { readOverview } from "@/lib/analytics/pipeline";
import { writeAudit } from "@/lib/audit/log";
import { DbJobQueue } from "@/lib/jobs";
import { createOAuthState, verifyOAuthState } from "@/lib/platforms/oauth-state";
import { getAdapter, listAdapters } from "@/lib/platforms";
import { MemoryRateLimiter } from "@/lib/rate-limit";
import { SystemClock } from "@/lib/clock";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.runIf(hasDb)("auth + tenancy integration", () => {
  const suffix = Date.now();
  const emailA = `a-${suffix}@example.com`;
  const emailB = `b-${suffix}@example.com`;
  let userAId = "";
  let userBId = "";
  let tokenA = "";

  beforeAll(async () => {
    process.env.SESSION_SECRET =
      process.env.SESSION_SECRET ?? "test-session-secret-min-32-characters-long";

    const passwordHash = await hashPassword("password123");
    const a = await prisma.user.create({
      data: { email: emailA, passwordHash },
    });
    const b = await prisma.user.create({
      data: { email: emailB, passwordHash },
    });
    userAId = a.id;
    userBId = b.id;
    tokenA = await createSession(userAId);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [emailA, emailB] } },
    });
    await prisma.$disconnect();
  });

  it("verifies password hashes", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userAId } });
    expect(await verifyPassword("password123", user.passwordHash)).toBe(true);
    expect(await verifyPassword("wrong", user.passwordHash)).toBe(false);
  });

  it("stores session by hashed token", async () => {
    const session = await prisma.session.findUnique({
      where: { tokenHash: hashSessionToken(tokenA) },
    });
    expect(session?.userId).toBe(userAId);
  });

  it("readOverview is scoped to userId when no snapshots exist", async () => {
    const board = await readOverview(userAId);
    expect(board.userId).toBe(userAId);
    expect(board.empty).toBe(true);
    const other = await readOverview(userBId);
    expect(other.userId).toBe(userBId);
    expect(other.empty).toBe(true);
  });

  it("destroys session on logout path", async () => {
    const token = await createSession(userBId);
    await destroySessionByToken(token);
    const gone = await prisma.session.findUnique({
      where: { tokenHash: hashSessionToken(token) },
    });
    expect(gone).toBeNull();
  });

  it("writes audit events", async () => {
    await writeAudit({
      userId: userAId,
      action: "auth.logout",
      metadata: { test: true },
    });
    const row = await prisma.auditLog.findFirst({
      where: { userId: userAId, action: "auth.logout" },
      orderBy: { createdAt: "desc" },
    });
    expect(row).toBeTruthy();
  });

  it("DbJobQueue enqueues and dedupes", async () => {
    const q = new DbJobQueue();
    const key = `sync-${suffix}`;
    const first = await q.enqueue({
      userId: userAId,
      type: "sync",
      payload: { platform: "instagram" },
      idempotencyKey: key,
    });
    const second = await q.enqueue({
      userId: userAId,
      type: "sync",
      payload: { platform: "instagram" },
      idempotencyKey: key,
    });
    expect(first.deduped).toBe(false);
    expect(second.deduped).toBe(true);
    expect(second.id).toBe(first.id);
    await prisma.job.delete({ where: { id: first.id } });
  });
});

describe("oauth state + adapters", () => {
  it("signs and verifies oauth state", () => {
    process.env.SESSION_SECRET = "test-session-secret-min-32-characters-long";
    const { state } = createOAuthState("user_123");
    expect(verifyOAuthState(state)?.userId).toBe("user_123");
    expect(verifyOAuthState(state + "x")).toBeNull();
  });

  it("registers Instagram adapter with OAuth", async () => {
    process.env.SESSION_SECRET = "test-session-secret-min-32-characters-long";
    process.env.META_USE_FIXTURES = "true";
    const ig = getAdapter("instagram");
    expect(ig?.id).toBe("instagram");
    expect(ig?.capabilities.oauth).toBe(true);
    expect(listAdapters().length).toBeGreaterThanOrEqual(1);
    const url = await ig!.beginOAuth("u1");
    expect(url).toContain("/api/oauth/instagram/callback");
    expect(url).toContain("code=fixture_code");
  });
});

describe("rate limit security seam", () => {
  it("blocks after limit", async () => {
    const limiter = new MemoryRateLimiter(new SystemClock());
    const key = `login:test-${Date.now()}`;
    for (let i = 0; i < 3; i++) {
      expect((await limiter.check(key, 3, 60_000)).ok).toBe(true);
    }
    expect((await limiter.check(key, 3, 60_000)).ok).toBe(false);
  });
});
