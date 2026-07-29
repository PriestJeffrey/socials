import { getHealthReport } from "@/lib/health/types";

export default async function HealthPage() {
  const report = await getHealthReport();

  return (
    <main data-testid="settings-health">
      <h1 className="font-display text-3xl font-semibold text-[var(--pb-ink)]">
        Health
      </h1>
      <p data-testid="health-placeholder" className="mt-2 text-sm text-[var(--pb-slate)]">
        Systems will appear as they&apos;re connected.
      </p>
      <ul className="mt-8 space-y-3">
        {report.subsystems.map((s) => (
          <li
            key={s.id}
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
                      : s.status === "down"
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
