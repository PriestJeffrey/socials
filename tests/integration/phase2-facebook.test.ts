import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createOAuthState } from "@/lib/platforms/oauth-state";
import { facebookAdapter } from "@/lib/platforms/facebook/adapter";
import { instagramAdapter } from "@/lib/platforms/instagram/adapter";
import { runFacebookSync } from "@/lib/platforms/facebook/sync";
import { runInstagramSync } from "@/lib/platforms/instagram/sync";
import { readOverview } from "@/lib/analytics/pipeline";
import { getHealthReport } from "@/lib/health/types";
import { listAdapters } from "@/lib/platforms";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.runIf(hasDb)("phase 2 facebook fixtures + tenancy", () => {
  const suffix = Date.now();
  const emailA = `p2a-${suffix}@example.com`;
  const emailB = `p2b-${suffix}@example.com`;
  let userAId = "";
  let userBId = "";
  let fbConnectionId = "";
  let igConnectionId = "";

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

    const fb = await facebookAdapter.handleOAuthCallback(userAId, {
      code: "fixture_code",
      state: createOAuthState(userAId).state,
    });
    fbConnectionId = fb.connectionId;

    const ig = await instagramAdapter.handleOAuthCallback(userAId, {
      code: "fixture_code",
      state: createOAuthState(userAId).state,
    });
    igConnectionId = ig.connectionId;

    await runFacebookSync({ userId: userAId, connectionId: fbConnectionId });
    await runInstagramSync({ userId: userAId, connectionId: igConnectionId });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [emailA, emailB] } },
    });
    await prisma.$disconnect();
  });

  it("registers facebook adapter", () => {
    expect(listAdapters().some((a) => a.id === "facebook")).toBe(true);
  });

  it("fixture FB sync adds Facebook cards on Overview for owner only", async () => {
    await runFacebookSync({ userId: userAId, connectionId: fbConnectionId });
    const boardA = await readOverview(userAId);
    expect(boardA.empty).toBe(false);
    expect(boardA.wins.concat(boardA.issues).some((c) => c.platform === "facebook")).toBe(
      true,
    );

    const boardB = await readOverview(userBId);
    expect(boardB.empty).toBe(true);
    expect(
      await prisma.metricSnapshot.count({
        where: { userId: userBId, platform: "facebook" },
      }),
    ).toBe(0);
  });

  it("Health reports Facebook connected", async () => {
    const report = await getHealthReport(userAId);
    expect(report.phase).toBe(8);
    const fb = report.subsystems.find((s) => s.id === "facebook");
    expect(fb?.status).toBe("ok");
  });

  it("disconnect FB clears FB signal but leaves IG snapshots", async () => {
    await runInstagramSync({ userId: userAId, connectionId: igConnectionId });
    await runFacebookSync({ userId: userAId, connectionId: fbConnectionId });

    await facebookAdapter.disconnect(userAId, fbConnectionId);

    expect(
      await prisma.metricSnapshot.count({
        where: { connectionId: fbConnectionId },
      }),
    ).toBe(0);
    expect(
      await prisma.metricSnapshot.count({
        where: { connectionId: igConnectionId },
      }),
    ).toBeGreaterThan(0);

    const board = await readOverview(userAId);
    expect(board.wins.concat(board.issues).some((c) => c.platform === "facebook")).toBe(
      false,
    );
    expect(board.wins.concat(board.issues).some((c) => c.platform === "instagram")).toBe(
      true,
    );
  });
});
