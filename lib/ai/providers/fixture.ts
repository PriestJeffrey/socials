import type { AiCompleteInput, AiCompleteResult, AiProvider } from "@/lib/ai/types";
import { createHash } from "crypto";

function hashHint(s: string): string {
  return createHash("sha256").update(s).digest("hex").slice(0, 8);
}

export const fixtureAiProvider: AiProvider = {
  id: "fixture",

  async complete(input: AiCompleteInput): Promise<AiCompleteResult> {
    const blob = `${input.system}\n${input.user}`.toLowerCase();
    let text: string;

    if (blob.includes("competitor") || blob.includes("hook")) {
      const hint = hashHint(input.user);
      text = JSON.stringify({
        hook: `Fixture hook (${hint}): Stop scrolling — here's the one move that compounds.`,
        structure: "Hook → proof → CTA",
        cta: "Save this for your next post",
        tags: ["fixture", "awareness"],
      });
    } else if (blob.includes("draft") || blob.includes("compose")) {
      text =
        "Fixture draft: Here's a clear take your audience can act on today. Lead with the tension, prove it in one line, then invite a reply.";
    } else if (blob.includes("sentiment")) {
      text = JSON.stringify({
        label: "neutral",
        score: 0.12,
        note: "Fixture sentiment — mostly neutral tone",
      });
    } else if (blob.includes("why") || blob.includes("overview")) {
      text =
        "Fixture why: Recent snapshot numbers point to soft engagement — tighten the opening line and post when your audience is already active.";
    } else {
      text = "Fixture AI response.";
    }

    return { text, provider: "fixture" };
  },
};
