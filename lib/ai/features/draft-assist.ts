import { runAiFeature } from "@/lib/ai/gateway";
import { sanitizeAiOutput } from "@/lib/ai/redact";

export async function draftAssist(input: {
  userId: string;
  platform: string;
  goalTag?: string | null;
  seed?: string | null;
}): Promise<string> {
  const { text } = await runAiFeature({
    userId: input.userId,
    feature: "draft_assist",
    system: [
      "You write short social posts for Pulseboard.",
      "Match the platform tone. No hashtag spam. No credentials.",
      "Return plain post body only — no markdown fences.",
    ].join(" "),
    user: [
      `Compose a draft for platform=${input.platform}.`,
      input.goalTag ? `Goal: ${input.goalTag}` : "Goal: awareness",
      input.seed?.trim()
        ? `Seed notes: ${input.seed.trim().slice(0, 500)}`
        : "Seed: helpful operator tip with a clear CTA.",
    ].join("\n"),
  });

  return sanitizeAiOutput(text, 2000);
}
