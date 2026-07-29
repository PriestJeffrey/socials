import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { HeroSignalStack } from "@/components/marketing/hero-signal-stack";
import { BrandSocialLinks } from "@/components/marketing/brand-social-links";

export default async function LandingPage() {
  let user = null;
  try {
    user = await getSessionUser();
  } catch {
    // DB may be offline during local preview — still show marketing landing
    user = null;
  }
  if (user) redirect("/overview");

  return (
    <main className="relative flex min-h-screen flex-col">
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <span className="font-display text-xl font-semibold text-[var(--pb-ink)]">
          Pulseboard
        </span>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            data-testid="cta-log-in"
            className="rounded-md px-3 py-2 text-sm font-medium text-[var(--pb-ink)] transition-colors hover:bg-black/5"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            data-testid="cta-get-started"
            className="rounded-md bg-[var(--pb-pulse)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--pb-pulse-deep)]"
          >
            Create your board
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-6 pb-16 pt-8 lg:grid-cols-[0.42fr_0.58fr] lg:gap-12 lg:pt-16">
        <div className="pb-enter">
          <h1
            data-testid="landing-brand"
            className="font-display text-5xl font-semibold tracking-tight text-[var(--pb-ink)] sm:text-6xl"
          >
            Pulseboard
          </h1>
          <p
            data-testid="landing-tagline"
            className="mt-5 max-w-xl text-xl leading-snug text-[var(--pb-ink)] sm:text-2xl"
          >
            Know what&apos;s broken, what&apos;s working, and what to post next.
          </p>
          <p className="mt-4 max-w-md text-[var(--pb-slate)]">
            Social signal, clear priorities, and your next post — in one board.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-md bg-[var(--pb-pulse)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--pb-pulse-deep)]"
            >
              Create your board
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-[var(--pb-line)] bg-white/70 px-5 py-3 text-sm font-semibold text-[var(--pb-ink)] transition-colors hover:bg-white"
            >
              Log in
            </Link>
          </div>
        </div>
        <HeroSignalStack />
      </section>

      <footer className="relative z-10 border-t border-[var(--pb-line)] bg-white/40">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--pb-slate)]">Follow Pulseboard</p>
          <BrandSocialLinks />
        </div>
      </footer>
    </main>
  );
}
