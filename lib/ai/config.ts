export type AiConfig = {
  apiKey: string;
  model: string;
  useFixtures: boolean;
  configured: boolean;
};

export function getAiConfig(): AiConfig {
  const apiKey = process.env.GEMINI_API_KEY?.trim() ?? "";
  const model =
    process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
  // Default fixtures on unless explicitly live with a key
  const useFixtures =
    process.env.GEMINI_USE_FIXTURES === "true" ||
    (process.env.GEMINI_USE_FIXTURES !== "false" && !apiKey) ||
    !apiKey;
  return {
    apiKey,
    model,
    useFixtures,
    configured: useFixtures || Boolean(apiKey),
  };
}
