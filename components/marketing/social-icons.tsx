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
    case "x":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path d="M3 4h5.2l4.1 5.8L17.7 4H21l-6.4 7.3L21.5 20h-5.2l-4.4-6.2L7 20H3.5l6.8-7.8L3 4z" />
        </svg>
      );
    case "threads":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path d="M12 3c-3 0-6 2.2-6 6.2 0 2.7 1.4 4.4 3.4 5.2-.2.4-.5 1-.5 1.7 0 2.2 1.8 3.9 4.6 3.9 3.5 0 5.5-2.4 5.5-5.6V13c1 .6 1.8 1.4 1.8 2.8 0 1.7-1.5 2.8-3.4 2.8-.9 0-1.7-.2-2.4-.6l-.6 1.7c.9.5 2 .8 3.2.8 3.1 0 5.2-2 5.2-4.7 0-2.2-1.3-3.5-3.3-4.3.1-.5.2-1 .2-1.5C19.7 5.6 16.6 3 12 3zm0 1.8c2.9 0 4.7 1.7 4.7 4.4 0 .4 0 .8-.1 1.1-1-.2-2.1-.3-3.4-.3h-1.2c-2.4 0-3.9.9-3.9 2.8 0 1.6 1.1 2.6 2.7 2.6.9 0 1.7-.3 2.3-.9.3-.8.5-1.8.5-2.7 1.2 0 2.3.1 3.3.4v.9c0 2.2-1.2 3.8-3.7 3.8-1.8 0-2.8-1-2.8-2.2 0-.5.2-.9.4-1.2-1.3-.5-2.1-1.6-2.1-3.2 0-2.7 2.2-4.3 5.3-4.3z" />
        </svg>
      );
    case "tiktok":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path d="M16 3v3.2c1.4 1.1 3.1 1.7 5 1.8v3.1c-1.9-.1-3.6-.7-5-1.7v6.4c0 3.4-2.7 6.2-6.1 6.2S3.8 19.2 3.8 15.8 6.5 9.6 9.9 9.6c.4 0 .8 0 1.1.1v3.3c-.3-.1-.7-.2-1.1-.2-1.6 0-2.9 1.3-2.9 3s1.3 3 2.9 3 2.9-1.3 2.9-3V3H16z" />
        </svg>
      );
    default:
      return null;
  }
}
