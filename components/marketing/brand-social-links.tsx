import type { CSSProperties } from "react";
import { brandSocialLinks } from "@/lib/brand/socials";
import { SocialGlyph } from "@/components/marketing/social-icons";

function tileStyle(color: string | "mono"): CSSProperties | undefined {
  if (color === "mono") return undefined;
  return { color };
}

/** Brand marketing profiles only - not in-app connection status. */
function brandTitle(label: string, handle: string, live: boolean) {
  return live
    ? `Pulseboard on ${label} (${handle})`
    : `Pulseboard on ${label} — brand profile not live yet`;
}

export function BrandSocialLinks({
  className = "",
}: {
  className?: string;
}) {
  return (
    <nav
      aria-label="Pulseboard brand profiles (not product connections)"
      data-testid="brand-social-links"
      className={`pb-social-dock ${className}`}
    >
      {brandSocialLinks.map((link) => {
        const title = brandTitle(link.label, link.handle, link.live);
        const style = tileStyle(link.color);

        if (link.live) {
          return (
            <a
              key={link.id}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={`brand-social-${link.id}`}
              title={title}
              aria-label={title}
              className="pb-social-tile"
              style={style}
            >
              <SocialGlyph id={link.id} />
            </a>
          );
        }

        return (
          <span
            key={link.id}
            aria-disabled="true"
            aria-label={title}
            data-testid={`brand-social-${link.id}`}
            title={title}
            className="pb-social-tile"
            style={style}
          >
            <SocialGlyph id={link.id} />
          </span>
        );
      })}
    </nav>
  );
}
