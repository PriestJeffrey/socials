import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { processPendingJobs } from "@/lib/jobs/runner";

function secretsEqual(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    timingSafeEqual(b, b);
    return false;
  }
  return timingSafeEqual(a, b);
}

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  if (bearer && secretsEqual(bearer, secret)) return true;

  const headerSecret = request.headers.get("x-cron-secret") ?? "";
  return Boolean(headerSecret) && secretsEqual(headerSecret, secret);
}

/** Global job drain for scheduled publishes/syncs. Requires CRON_SECRET. */
export async function POST(request: NextRequest) {
  if (!process.env.CRON_SECRET?.trim()) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 503 },
    );
  }
  if (!authorized(request)) {
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
