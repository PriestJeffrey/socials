import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getAdapter } from "@/lib/platforms";
import { getTumblrConfig } from "@/lib/platforms/tumblr/config";
import { rateLimiter } from "@/lib/rate-limit";

export async function GET() {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", appUrl));
  }

  const limit = await rateLimiter.check(
    `oauth:tumblr:start:${user.id}`,
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

  const cfg = getTumblrConfig();
  if (!cfg.configured) {
    return NextResponse.redirect(
      new URL(
        "/settings?error=" +
          encodeURIComponent(
            "Set TUMBLR_CLIENT_ID/SECRET or TUMBLR_USE_FIXTURES=true",
          ),
        appUrl,
      ),
    );
  }

  try {
    const tumblr = getAdapter("tumblr");
    if (!tumblr) throw new Error("Tumblr adapter missing");
    const url = await tumblr.beginOAuth(user.id);
    return NextResponse.redirect(url);
  } catch (err) {
    const message = err instanceof Error ? err.message : "OAuth start failed";
    const safe = message.replace(/token|secret|bearer/gi, "[redacted]");
    return NextResponse.redirect(
      new URL(`/settings?error=${encodeURIComponent(safe)}`, appUrl),
    );
  }
}
