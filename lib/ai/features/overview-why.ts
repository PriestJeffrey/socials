import { cacheStore } from "@/lib/cache";
import { runAiFeature } from "@/lib/ai/gateway";
import { sanitizeAiOutput } from "@/lib/ai/redact";
import type { OverviewCard } from "@/lib/analytics/pipeline";

export async function explainOverviewWhy(input: {
  userId: string;
  cards: OverviewCard[];
}): Promise<string | null> {
  if (input.cards.length === 0) return null;

  const cacheKey = `overview:why:v1:${input.userId}`;
  const cached = await cacheStore.get(cacheKey);
  if (cached) return cached;

  const summary = input.cards
    .slice(0, 6)
    .map(
      (c) =>
        `${c.kind}/${c.platform ?? "n/a"}: ${c.body}` +
        (typeof c.value === "number" ? ` (value=${c.value})` : ""),
    )
    .join("\n");

  try {
    const { text } = await runAiFeature({
      userId: input.userId,
      feature: "overview_why",
      system: [
        "Explain overview metrics in plain language for a social operator.",
        "2 sentences max. No formulas rewrite. No secrets. Do not invent numbers.",
      ].join(" "),
      user: `Overview card summaries:\n${summary}`,
    });
    const why = sanitizeAiOutput(text, 400);
    await cacheStore.set(cacheKey, why, 120_000);
    return why;
  } catch {
    return null;
  }
}
