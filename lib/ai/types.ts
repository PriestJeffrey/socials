export type AiCompleteInput = {
  system: string;
  user: string;
  timeoutMs?: number;
};

export type AiCompleteResult = {
  text: string;
  provider: "fixture" | "gemini";
};

export interface AiProvider {
  id: "fixture" | "gemini";
  complete(input: AiCompleteInput): Promise<AiCompleteResult>;
}

export type AiFeature =
  | "competitor_analyze"
  | "draft_assist"
  | "overview_why";
