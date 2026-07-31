import type { CSSProperties } from "react";
import { brandSocialLinks } from "@/lib/brand/socials";
import { SocialGlyph } from "@/components/marketing/social-icons";

function tileStyle(color: string | "mono"): CSSProperties | undefined {
  if (color === "mono") return undefined;
  return { color };
}

export function BrandSocialLinks({
  className = "",
}: {
  className?: string;
}) {
  return (
    <nav
      aria-label="Pulseboard on social"
      data-testid="brand-social-links"
      className={`pb-social-dock ${className}`}
    >
      {brandSocialLinks.map((link) => {
        const title = link.live
          ? `${link.label} ${link.handle}`
          : `${link.label} (coming soon)`;
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
              aria-label={link.label}
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
            aria-label={`${link.label} (coming soon)`}
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
