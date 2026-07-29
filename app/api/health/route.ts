import { NextResponse } from "next/server";
import { getHealthReport } from "@/lib/health/types";
import { getSessionUser } from "@/lib/auth/session";

export async function GET() {
  const user = await getSessionUser().catch(() => null);
  const report = await getHealthReport(user?.id);
  return NextResponse.json(report);
}
