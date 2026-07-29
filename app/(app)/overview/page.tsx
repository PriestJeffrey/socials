import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { readOverview } from "@/lib/analytics/pipeline";

export default async function OverviewPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const board = await readOverview(user.id);

  return (
    <main>
      <h1 className="font-display text-3xl font-semibold text-[var(--pb-ink)]">
        Overview
      </h1>
      {board.syncedAt ? (
        <p className="mt-2 text-xs text-[var(--pb-slate)]">
          Snapshot as of {board.syncedAt}
        </p>
      ) : null}

      {board.empty ? (
        <div
          data-testid="overview-empty"
          className="mt-8 max-w-xl rounded-xl border border-[var(--pb-line)] bg-white/80 p-8"
        >
          <p className="font-display text-xl font-semibold text-[var(--pb-ink)]">
            Your board is ready
          </p>
          <p className="mt-3 text-[var(--pb-slate)]">
            Connect Instagram and sync to see what&apos;s broken, what&apos;s
            working, and what to post next.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/settings"
              className="rounded-md bg-[var(--pb-pulse)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--pb-pulse-deep)]"
            >
              Connect Instagram
            </Link>
            <Link
              href="/settings/health"
              className="rounded-md border border-[var(--pb-line)] bg-white/70 px-4 py-2.5 text-sm font-semibold text-[var(--pb-ink)] transition-colors hover:bg-white"
            >
              System health
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2" data-testid="overview-board">
          {[...board.issues, ...board.wins].map((card, i) => (
            <article
              key={`${card.title}-${card.metricKey ?? i}`}
              className="rounded-xl border border-[var(--pb-line)] bg-white/80 p-5"
            >
              <p
                className="text-xs font-semibold uppercase tracking-wide"
                style={{
                  color:
                    card.kind === "issue" ? "var(--pb-warn)" : "var(--pb-ok)",
                }}
              >
                {card.title}
              </p>
              <p className="mt-2 text-sm text-[var(--pb-slate)]">{card.body}</p>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
