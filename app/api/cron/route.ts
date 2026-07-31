import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { processPendingJobs } from "@/lib/jobs/runner";
import { isWeakSecret } from "@/lib/security/secrets";

function secretsEqual(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    timingSafeEqual(b, b);
    return false;
  }
  return timingSafeEqual(a, b);
}

function cronSecret(): string | null {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || isWeakSecret(secret)) return null;
  return secret;
}

function authorized(request: NextRequest, secret: string): boolean {
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ")
    ? header.slice("Bearer ".length)
    : "";
  if (bearer && secretsEqual(bearer, secret)) return true;

  const headerSecret = request.headers.get("x-cron-secret") ?? "";
  return Boolean(headerSecret) && secretsEqual(headerSecret, secret);
}

/** Global job drain for scheduled publishes/syncs. Requires CRON_SECRET. */
export async function POST(request: NextRequest) {
  const secret = cronSecret();
  if (!secret) {
    return NextResponse.json(
      {
        error:
          "CRON_SECRET is not configured or is a known placeholder - set a strong secret",
      },
      { status: 503 },
    );
  }
  if (!authorized(request, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limitRaw = request.nextUrl.searchParams.get("limit");
  const limit = Math.min(
    50,
    Math.max(1, Number.parseInt(limitRaw ?? "10", 10) || 10),
  );
  const done = await processPendingJobs(limit);
  return NextResponse.json({ ok: true, processed: done });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
