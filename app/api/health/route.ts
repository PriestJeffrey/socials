import { NextResponse } from "next/server";
import { getHealthReport } from "@/lib/health/types";

export async function GET() {
  const report = await getHealthReport();
  return NextResponse.json(report);
}
