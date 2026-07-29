import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getAdapter } from "@/lib/platforms";
import { getMetaConfig } from "@/lib/platforms/instagram/config";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", process.env.APP_URL ?? "http://localhost:3000"));
  }

  const cfg = getMetaConfig();
  if (!cfg.configured) {
    return NextResponse.redirect(
      new URL(
        "/settings?error=" +
          encodeURIComponent("Set META_APP_ID/SECRET or META_USE_FIXTURES=true"),
        process.env.APP_URL ?? "http://localhost:3000",
      ),
    );
  }

  try {
    const ig = getAdapter("instagram");
    if (!ig) throw new Error("Instagram adapter missing");
    const url = await ig.beginOAuth(user.id);
    return NextResponse.redirect(url);
  } catch (err) {
    const message = err instanceof Error ? err.message : "OAuth start failed";
    return NextResponse.redirect(
      new URL(
        `/settings?error=${encodeURIComponent(message)}`,
        process.env.APP_URL ?? "http://localhost:3000",
      ),
    );
  }
}
