import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { encryptAesGcm, decryptAesGcm } from "@/lib/crypto/aes";
import { createOAuthState, verifyOAuthState } from "@/lib/platforms/oauth-state";
import { runInstagramSync } from "@/lib/platforms/instagram/sync";
import { readOverview } from "@/lib/analytics/pipeline";
import { getHealthReport } from "@/lib/health/types";
import { instagramAdapter } from "@/lib/platforms/instagram/adapter";
import { processPendingJobs } from "@/lib/jobs/runner";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.runIf(hasDb)("phase 1 instagram fixtures + tenancy", () => {
  const suffix = Date.now();
  const emailA = `p1a-${suffix}@example.com`;
  const emailB = `p1b-${suffix}@example.com`;
  let userAId = "";
  let userBId = "";
  let connectionAId = "";

  beforeAll(async () => {
    process.env.SESSION_SECRET =
      process.env.SESSION_SECRET ?? "test-session-secret-min-32-characters-long";
    process.env.TOKEN_ENCRYPTION_KEY =
      process.env.TOKEN_ENCRYPTION_KEY ??
      Buffer.from("0123456789abcdef0123456789abcdef").toString("base64");
    process.env.META_USE_FIXTURES = "true";

    const passwordHash = await hashPassword("password123");
    const a = await prisma.user.create({
      data: { email: emailA, passwordHash },
    });
    const b = await prisma.user.create({
      data: { email: emailB, passwordHash },
    });
    userAId = a.id;
    userBId = b.id;

    const { connectionId } = await instagramAdapter.handleOAuthCallback(userAId, {
      code: "fixture_code",
      state: createOAuthState(userAId).state,
    });
    connectionAId = connectionId;
    await processPendingJobs(5);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [emailA, emailB] } },
    });
    await prisma.$disconnect();
  });

  it("stores access tokens as AES ciphertext, not plaintext", async () => {
    const conn = await prisma.socialConnection.findUniqueOrThrow({
      where: { id: connectionAId },
    });
    expect(conn.accessTokenEnc).toBeTruthy();
    expect(conn.accessTokenEnc).not.toContain("fixture-token");
    const plain = decryptAesGcm(conn.accessTokenEnc!);
    expect(plain).toContain("fixture");
    // Round-trip shape matches encrypt helper
    expect(decryptAesGcm(encryptAesGcm("x"))).toBe("x");
  });

  it("fixture sync leaves Overview non-empty for owner only", async () => {
    // Ensure metrics exist even if job already ran
    await runInstagramSync({ userId: userAId, connectionId: connectionAId });
    const boardA = await readOverview(userAId);
    expect(boardA.empty).toBe(false);
    expect(boardA.wins.length + boardA.issues.length).toBeGreaterThan(0);

    const boardB = await readOverview(userBId);
    expect(boardB.empty).toBe(true);

    const foreign = await prisma.metricSnapshot.count({
      where: { userId: userBId },
    });
    expect(foreign).toBe(0);
  });

  it("Health reports Instagram connected after sync", async () => {
    const report = await getHealthReport(userAId);
    expect(report.phase).toBeGreaterThanOrEqual(1);
    const ig = report.subsystems.find((s) => s.id === "instagram");
    expect(ig?.status).toBe("ok");
  });

  it("rejects OAuth state for a different user", async () => {
    const { state } = createOAuthState(userAId);
    expect(verifyOAuthState(state)?.userId).toBe(userAId);
    await expect(
      instagramAdapter.handleOAuthCallback(userBId, {
        code: "fixture_code",
        state,
      }),
    ).rejects.toThrow(/Invalid OAuth state/i);
  });

  it("fixture OAuth URL stays local even when META_APP_ID is set", async () => {
    process.env.META_USE_FIXTURES = "true";
    process.env.META_APP_ID = "dummy-app-id";
    const url = await instagramAdapter.beginOAuth(userAId);
    expect(url).toContain("/api/oauth/instagram/callback");
    expect(url).not.toContain("facebook.com");
    delete process.env.META_APP_ID;
  });

  it("disconnect clears snapshots and empties Overview", async () => {
    await runInstagramSync({ userId: userAId, connectionId: connectionAId });
    expect((await readOverview(userAId)).empty).toBe(false);

    await instagramAdapter.disconnect(connectionAId);

    const posts = await prisma.post.count({ where: { connectionId: connectionAId } });
    const snaps = await prisma.metricSnapshot.count({
      where: { connectionId: connectionAId },
    });
    expect(posts).toBe(0);
    expect(snaps).toBe(0);
    expect((await readOverview(userAId)).empty).toBe(true);

    await expect(
      runInstagramSync({ userId: userAId, connectionId: connectionAId }),
    ).rejects.toThrow(/not connected/i);
  });
});
