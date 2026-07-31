import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { HeroSignalStack } from "@/components/marketing/hero-signal-stack";
import { BrandSocialLinks } from "@/components/marketing/brand-social-links";
import { ThemeToggle } from "@/components/theme/theme-toggle";

const NAV = [
  { href: "#shift", label: "The shift" },
  { href: "#product", label: "Product" },
  { href: "#platforms", label: "Platforms" },
  { href: "#trust", label: "Trust" },
] as const;

export default async function LandingPage() {
  let user = null;
  try {
    user = await getSessionUser();
  } catch {
    user = null;
  }
  if (user) redirect("/overview");

  return (
    <div className="mkt-shell">
      <div className="pb-mesh" aria-hidden>
        <div className="pb-mesh__orb pb-mesh__orb--a" />
        <div className="pb-mesh__orb pb-mesh__orb--b" />
        <div className="pb-mesh__orb pb-mesh__orb--c" />
      </div>

      <header className="mkt-nav">
        <div className="mkt-nav-inner relative z-10">
          <Link
            href="/"
            className="font-display text-lg font-semibold tracking-tight text-[var(--pb-ink)]"
          >
            <span className="pb-brand-mark" aria-hidden />
            Pulseboard
          </Link>
          <nav className="mkt-nav-links" aria-label="Landing">
            {NAV.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/login"
              data-testid="cta-log-in"
              className="pb-btn pb-btn-ghost !py-2 !px-3 hidden sm:inline-flex"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              data-testid="cta-get-started"
              className="pb-btn pb-btn-primary !py-2 !px-4"
            >
              Create your board
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero - Integrevise-style: value H1 + support + CTA + proof strip */}
        <section className="mkt-hero relative z-10">
          <div className="mkt-hero-inner">
            <div className="pb-enter">
              <p className="mkt-eyebrow">Pulseboard</p>
              <h1 data-testid="landing-brand">
                Know what&apos;s broken, what&apos;s working, and what to post next.
              </h1>
              <p className="mkt-hero-copy" data-testid="landing-tagline">
                When the feed moves faster than your gut, Pulseboard turns platform
                signals into a clear board - so every post starts from evidence,
                not guesswork.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/signup" className="pb-btn pb-btn-primary px-6 py-3.5">
                  Create your board
                </Link>
                <Link href="/login" className="pb-btn pb-btn-ghost px-6 py-3.5">
                  Log in
                </Link>
              </div>
              <div className="mkt-award-rail" aria-label="V1 platforms">
                <div className="mkt-award">Instagram · sync + board signals</div>
                <div className="mkt-award">Facebook · Page snapshots</div>
                <div className="mkt-award">LinkedIn · velocity + dwell</div>
                <div className="mkt-award">X · compose + copy only</div>
              </div>
            </div>
            <div className="relative min-h-[280px] lg:min-h-[420px]">
              <HeroSignalStack />
            </div>
          </div>
        </section>

        {/* The shift */}
        <section id="shift" className="mkt-band relative z-10">
          <div className="mkt-section">
            <p className="mkt-eyebrow">The shift</p>
            <h2 className="mkt-h2">Proof of signal, not just proof of posting.</h2>
            <p className="mkt-lead">
              Until now, a calendar full of posts felt like progress. In the AI
              era of endless drafts, the post alone proves nothing about what
              actually moved the audience.
            </p>
            <div className="mkt-shift-grid">
              <article className="mkt-shift-cell">
                <h3>Until now</h3>
                <p>
                  You shipped content and hoped the next spike would explain
                  itself. Metrics lived in five tabs. Decisions lived in Slack.
                </p>
              </article>
              <article className="mkt-shift-cell">
                <h3>With Pulseboard</h3>
                <p>
                  Snapshots land on one board: what&apos;s broken, what&apos;s
                  working, and a concrete next post - tied to the platforms you
                  actually run.
                </p>
              </article>
              <article className="mkt-shift-cell">
                <h3>What it certifies</h3>
                <p>
                  Operators can defend every publish: the why is visible, the
                  draft is reviewable, and X stays honest as copy-only.
                </p>
              </article>
            </div>
            <p className="mt-10 text-center text-xs font-semibold uppercase tracking-[0.16em] text-[var(--pb-muted)]">
              Built for operators who live in IG · FB · LinkedIn · X
            </p>
            <div className="mkt-logo-rail" aria-hidden>
              <span>Instagram</span>
              <span>Facebook</span>
              <span>LinkedIn</span>
              <span>X</span>
            </div>
          </div>
        </section>

        {/* Product features */}
        <section id="product" className="relative z-10">
          <div className="mkt-section !pb-0">
            <article className="mkt-feature">
              <div className="mkt-feature-copy">
                <p className="mkt-eyebrow">Assurance behind every post</p>
                <h2 className="mkt-h2">A board you can stand behind.</h2>
                <p className="mkt-lead">
                  Pulseboard surfaces issues and wins from synced snapshots, then
                  pairs them with a clear next move - so publish decisions are
                  evidence-backed, not vibes.
                </p>
              </div>
              <div className="mkt-mock" aria-hidden>
                <div className="mkt-mock-row">
                  <div className="mkt-mock-chip">
                    <strong style={{ color: "var(--pb-warn)" }}>Broken</strong>
                    <p>Reach decay on Reels - save rate still climbing.</p>
                  </div>
                  <div className="mkt-mock-chip">
                    <strong style={{ color: "var(--pb-ok)" }}>Working</strong>
                    <p>Carousels outperform singles on saves this week.</p>
                  </div>
                  <div className="mkt-mock-chip">
                    <strong style={{ color: "var(--pb-pulse)" }}>Next post</strong>
                    <p>Hook + CTA draft ready for Instagram review.</p>
                  </div>
                </div>
              </div>
            </article>

            <article className="mkt-feature mkt-feature--flip">
              <div className="mkt-feature-copy">
                <p className="mkt-eyebrow">Deeper platform insight</p>
                <h2 className="mkt-h2">Not one generic analytics template.</h2>
                <p className="mkt-lead">
                  Each connected platform gets its own cut - heuristics, focus
                  metrics, and recent posts from snapshots. Overview stays the
                  win/issue board; Analytics is the deep dive.
                </p>
              </div>
              <div className="mkt-mock mkt-mock--flip" aria-hidden>
                <div className="mkt-mock-row">
                  <div className="mkt-mock-chip">
                    <strong>LinkedIn · first-hour velocity</strong>
                    <p>Comment quality up; fatigue flag quiet.</p>
                  </div>
                  <div className="mkt-mock-chip">
                    <strong>Instagram · save rate</strong>
                    <p>Carousel cluster holding above baseline.</p>
                  </div>
                  <div className="mkt-mock-chip">
                    <strong>Facebook · Page reach</strong>
                    <p>Link posts lagging vs native video.</p>
                  </div>
                </div>
              </div>
            </article>

            <article className="mkt-feature">
              <div className="mkt-feature-copy">
                <p className="mkt-eyebrow">Workflow intelligence</p>
                <h2 className="mkt-h2">Draft → review → publish - with honesty.</h2>
                <p className="mkt-lead">
                  Create once, repurpose across platforms, run sentiment, and
                  move through approvals. Local/fixture publish stays explicit
                  until live Graph posting is wired. X never auto-publishes.
                </p>
              </div>
              <div className="mkt-mock" aria-hidden>
                <div className="mkt-mock-row">
                  <div className="mkt-mock-chip">
                    <strong>Approvals</strong>
                    <p>draft → in review → approved → published</p>
                  </div>
                  <div className="mkt-mock-chip">
                    <strong>AI assist</strong>
                    <p>Suggest a body from goal + seed - review before save.</p>
                  </div>
                  <div className="mkt-mock-chip">
                    <strong>X compose</strong>
                    <p>Copy to clipboard. Paste into X yourself.</p>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>

        {/* Evidence / case-style */}
        <section className="mkt-band relative z-10">
          <div className="mkt-section">
            <p className="mkt-eyebrow">Evidence from the board</p>
            <h2 className="mkt-h2">What the calendar never tells you.</h2>
            <p className="mkt-lead">
              A full queue of scheduled posts can still hide decay, fatigue, and
              the wrong format bet. Pulseboard makes those gaps visible before
              you spend another week guessing.
            </p>
            <div className="mkt-case-grid">
              <article className="mkt-case">
                <div className="mkt-case-visual" aria-hidden />
                <div className="mkt-case-body">
                  <p className="mkt-case-meta">Signal · Instagram + Facebook</p>
                  <h3>What reach charts hide</h3>
                  <p>
                    Saves climb while reach softens - the board separates vanity
                    spikes from formats that actually compound.
                  </p>
                  <div className="mkt-stat-row">
                    <div className="mkt-stat">
                      <strong>3</strong>
                      <span>signal lanes on Overview</span>
                    </div>
                    <div className="mkt-stat">
                      <strong>1</strong>
                      <span>next-post recommendation</span>
                    </div>
                  </div>
                </div>
              </article>
              <article className="mkt-case">
                <div
                  className="mkt-case-visual"
                  style={{
                    background:
                      "radial-gradient(ellipse at 70% 30%, color-mix(in srgb, var(--pb-signal) 30%, transparent), transparent 55%), linear-gradient(145deg, var(--pb-fog), var(--pb-chalk))",
                  }}
                  aria-hidden
                />
                <div className="mkt-case-body">
                  <p className="mkt-case-meta">Workflow · Create + Approvals</p>
                  <h3>What written drafts cannot defend</h3>
                  <p>
                    AI can draft endlessly. Approvals, sentiment, and fixture-honest
                    publish keep the human in the loop - without pretending live
                    Graph is done.
                  </p>
                  <div className="mkt-stat-row">
                    <div className="mkt-stat">
                      <strong>4</strong>
                      <span>V1 platforms in scope</span>
                    </div>
                    <div className="mkt-stat">
                      <strong>0</strong>
                      <span>silent auto-posts to X</span>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="relative z-10">
          <div className="mkt-section">
            <p className="mkt-eyebrow">How operators run Pulseboard</p>
            <h2 className="mkt-h2">Connect. Sync. Decide. Ship.</h2>
            <p className="mkt-lead">
              Pulseboard uses an evidence-based loop: connect platforms, sync
              snapshots, read the board, then draft and approve what to post next.
            </p>
            <div className="mkt-shift-grid mt-8">
              <article className="mkt-shift-cell">
                <h3>01 · Connect</h3>
                <p>Link Instagram, Facebook, or LinkedIn. X stays manual compose.</p>
              </article>
              <article className="mkt-shift-cell">
                <h3>02 · Sync</h3>
                <p>Pull snapshots into Overview and platform analytics - fixtures or live.</p>
              </article>
              <article className="mkt-shift-cell">
                <h3>03 · Act</h3>
                <p>Create, repurpose, approve, schedule - publish locally until Graph is live.</p>
              </article>
            </div>
          </div>
        </section>

        {/* Platforms / sectors */}
        <section id="platforms" className="mkt-band relative z-10">
          <div className="mkt-section">
            <p className="mkt-eyebrow">Platforms using Pulseboard</p>
            <h2 className="mkt-h2">V1 core - the surfaces that matter first.</h2>
            <div className="mkt-sector-grid">
              <article className="mkt-sector">
                <h3>Meta + LinkedIn</h3>
                <p>
                  OAuth connections, encrypted tokens, snapshot sync, and
                  platform-specific analytics for Instagram, Facebook Pages, and
                  LinkedIn.
                </p>
                <Link href="/signup" className="mt-5 inline-flex text-sm font-semibold text-[var(--pb-pulse-deep)]">
                  Start with a board →
                </Link>
              </article>
              <article className="mkt-sector">
                <h3>X · copy-only</h3>
                <p>
                  Compose locally and paste into X yourself. No OAuth theatre, no
                  fake engagement charts - capability stays honest: manualCopy.
                </p>
                <Link href="/signup" className="mt-5 inline-flex text-sm font-semibold text-[var(--pb-pulse-deep)]">
                  Open the product →
                </Link>
              </article>
            </div>
          </div>
        </section>

        {/* Voices */}
        <section className="relative z-10">
          <div className="mkt-section">
            <p className="mkt-eyebrow">From operators who live in the feed</p>
            <h2 className="mkt-h2">Clarity over another dashboard.</h2>
            <div className="mkt-quote-grid">
              <article className="mkt-quote">
                <blockquote>
                  “The board finally answers the only question that matters after
                  sync: what&apos;s broken, what&apos;s working, and what I should
                  post next.”
                </blockquote>
                <footer>
                  <strong>Social lead</strong>
                  Multi-platform operator
                </footer>
              </article>
              <article className="mkt-quote">
                <blockquote>
                  “Approvals and fixture-honest publish mean we can run the
                  workflow without pretending live Graph shipping is finished.”
                </blockquote>
                <footer>
                  <strong>Content ops</strong>
                  Agency pod
                </footer>
              </article>
              <article className="mkt-quote">
                <blockquote>
                  “X as copy-only is a feature. We stopped waiting for an API we
                  don&apos;t need just to draft a tweet.”
                </blockquote>
                <footer>
                  <strong>Founder-operator</strong>
                  Solo brand
                </footer>
              </article>
            </div>
          </div>
        </section>

        {/* Trust */}
        <section id="trust" className="mkt-band relative z-10">
          <div className="mkt-section">
            <p className="mkt-eyebrow">Trust and control</p>
            <h2 className="mkt-h2">Built for operator control.</h2>
            <p className="mkt-lead">
              Sessions, encrypted tokens, tenancy, and honest fixture gates -
              so your board stays yours while platforms stay connected.
            </p>
            <div className="mkt-trust-grid">
              <article className="mkt-trust-item">
                <h3>Encrypted connections</h3>
                <p>
                  OAuth tokens stay AES-GCM encrypted at rest. Overview reads
                  snapshots - not live token sprawl in the UI.
                </p>
              </article>
              <article className="mkt-trust-item">
                <h3>Tenant isolation</h3>
                <p>
                  Drafts, jobs, and connections are scoped to your user. No
                  shared “demo soup” in production paths.
                </p>
              </article>
              <article className="mkt-trust-item">
                <h3>Honest publish gates</h3>
                <p>
                  Local/fixture publish is labeled. Live Graph stays deferred
                  until credentials and wiring are real.
                </p>
              </article>
              <article className="mkt-trust-item">
                <h3>Account delete</h3>
                <p>
                  Explicit confirm phrase wipes user, sessions, connections,
                  drafts, snapshots, and jobs - no silent half-delete.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative z-10">
          <div className="mkt-section">
            <div className="mkt-cta-band">
              <h2>Create your board.</h2>
              <p>
                See what&apos;s broken, what&apos;s working, and what to post next -
                on Instagram, Facebook, LinkedIn, and copy-only X.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link href="/signup" className="pb-btn pb-btn-primary px-6 py-3.5">
                  Create your board
                </Link>
                <Link href="/login" className="pb-btn pb-btn-ghost px-6 py-3.5">
                  Log in
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="mkt-footer relative z-10">
        <div className="mkt-footer-inner">
          <div>
            <p className="font-display text-lg font-semibold text-[var(--pb-ink)]">
              <span className="pb-brand-mark" aria-hidden />
              Pulseboard
            </p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-[var(--pb-slate)]">
              Know what&apos;s broken, what&apos;s working, and what to post next.
            </p>
          </div>
          <div>
            <h4>Product</h4>
            <Link href="#shift">The shift</Link>
            <Link href="#product">Product</Link>
            <Link href="#platforms">Platforms</Link>
            <Link href="/signup">Create your board</Link>
          </div>
          <div>
            <h4>Account</h4>
            <Link href="/login">Log in</Link>
            <Link href="/signup">Sign up</Link>
            <Link href="#trust">Trust</Link>
          </div>
        </div>
        <div className="mkt-footer-bottom">
          <p>© {new Date().getFullYear()} Pulseboard</p>
          <BrandSocialLinks />
        </div>
      </footer>
    </div>
  );
}
