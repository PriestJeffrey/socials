import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getAdapter } from "@/lib/platforms";
import { getRedditConfig } from "@/lib/platforms/reddit/config";
import { rateLimiter } from "@/lib/rate-limit";

export async function GET() {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", appUrl));
  }

  const limit = await rateLimiter.check(
    `oauth:reddit:start:${user.id}`,
    10,
    15 * 60 * 1000,
  );
  if (!limit.ok) {
    return NextResponse.redirect(
      new URL(
        `/settings?error=${encodeURIComponent("Too many connect attempts. Try again later.")}`,
        appUrl,
      ),
    );
  }

  const cfg = getRedditConfig();
  if (!cfg.configured) {
    return NextResponse.redirect(
      new URL(
        "/settings?error=" +
          encodeURIComponent(
            "Set REDDIT_CLIENT_ID/SECRET or REDDIT_USE_FIXTURES=true",
          ),
        appUrl,
      ),
    );
  }

  try {
    const reddit = getAdapter("reddit");
    if (!reddit) throw new Error("Reddit adapter missing");
    const url = await reddit.beginOAuth(user.id);
    return NextResponse.redirect(url);
  } catch (err) {
    const message = err instanceof Error ? err.message : "OAuth start failed";
    const safe = message.replace(/token|secret|bearer/gi, "[redacted]");
    return NextResponse.redirect(
      new URL(`/settings?error=${encodeURIComponent(safe)}`, appUrl),
    );
  }
}
