import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getAdapter } from "@/lib/platforms";
import { getDiscordConfig } from "@/lib/platforms/discord/config";
import { rateLimiter } from "@/lib/rate-limit";

export async function GET() {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", appUrl));
  }

  const limit = await rateLimiter.check(
    `oauth:discord:start:${user.id}`,
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

  const cfg = getDiscordConfig();
  if (!cfg.configured) {
    return NextResponse.redirect(
      new URL(
        "/settings?error=" +
          encodeURIComponent(
            "Set DISCORD_CLIENT_ID/SECRET or DISCORD_USE_FIXTURES=true",
          ),
        appUrl,
      ),
    );
  }

  try {
    const discord = getAdapter("discord");
    if (!discord) throw new Error("Discord adapter missing");
    const url = await discord.beginOAuth(user.id);
    return NextResponse.redirect(url);
  } catch (err) {
    const message = err instanceof Error ? err.message : "OAuth start failed";
    const safe = message.replace(/token|secret|bearer/gi, "[redacted]");
    return NextResponse.redirect(
      new URL(`/settings?error=${encodeURIComponent(safe)}`, appUrl),
    );
  }
}
