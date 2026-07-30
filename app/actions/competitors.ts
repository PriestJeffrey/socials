"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import { analyzeCompetitorPaste } from "@/lib/ai/features/analyze-competitor";

const PLATFORMS = new Set([
  "instagram",
  "facebook",
  "linkedin",
  "threads",
  "tiktok",
  "youtube",
  "pinterest",
  "bluesky",
  "reddit",
  "mastodon",
  "tumblr",
  "twitch",
  "x",
  "generic",
]);

export async function analyzeCompetitorAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const platform = String(formData.get("platform") ?? "generic").trim();
  const sourceText = String(formData.get("sourceText") ?? "");

  if (!PLATFORMS.has(platform)) {
    redirect("/competitors?error=Invalid%20platform");
  }

  try {
    const { itemId } = await analyzeCompetitorPaste({
      userId: user.id,
      platform,
      sourceText,
    });
    revalidatePath("/competitors");
    redirect(`/competitors?saved=${itemId}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analyze failed";
    redirect(`/competitors?error=${encodeURIComponent(message)}`);
  }
}
