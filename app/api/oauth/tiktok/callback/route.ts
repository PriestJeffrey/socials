import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getAdapter } from "@/lib/platforms";
import { processPendingJobs } from "@/lib/jobs/runner";

function redact(message: string): string {
  return message.replace(/token|secret|bearer/gi, "[redacted]");
}

export async function GET(request: Request) {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", appUrl));
  }

  const { searchParams } = new URL(request.url);
  const error =
    searchParams.get("error_description") ?? searchParams.get("error");
  if (error) {
    return NextResponse.redirect(
      new URL(`/settings?error=${encodeURIComponent(redact(error))}`, appUrl),
    );
  }

  const query: Record<string, string> = {};
  searchParams.forEach((v, k) => {
    query[k] = v;
  });

  try {
    const tt = getAdapter("tiktok");
    if (!tt) throw new Error("TikTok adapter missing");
    await tt.handleOAuthCallback(user.id, query);
    await processPendingJobs(3, user.id);
    return NextResponse.redirect(
      new URL("/settings?connected=tiktok", appUrl),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "OAuth failed";
    return NextResponse.redirect(
      new URL(`/settings?error=${encodeURIComponent(redact(message))}`, appUrl),
    );
  }
}
