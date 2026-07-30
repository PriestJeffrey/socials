import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getHealthReport } from "@/lib/health/types";

export default async function HealthPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const report = await getHealthReport(user.id);

  return (
    <main data-testid="settings-health">
      <h1 className="font-display text-3xl font-semibold text-[var(--pb-ink)]">
        Health
      </h1>
      <p data-testid="health-summary" className="mt-2 text-sm text-[var(--pb-slate)]">
        Phase {report.phase} — auth, database, platforms (IG/FB/LI/Threads/TikTok/X),
        AI, analytics snapshots, and runtime.
      </p>
      <ul className="mt-8 space-y-3">
        {report.subsystems.map((s) => (
          <li
            key={s.id}
            data-testid={`health-${s.id}`}
            className="rounded-lg border border-[var(--pb-line)] bg-white/80 px-4 py-3"
          >
            <div className="flex items-center justify-between gap-4">
              <span className="font-medium text-[var(--pb-ink)]">{s.label}</span>
              <span
                className="text-xs font-semibold uppercase tracking-wide"
                style={{
                  color:
                    s.status === "ok"
                      ? "var(--pb-ok)"
                      : s.status === "down" || s.status === "degraded"
                        ? "var(--pb-warn)"
                        : "var(--pb-slate)",
                }}
              >
                {s.status}
              </span>
            </div>
            {s.detail ? (
              <p className="mt-1 text-sm text-[var(--pb-slate)]">{s.detail}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </main>
  );
}
