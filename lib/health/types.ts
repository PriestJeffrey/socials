import { prisma } from "@/lib/db/prisma";
import { getMetaConfig } from "@/lib/platforms/instagram/config";

export type HealthStatus = "ok" | "degraded" | "unknown" | "down";

export type HealthSubsystem = {
  id: "auth" | "database" | "instagram" | "facebook";
  label: string;
  status: HealthStatus;
  detail?: string;
  checkedAt: string;
};

export type HealthReport = {
  phase: 2;
  subsystems: HealthSubsystem[];
};

async function platformHealth(
  userId: string | undefined,
  platform: "instagram" | "facebook",
  checkedAt: string,
): Promise<Omit<HealthSubsystem, "id" | "label">> {
  const cfg = getMetaConfig();
  let status: HealthStatus = "unknown";
  let detail = cfg.useFixtures
    ? "Fixture mode enabled"
    : cfg.configured
      ? "Meta app configured — no connection yet"
      : "META_APP_ID/SECRET missing (or set META_USE_FIXTURES=true)";

  if (userId) {
    const conn = await prisma.socialConnection.findFirst({
      where: { userId, platform },
      orderBy: { updatedAt: "desc" },
    });
    if (conn?.status === "connected") {
      status = conn.lastSyncError ? "degraded" : "ok";
      detail = conn.lastSyncAt
        ? `Connected · last sync ${conn.lastSyncAt.toISOString()}`
        : "Connected · awaiting first sync";
      if (conn.lastSyncError) detail += ` · ${conn.lastSyncError}`;
    } else if (conn?.status === "error") {
      status = "degraded";
      detail = conn.lastSyncError ?? "Sync error";
    } else if (conn?.status === "disconnected") {
      status = "unknown";
      detail = "Disconnected";
    }
  }

  return { status, detail, checkedAt };
}

export async function getHealthReport(userId?: string): Promise<HealthReport> {
  const checkedAt = new Date().toISOString();
  let dbStatus: HealthStatus = "ok";
  let dbDetail: string | undefined;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = "down";
    dbDetail = "Database connection failed";
  }

  const ig = await platformHealth(userId, "instagram", checkedAt);
  const fb = await platformHealth(userId, "facebook", checkedAt);

  return {
    phase: 2,
    subsystems: [
      {
        id: "auth",
        label: "App auth / session",
        status: "ok",
        detail: "Session layer available",
        checkedAt,
      },
      {
        id: "database",
        label: "Database",
        status: dbStatus,
        detail: dbDetail,
        checkedAt,
      },
      {
        id: "instagram",
        label: "Instagram",
        status: ig.status,
        detail: ig.detail,
        checkedAt,
      },
      {
        id: "facebook",
        label: "Facebook",
        status: fb.status,
        detail: fb.detail,
        checkedAt,
      },
    ],
  };
}
