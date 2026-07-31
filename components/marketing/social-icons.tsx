import type { BrandSocialPlatform } from "@/lib/brand/socials";

const iconClass = "h-4 w-4 fill-current";

export function SocialGlyph({
  id,
  className = iconClass,
}: {
  id: BrandSocialPlatform;
  className?: string;
}) {
  switch (id) {
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm5 4.5A4.5 4.5 0 1 0 16.5 12 4.5 4.5 0 0 0 12 7.5zm0 2A2.5 2.5 0 1 1 9.5 12 2.5 2.5 0 0 1 12 9.5zM17.5 7a1 1 0 1 0 1 1 1 1 0 0 0-1-1z" />
        </svg>
      );
    case "facebook":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path d="M14 9h3V6h-3c-1.7 0-3 1.3-3 3v2H8v3h3v7h3v-7h3l1-3h-4V9c0-.6.4-1 1-1z" />
        </svg>
      );
    case "linkedin":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path d="M6.5 9.5H3.7V20h2.8V9.5zM5.1 4A1.6 1.6 0 1 0 5.1 7.2 1.6 1.6 0 0 0 5.1 4zM20.3 20h-2.8v-5.6c0-1.5-.6-2.5-2-2.5-1 0-1.6.7-1.9 1.4-.1.2-.1.6-.1.9V20H10.7s.04-9.3 0-10.5h2.8v1.5c.4-.6 1.1-1.7 2.8-1.7 2 0 3.5 1.3 3.5 4.2V20z" />
        </svg>
      );
    case "x":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path d="M3 4h5.2l4.1 5.8L17.7 4H21l-6.4 7.3L21.5 20h-5.2l-4.4-6.2L7 20H3.5l6.8-7.8L3 4z" />
        </svg>
      );
    default:
      return null;
  }
}
