import { brandSocialLinks } from "@/lib/brand/socials";
import { SocialGlyph } from "@/components/marketing/social-icons";

const iconChrome =
  "inline-flex h-11 w-11 items-center justify-center rounded-[10px] border border-[var(--pb-line)] bg-gradient-to-b from-white to-[#e8efeb] transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pb-pulse)]";

export function BrandSocialLinks({
  className = "",
}: {
  className?: string;
}) {
  return (
    <nav
      aria-label="Pulseboard on social"
      data-testid="brand-social-links"
      className={`inline-flex flex-wrap items-center gap-1.5 rounded-full border border-[var(--pb-line)] bg-white/75 p-1.5 shadow-[0_10px_24px_rgba(11,31,42,0.08)] ${className}`}
    >
      {brandSocialLinks.map((link) => {
        const title = link.live
          ? `${link.label} ${link.handle}`
          : `${link.label} (coming soon)`;

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
              className={`${iconChrome} hover:opacity-80`}
              style={{ color: link.color }}
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
            className={`${iconChrome} cursor-default opacity-90`}
            style={{ color: link.color }}
          >
            <SocialGlyph id={link.id} />
          </span>
        );
      })}
    </nav>
  );
}
