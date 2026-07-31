import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { listAnalyticsHub } from "@/lib/analytics/platform";

export default async function AnalyticsHubPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const hubs = await listAnalyticsHub(user.id);

  return (
    <main data-testid="analytics-hub" className="pb-enter">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--pb-pulse-deep)]">
        Deep cut
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-[var(--pb-ink)]">
        Analytics
      </h1>
      <p className="mt-2 max-w-xl text-sm text-[var(--pb-slate)]">
        Platform-specific views from synced snapshots - not one generic
        template. Overview stays the win/issue board; this is the deeper cut.
      </p>

      <ul className="mt-8 grid gap-3 sm:grid-cols-2 pb-overview-stage">
        {hubs.map((h) => (
          <li key={h.platform}>
            <Link
              href={h.href}
              data-testid={`analytics-hub-${h.platform}`}
              className="pb-depth-card block rounded-2xl px-4 py-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-[var(--pb-ink)]">{h.label}</span>
                <span className="text-xs uppercase tracking-wide text-[var(--pb-slate)]">
                  {h.mode === "manual"
                    ? "manual"
                    : h.connected
                      ? h.status ?? "connected"
                      : "not connected"}
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--pb-slate)]">
                {h.mode === "manual"
                  ? "Compose + copy only - no API metrics"
                  : h.lastSyncAt
                    ? `Last sync ${h.lastSyncAt}`
                    : "Connect and sync in Settings"}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
