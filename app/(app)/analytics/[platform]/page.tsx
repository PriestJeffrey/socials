import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import {
  isAnalyticsPlatform,
  readPlatformAnalytics,
} from "@/lib/analytics/platform";

export default async function PlatformAnalyticsPage({
  params,
}: {
  params: Promise<{ platform: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { platform: raw } = await params;
  if (!isAnalyticsPlatform(raw)) notFound();

  const board = await readPlatformAnalytics(user.id, raw);

  return (
    <main data-testid={`analytics-${board.platform}`}>
      <p className="text-xs text-[var(--pb-slate)]">
        <Link href="/analytics" className="underline">
          Analytics
        </Link>
        {" / "}
        {board.label}
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-[var(--pb-ink)]">
        {board.label}
      </h1>
      <p className="mt-2 max-w-xl text-sm text-[var(--pb-slate)]">{board.focus}</p>
      {board.syncedAt ? (
        <p className="mt-2 text-xs text-[var(--pb-slate)]">
          Snapshot as of {board.syncedAt}
        </p>
      ) : null}

      {board.mode === "manual" ? (
        <div
          className="mt-8 max-w-xl rounded-lg border border-[var(--pb-line)] bg-white/80 p-6"
          data-testid="analytics-x-manual"
        >
          <p className="font-medium text-[var(--pb-ink)]">No API metrics</p>
          <p className="mt-2 text-sm text-[var(--pb-slate)]">
            X stays compose + copy in V1. We do not invent engagement charts.
          </p>
          <Link
            href="/x"
            className="mt-4 inline-block rounded-md bg-[var(--pb-pulse)] px-4 py-2 text-sm font-semibold text-white"
          >
            Open Compose X
          </Link>
        </div>
      ) : board.empty ? (
        <div
          className="mt-8 max-w-xl rounded-lg border border-[var(--pb-line)] bg-white/80 p-6"
          data-testid="analytics-empty"
        >
          <p className="font-medium text-[var(--pb-ink)]">
            {board.connected ? "Waiting on snapshots" : "Not connected"}
          </p>
          <p className="mt-2 text-sm text-[var(--pb-slate)]">
            {board.connected
              ? "Sync from Settings to fill this platform board."
              : `Connect ${board.label} in Settings, then sync.`}
          </p>
          <Link
            href="/settings"
            className="mt-4 inline-block rounded-md bg-[var(--pb-pulse)] px-4 py-2 text-sm font-semibold text-white"
          >
            Open Settings
          </Link>
        </div>
      ) : (
        <>
          <section className="mt-8" data-testid="analytics-metrics">
            <h2 className="font-display text-xl font-semibold text-[var(--pb-ink)]">
              Metrics
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {board.metrics.map((m) => (
                <li
                  key={m.key}
                  data-testid={`metric-${m.key}`}
                  className="rounded-lg border border-[var(--pb-line)] bg-white/80 px-4 py-3"
                >
                  <p className="text-xs uppercase tracking-wide text-[var(--pb-slate)]">
                    {m.label}
                    {m.highlighted ? " · focus" : ""}
                  </p>
                  <p className="mt-1 font-display text-2xl font-semibold text-[var(--pb-ink)]">
                    {m.display}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {board.heuristics.length > 0 ? (
            <section className="mt-10" data-testid="analytics-heuristics">
              <h2 className="font-display text-xl font-semibold text-[var(--pb-ink)]">
                Heuristics
              </h2>
              <ul className="mt-4 max-w-2xl space-y-2">
                {board.heuristics.map((h) => (
                  <li
                    key={h.id}
                    data-testid={`heuristic-${h.id}`}
                    className="rounded-lg border border-[var(--pb-line)] bg-white/80 px-4 py-3 text-sm"
                  >
                    <span
                      className="font-semibold uppercase tracking-wide"
                      style={{
                        color: h.flag ? "var(--pb-warn)" : "var(--pb-ok)",
                      }}
                    >
                      {h.flag ? "Flagged" : "OK"} · {h.id.replace(/_/g, " ")}
                    </span>
                    <p className="mt-1 text-[var(--pb-slate)]">{h.reason}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="mt-10" data-testid="analytics-posts">
            <h2 className="font-display text-xl font-semibold text-[var(--pb-ink)]">
              Recent posts
            </h2>
            {board.posts.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--pb-slate)]">
                No posts in snapshots yet.
              </p>
            ) : (
              <ul className="mt-4 max-w-2xl space-y-3">
                {board.posts.map((p) => (
                  <li
                    key={p.id}
                    data-testid={`analytics-post-${p.id}`}
                    className="rounded-lg border border-[var(--pb-line)] bg-white/80 px-4 py-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--pb-slate)]">
                      <span>{p.kind ?? "post"}</span>
                      <span>
                        {p.publishedAt
                          ? new Date(p.publishedAt).toLocaleString()
                          : "unpublished time"}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-3 text-[var(--pb-ink)]">
                      {p.caption ?? "(no caption)"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
