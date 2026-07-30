import { prisma } from "@/lib/db/prisma";
import { getMetaConfig } from "@/lib/platforms/instagram/config";
import { getLinkedInConfig } from "@/lib/platforms/linkedin/config";
import { getAiConfig } from "@/lib/ai/config";
import { sentryConfigured } from "@/lib/monitoring/sentry";

export type HealthStatus = "ok" | "degraded" | "unknown" | "down";

export type HealthSubsystem = {
  id:
    | "auth"
    | "database"
    | "instagram"
    | "facebook"
    | "linkedin"
    | "x"
    | "ai"
    | "runtime";
  label: string;
  status: HealthStatus;
  detail?: string;
  checkedAt: string;
};

export type HealthReport = {
  phase: 8;
  subsystems: HealthSubsystem[];
};

async function platformHealth(
  userId: string | undefined,
  platform: "instagram" | "facebook" | "linkedin",
  checkedAt: string,
  unconfiguredDetail: string,
  fixtureDetail: string,
  configuredDetail: string,
): Promise<Omit<HealthSubsystem, "id" | "label">> {
  let status: HealthStatus = "unknown";
  let detail = unconfiguredDetail;

  if (platform === "linkedin") {
    const cfg = getLinkedInConfig();
    detail = cfg.useFixtures
      ? fixtureDetail
      : cfg.configured
        ? configuredDetail
        : unconfiguredDetail;
  } else {
    const cfg = getMetaConfig();
    detail = cfg.useFixtures
      ? fixtureDetail
      : cfg.configured
        ? configuredDetail
        : unconfiguredDetail;
  }

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

function aiHealth(checkedAt: string): Omit<HealthSubsystem, "id" | "label"> {
  const cfg = getAiConfig();
  if (cfg.useFixtures) {
    return {
      status: "ok",
      detail: "Fixture AI mode enabled",
      checkedAt,
    };
  }
  if (cfg.apiKey) {
    return {
      status: "ok",
      detail: `Gemini configured (${cfg.model})`,
      checkedAt,
    };
  }
  return {
    status: "down",
    detail: "Set GEMINI_USE_FIXTURES=true or GEMINI_API_KEY",
    checkedAt,
  };
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

  const ig = await platformHealth(
    userId,
    "instagram",
    checkedAt,
    "META_APP_ID/SECRET missing (or set META_USE_FIXTURES=true)",
    "Fixture mode enabled",
    "Meta app configured — no connection yet",
  );
  const fb = await platformHealth(
    userId,
    "facebook",
    checkedAt,
    "META_APP_ID/SECRET missing (or set META_USE_FIXTURES=true)",
    "Fixture mode enabled",
    "Meta app configured — no connection yet",
  );
  const li = await platformHealth(
    userId,
    "linkedin",
    checkedAt,
    "LINKEDIN_CLIENT_ID/SECRET missing (or fixtures)",
    "Fixture mode enabled",
    "LinkedIn app configured — no connection yet",
  );

  return {
    phase: 8,
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
      { id: "instagram", label: "Instagram", ...ig },
      { id: "facebook", label: "Facebook", ...fb },
      { id: "linkedin", label: "LinkedIn", ...li },
      {
        id: "x",
        label: "X",
        status: "ok",
        detail: "Manual compose + copy only — no API / not auto-publish",
        checkedAt,
      },
      { id: "ai", label: "AI (Gemini)", ...aiHealth(checkedAt) },
      {
        id: "runtime",
        label: "Runtime / monitoring",
        status: "ok",
        detail: sentryConfigured()
          ? "SENTRY_DSN set (stub capture until SDK wired)"
          : `NODE_ENV=${process.env.NODE_ENV ?? "undefined"} · Sentry unset`,
        checkedAt,
      },
    ],
  };
}
