import { prisma } from "@/lib/db/prisma";

export type HealthStatus = "ok" | "degraded" | "unknown" | "down";

export type HealthSubsystem = {
  id: "auth" | "database";
  label: string;
  status: HealthStatus;
  detail?: string;
  checkedAt: string;
};

export type HealthReport = {
  phase: 0;
  subsystems: HealthSubsystem[];
};

export async function getHealthReport(): Promise<HealthReport> {
  const checkedAt = new Date().toISOString();
  let dbStatus: HealthStatus = "ok";
  let dbDetail: string | undefined;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = "down";
    dbDetail = "Database connection failed";
  }

  return {
    phase: 0,
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
    ],
  };
}
