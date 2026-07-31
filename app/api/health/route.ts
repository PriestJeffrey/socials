import { NextResponse } from "next/server";
import { getHealthReport, getPublicLiveness } from "@/lib/health/types";
import { getSessionUser } from "@/lib/auth/session";

/**
 * Authenticated: full HealthReport (fixture/config posture + connection state).
 * Anonymous: liveness only - no fixture flags or secret-config hints.
 */
export async function GET() {
  const user = await getSessionUser().catch(() => null);
  if (!user) {
    const live = await getPublicLiveness();
    return NextResponse.json(live);
  }
  const report = await getHealthReport(user.id);
  return NextResponse.json(report);
}
