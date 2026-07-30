/**
 * Rule-based repurpose — no LLM.
 * One source body → platform-flavored sibling drafts.
 */
export type RepurposePlatform =
  | "instagram"
  | "facebook"
  | "linkedin"
  | "threads"
  | "tiktok"
  | "youtube"
  | "pinterest"
  | "bluesky"
  | "reddit"
  | "mastodon"
  | "tumblr"
  | "twitch"
  | "x";

export function repurposeBody(
  source: string,
  target: RepurposePlatform,
): string {
  const trimmed = source.trim();
  switch (target) {
    case "instagram":
      return trimmed.length > 2200
        ? `${trimmed.slice(0, 2190)}…\n\n#pulseboard`
        : `${trimmed}\n\n#pulseboard`;
    case "facebook":
      return trimmed.length > 500
        ? `${trimmed.slice(0, 480)}…\n\n(What do you think?)`
        : `${trimmed}\n\n(What do you think?)`;
    case "linkedin":
      return trimmed.length > 3000
        ? trimmed.slice(0, 2990) + "…"
        : `${trimmed}\n\n— Curious how this lands for you.`;
    case "threads":
      return trimmed.length > 500
        ? `${trimmed.slice(0, 480)}…\n\nReply with your take.`
        : `${trimmed}\n\nReply with your take.`;
    case "tiktok":
      return trimmed.length > 2200
        ? `${trimmed.slice(0, 2180)}…\n\n(On-screen text / VO note)`
        : `${trimmed}\n\n(On-screen text / VO note)`;
    case "youtube":
      return trimmed.length > 5000
        ? `${trimmed.slice(0, 4980)}…\n\n(Description / pinned comment note)`
        : `${trimmed}\n\n(Description / pinned comment note)`;
    case "pinterest":
      return trimmed.length > 500
        ? `${trimmed.slice(0, 480)}…\n\n(Pin description / link note)`
        : `${trimmed}\n\n(Pin description / link note)`;
    case "bluesky":
      return trimmed.length > 300
        ? `${trimmed.slice(0, 297)}…`
        : trimmed;
    case "reddit":
      return trimmed.length > 300
        ? `${trimmed.slice(0, 297)}…`
        : trimmed;
    case "mastodon":
      return trimmed.length > 500
        ? `${trimmed.slice(0, 480)}…\n\nWhat do you think?`
        : `${trimmed}\n\nWhat do you think?`;
    case "tumblr":
      return trimmed.length > 1000
        ? `${trimmed.slice(0, 980)}…\n\n#pulseboard`
        : `${trimmed}\n\n#pulseboard`;
    case "twitch":
      return trimmed.length > 500
        ? `${trimmed.slice(0, 480)}…\n\n(On-stream / VO note)`
        : `${trimmed}\n\n(On-stream / VO note)`;
    case "x":
      return trimmed.length > 280 ? trimmed.slice(0, 277) + "…" : trimmed;
    default:
      return trimmed;
  }
}

export function previewForPlatform(body: string, platform: RepurposePlatform): string {
  if (platform === "x") return body.slice(0, 280);
  if (platform === "instagram") return body.slice(0, 500);
  return body.slice(0, 600);
}
