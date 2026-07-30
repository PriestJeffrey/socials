import type { AiCompleteInput, AiCompleteResult, AiProvider } from "@/lib/ai/types";
import { getAiConfig } from "@/lib/ai/config";

export const geminiAiProvider: AiProvider = {
  id: "gemini",

  async complete(input: AiCompleteInput): Promise<AiCompleteResult> {
    const cfg = getAiConfig();
    if (!cfg.apiKey) throw new Error("GEMINI_API_KEY missing");

    const timeoutMs = input.timeoutMs ?? 20_000;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `${input.system}\n\n---\n\n${input.user}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 1024,
          },
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(
          `Gemini HTTP ${res.status}: ${body.slice(0, 200).replace(/key=[^&\s]+/gi, "key=[REDACTED]")}`,
        );
      }
      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text =
        data.candidates?.[0]?.content?.parts
          ?.map((p) => p.text ?? "")
          .join("")
          .trim() ?? "";
      if (!text) throw new Error("Gemini returned empty text");
      return { text, provider: "gemini" };
    } finally {
      clearTimeout(timer);
    }
  },
};
