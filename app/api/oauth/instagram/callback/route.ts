import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getAdapter } from "@/lib/platforms";
import { processPendingJobs } from "@/lib/jobs/runner";

export async function GET(request: Request) {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", appUrl));
  }

  const { searchParams } = new URL(request.url);
  const error = searchParams.get("error_description") ?? searchParams.get("error");
  if (error) {
    return NextResponse.redirect(
      new URL(`/settings?error=${encodeURIComponent(error)}`, appUrl),
    );
  }

  const query: Record<string, string> = {};
  searchParams.forEach((v, k) => {
    query[k] = v;
  });

  try {
    const ig = getAdapter("instagram");
    if (!ig) throw new Error("Instagram adapter missing");
    await ig.handleOAuthCallback(user.id, query);
    await processPendingJobs(3);
    return NextResponse.redirect(new URL("/settings?connected=instagram", appUrl));
  } catch (err) {
    const message = err instanceof Error ? err.message : "OAuth failed";
    // Never include tokens in redirect
    const safe = message.replace(/token|secret|bearer/gi, "[redacted]");
    return NextResponse.redirect(
      new URL(`/settings?error=${encodeURIComponent(safe)}`, appUrl),
    );
  }
}
