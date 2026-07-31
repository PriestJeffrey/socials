import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { readOverview } from "@/lib/analytics/pipeline";
import { prisma } from "@/lib/db/prisma";
import { getLinkedInConfig } from "@/lib/platforms/linkedin/config";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams?: Promise<{ synced?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const params = (await searchParams) ?? {};
  const board = await readOverview(user.id);
  const connections = await prisma.socialConnection.findMany({
    where: {
      userId: user.id,
      platform: { in: ["instagram", "facebook", "linkedin"] },
      status: { in: ["connected", "error"] },
    },
    select: { platform: true, lastSyncAt: true },
  });
  const anyConnected = connections.length > 0;
  const liConnected = connections.some((c) => c.platform === "linkedin");
  const liOnly =
    liConnected &&
    !connections.some((c) => c.platform === "instagram" || c.platform === "facebook");
  const liLiveSparse = liConnected && !getLinkedInConfig().useFixtures;

  return (
    <main className="pb-enter">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--pb-pulse-deep)]">
        Signal board
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-[var(--pb-ink)]">
        Overview
      </h1>
      {board.syncedAt ? (
        <p className="mt-2 text-xs text-[var(--pb-muted)]">
          Snapshot as of {board.syncedAt}
        </p>
      ) : null}
      {params.synced === "linkedin" ? (
        <p
          className="pb-panel mt-5 max-w-2xl rounded-xl px-4 py-3 text-sm text-[var(--pb-ink)]"
          data-testid="overview-li-synced"
        >
          LinkedIn sync finished. Live mode can publish, but historical posts and
          analytics need LinkedIn Community Management product access — without
          that, this board stays empty on purpose.
        </p>
      ) : null}
      {board.why ? (
        <p
          className="pb-panel mt-5 max-w-2xl rounded-xl px-4 py-3 text-sm text-[var(--pb-ink)]"
          data-testid="overview-why"
        >
          <span className="font-semibold text-[var(--pb-pulse-deep)]">Why: </span>
          {board.why}
        </p>
      ) : null}

      {board.empty ? (
        <div
          data-testid="overview-empty"
          className="pb-panel pb-panel-3d mt-8 max-w-xl rounded-2xl p-8"
        >
          <p className="font-display text-2xl font-semibold text-[var(--pb-ink)]">
            {liLiveSparse && liOnly
              ? "LinkedIn connected — board stays light"
              : anyConnected
                ? "Waiting on snapshots"
                : "Your board is ready"}
          </p>
          <p className="mt-3 text-[var(--pb-slate)]">
            {liLiveSparse && liOnly
              ? "Your LinkedIn account is linked for live publishing. Overview cards need analytics sync, which LinkedIn only opens with extra product access. Check Create / Calendar for posts you publish from Pulseboard."
              : anyConnected
                ? "A platform is linked. Sync from Settings to fill what's broken and what's working."
                : "Connect Instagram, Facebook, or LinkedIn and sync to see what's broken, what's working, and what to post next."}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/settings" className="pb-btn pb-btn-primary">
              {anyConnected ? "Back to Settings" : "Connect a platform"}
            </Link>
            <Link href="/settings/health" className="pb-btn pb-btn-ghost">
              System health
            </Link>
          </div>
        </div>
      ) : (
        <div
          className="mt-8 grid gap-4 sm:grid-cols-2 pb-overview-stage"
          data-testid="overview-board"
        >
          {[...board.issues, ...board.wins].map((card, i) => (
            <article
              key={`${card.platform ?? "x"}-${card.title}-${card.metricKey ?? i}`}
              className="pb-depth-card rounded-2xl p-5"
            >
              <p
                className="text-[0.7rem] font-semibold uppercase tracking-[0.14em]"
                style={{
                  color:
                    card.kind === "issue" ? "var(--pb-warn)" : "var(--pb-ok)",
                }}
              >
                {card.title}
                {card.platform ? ` · ${card.platform}` : ""}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--pb-ink-soft)]">
                {card.body}
              </p>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
