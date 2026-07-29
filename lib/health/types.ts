import { prisma } from "@/lib/db/prisma";
import { getMetaConfig } from "@/lib/platforms/instagram/config";

export type HealthStatus = "ok" | "degraded" | "unknown" | "down";

export type HealthSubsystem = {
  id: "auth" | "database" | "instagram";
  label: string;
  status: HealthStatus;
  detail?: string;
  checkedAt: string;
};

export type HealthReport = {
  phase: 1;
  subsystems: HealthSubsystem[];
};

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

  const cfg = getMetaConfig();
  let igStatus: HealthStatus = "unknown";
  let igDetail = cfg.useFixtures
    ? "Fixture mode enabled"
    : cfg.configured
      ? "Meta app configured — no connection yet"
      : "META_APP_ID/SECRET missing (or set META_USE_FIXTURES=true)";

  if (userId) {
    const conn = await prisma.socialConnection.findFirst({
      where: { userId, platform: "instagram" },
      orderBy: { updatedAt: "desc" },
    });
    if (conn?.status === "connected") {
      igStatus = conn.lastSyncError ? "degraded" : "ok";
      igDetail = conn.lastSyncAt
        ? `Connected · last sync ${conn.lastSyncAt.toISOString()}`
        : "Connected · awaiting first sync";
      if (conn.lastSyncError) igDetail += ` · ${conn.lastSyncError}`;
    } else if (conn?.status === "error") {
      igStatus = "degraded";
      igDetail = conn.lastSyncError ?? "Sync error";
    } else if (conn?.status === "disconnected") {
      igStatus = "unknown";
      igDetail = "Disconnected";
    }
  }

  return {
    phase: 1,
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
        status: igStatus,
        detail: igDetail,
        checkedAt,
      },
    ],
  };
}
