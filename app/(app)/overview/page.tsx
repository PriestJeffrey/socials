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
      {board.empty ? (
        <div
          data-testid="overview-empty"
          className="mt-8 max-w-xl rounded-xl border border-[var(--pb-line)] bg-white/80 p-8"
        >
          <p className="font-display text-xl font-semibold text-[var(--pb-ink)]">
            Your board is ready
          </p>
          <p className="mt-3 text-[var(--pb-slate)]">
            Nothing to score yet — connect a channel when Instagram lands in the
            next phase. Until then, your signal board is waiting.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/settings"
              className="rounded-md bg-[var(--pb-pulse)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--pb-pulse-deep)]"
            >
              Open settings
            </Link>
            <Link
              href="/settings/health"
              className="rounded-md border border-[var(--pb-line)] bg-white/70 px-4 py-2.5 text-sm font-semibold text-[var(--pb-ink)] transition-colors hover:bg-white"
            >
              System health
            </Link>
          </div>
        </div>
      ) : null}
    </main>
  );
}
