import { rateLimiter } from "@/lib/rate-limit";
import { writeAudit } from "@/lib/audit/log";
import { getAiConfig } from "@/lib/ai/config";
import { redactSecrets, sanitizeAiOutput } from "@/lib/ai/redact";
import { fixtureAiProvider } from "@/lib/ai/providers/fixture";
import { geminiAiProvider } from "@/lib/ai/providers/gemini";
import type { AiFeature, AiProvider } from "@/lib/ai/types";

const AI_LIMIT = 20;
const AI_WINDOW_MS = 60 * 60 * 1000;

export function selectAiProvider(): AiProvider {
  const cfg = getAiConfig();
  if (cfg.useFixtures) return fixtureAiProvider;
  return geminiAiProvider;
}

export async function runAiFeature(input: {
  userId: string;
  feature: AiFeature;
  system: string;
  user: string;
}): Promise<{ text: string; provider: "fixture" | "gemini" }> {
  const cfg = getAiConfig();
  if (!cfg.configured) {
    throw new Error(
      "AI not configured — set GEMINI_USE_FIXTURES=true or GEMINI_API_KEY",
    );
  }

  const rl = await rateLimiter.check(
    `ai:${input.userId}`,
    AI_LIMIT,
    AI_WINDOW_MS,
  );
  if (!rl.ok) {
    throw new Error(
      `AI rate limit — try again in ${Math.ceil(rl.retryAfterMs / 1000)}s`,
    );
  }

  const system = redactSecrets(input.system);
  const user = redactSecrets(input.user);
  const provider = selectAiProvider();

  try {
    const result = await provider.complete({ system, user, timeoutMs: 20_000 });
    const text = sanitizeAiOutput(result.text);
    await writeAudit({
      userId: input.userId,
      action: "ai.completed",
      metadata: {
        feature: input.feature,
        provider: result.provider,
        bytesIn: system.length + user.length,
        bytesOut: text.length,
      },
    });
    return { text, provider: result.provider };
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI failed";
    await writeAudit({
      userId: input.userId,
      action: "ai.failed",
      metadata: {
        feature: input.feature,
        provider: provider.id,
        error: message.slice(0, 200),
      },
    });
    throw err instanceof Error ? err : new Error(message);
  }
}
