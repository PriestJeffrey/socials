import Link from "next/link";

export default function SettingsPage() {
  return (
    <main>
      <h1 className="font-display text-3xl font-semibold text-[var(--pb-ink)]">
        Settings
      </h1>
      <ul className="mt-6 space-y-2 text-sm">
        <li>
          <Link
            href="/settings/health"
            className="font-medium text-[var(--pb-pulse-deep)] hover:underline"
          >
            Health
          </Link>
        </li>
      </ul>
    </main>
  );
}
