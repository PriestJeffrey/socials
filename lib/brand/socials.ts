/**
 * Pulseboard brand social profiles (marketing links - not user connections).
 * Set `live: true` and real handles when profiles exist - avoids UAT 404s.
 */
export type BrandSocialPlatform =
  | "instagram"
  | "facebook"
  | "x"
  | "threads"
  | "tiktok";

export type BrandSocialLink = {
  id: BrandSocialPlatform;
  label: string;
  handle: string;
  href: string;
  /** When false, render non-navigating icon (no dead links). */
  live: boolean;
  /**
   * Brand glyph color. Use `mono` for X/Threads so light/dark themes
   * pick `--pb-social-mono` instead of a fixed black that vanishes on dark.
   */
  color: string | "mono";
};

const HANDLE = "pulseboard";

export const brandSocialLinks: BrandSocialLink[] = [
  {
    id: "instagram",
    label: "Instagram",
    handle: `@${HANDLE}`,
    href: `https://www.instagram.com/${HANDLE}`,
    live: false,
    color: "#E1306C",
  },
  {
    id: "facebook",
    label: "Facebook",
    handle: HANDLE,
    href: `https://www.facebook.com/${HANDLE}`,
    live: false,
    color: "#1877F2",
  },
  {
    id: "x",
    label: "X",
    handle: `@${HANDLE}`,
    href: `https://x.com/${HANDLE}`,
    live: false,
    color: "mono",
  },
  {
    id: "threads",
    label: "Threads",
    handle: `@${HANDLE}`,
    href: `https://www.threads.net/@${HANDLE}`,
    live: false,
    color: "mono",
  },
  {
    id: "tiktok",
    label: "TikTok",
    handle: `@${HANDLE}`,
    href: `https://www.tiktok.com/@${HANDLE}`,
    live: false,
    color: "#FE2C55",
  },
];
