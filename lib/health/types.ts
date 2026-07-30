import { prisma } from "@/lib/db/prisma";
import { getMetaConfig } from "@/lib/platforms/instagram/config";
import { getLinkedInConfig } from "@/lib/platforms/linkedin/config";
import { getAiConfig } from "@/lib/ai/config";
import { getThreadsConfig } from "@/lib/platforms/threads/config";
import { getTikTokConfig } from "@/lib/platforms/tiktok/config";
import { getYouTubeConfig } from "@/lib/platforms/youtube/config";
import { getPinterestConfig } from "@/lib/platforms/pinterest/config";
import { getBlueskyConfig } from "@/lib/platforms/bluesky/config";
import { getRedditConfig } from "@/lib/platforms/reddit/config";
import { sentryConfigured } from "@/lib/monitoring/sentry";

export type HealthStatus = "ok" | "degraded" | "unknown" | "down";

export type HealthSubsystem = {
  id:
    | "auth"
    | "database"
    | "instagram"
    | "facebook"
    | "linkedin"
    | "threads"
    | "tiktok"
    | "youtube"
    | "pinterest"
    | "bluesky"
    | "reddit"
    | "x"
    | "ai"
    | "runtime";
  label: string;
  status: HealthStatus;
  detail?: string;
  checkedAt: string;
};

export type HealthReport = {
  phase: 15;
  subsystems: HealthSubsystem[];
};

/** Anonymous /api/health — no fixture or env-config posture. */
export type PublicLiveness = {
  ok: boolean;
  phase: 15;
  status: "ok" | "down";
};

export async function getPublicLiveness(): Promise<PublicLiveness> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, phase: 15, status: "ok" };
  } catch {
    return { ok: false, phase: 15, status: "down" };
  }
}

async function platformHealth(
  userId: string | undefined,
  platform:
    | "instagram"
    | "facebook"
    | "linkedin"
    | "threads"
    | "tiktok"
    | "youtube"
    | "pinterest"
    | "bluesky"
    | "reddit",
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
  } else if (platform === "threads") {
    const cfg = getThreadsConfig();
    detail = cfg.useFixtures
      ? fixtureDetail
      : cfg.configured
        ? configuredDetail
        : unconfiguredDetail;
  } else if (platform === "tiktok") {
    const cfg = getTikTokConfig();
    detail = cfg.useFixtures
      ? fixtureDetail
      : cfg.configured
        ? configuredDetail
        : unconfiguredDetail;
  } else if (platform === "youtube") {
    const cfg = getYouTubeConfig();
    detail = cfg.useFixtures
      ? fixtureDetail
      : cfg.configured
        ? configuredDetail
        : unconfiguredDetail;
  } else if (platform === "pinterest") {
    const cfg = getPinterestConfig();
    detail = cfg.useFixtures
      ? fixtureDetail
      : cfg.configured
        ? configuredDetail
        : unconfiguredDetail;
  } else if (platform === "bluesky") {
    const cfg = getBlueskyConfig();
    detail = cfg.useFixtures
      ? fixtureDetail
      : cfg.configured
        ? configuredDetail
        : unconfiguredDetail;
  } else if (platform === "reddit") {
    const cfg = getRedditConfig();
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
  const th = await platformHealth(
    userId,
    "threads",
    checkedAt,
    "THREADS_APP_ID/SECRET missing (or THREADS_USE_FIXTURES=true)",
    "Fixture mode enabled",
    "Threads app configured — no connection yet",
  );
  const tt = await platformHealth(
    userId,
    "tiktok",
    checkedAt,
    "TIKTOK_CLIENT_KEY/SECRET missing (or TIKTOK_USE_FIXTURES=true)",
    "Fixture mode enabled",
    "TikTok app configured — no connection yet",
  );
  const yt = await platformHealth(
    userId,
    "youtube",
    checkedAt,
    "YOUTUBE_CLIENT_ID/SECRET missing (or YOUTUBE_USE_FIXTURES=true)",
    "Fixture mode enabled",
    "YouTube app configured — no connection yet",
  );
  const pin = await platformHealth(
    userId,
    "pinterest",
    checkedAt,
    "PINTEREST_APP_ID/SECRET missing (or PINTEREST_USE_FIXTURES=true)",
    "Fixture mode enabled",
    "Pinterest app configured — no connection yet",
  );
  const bsky = await platformHealth(
    userId,
    "bluesky",
    checkedAt,
    "Set BLUESKY_USE_FIXTURES=true (live OAuth deferred)",
    "Fixture mode enabled",
    "Bluesky service URL set — live OAuth deferred",
  );
  const reddit = await platformHealth(
    userId,
    "reddit",
    checkedAt,
    "REDDIT_CLIENT_ID/SECRET missing (or REDDIT_USE_FIXTURES=true)",
    "Fixture mode enabled",
    "Reddit app configured — no connection yet",
  );

  return {
    phase: 15,
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
      { id: "threads", label: "Threads", ...th },
      { id: "tiktok", label: "TikTok", ...tt },
      { id: "youtube", label: "YouTube", ...yt },
      { id: "pinterest", label: "Pinterest", ...pin },
      { id: "bluesky", label: "Bluesky", ...bsky },
      { id: "reddit", label: "Reddit", ...reddit },
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
