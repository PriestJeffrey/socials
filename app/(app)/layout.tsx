import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { getSessionUser } from "@/lib/auth/session";
import { ThemeToggle } from "@/components/theme/theme-toggle";

const NAV = [
  { href: "/overview", label: "Overview", testId: "nav-overview" },
  { href: "/analytics", label: "Analytics", testId: "nav-analytics" },
  { href: "/create", label: "Create", testId: "nav-create" },
  { href: "/x", label: "X", testId: "nav-x" },
  { href: "/calendar", label: "Calendar", testId: "nav-calendar" },
  { href: "/competitors", label: "Competitors", testId: "nav-competitors" },
  { href: "/approvals", label: "Approvals", testId: "nav-approvals" },
  { href: "/settings", label: "Settings", testId: "nav-settings" },
] as const;

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="relative mx-auto flex min-h-screen max-w-7xl">
      <aside className="pb-shell-aside sticky top-0 hidden h-screen w-60 shrink-0 flex-col p-5 md:flex">
        <div className="flex items-center justify-between gap-2">
          <div className="font-display text-lg font-semibold tracking-tight text-[var(--pb-ink)]">
            <span className="pb-brand-mark" aria-hidden />
            Pulseboard
          </div>
          <ThemeToggle />
        </div>
        <nav className="mt-9 flex flex-1 flex-col gap-0.5">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-testid={item.testId}
              className="pb-nav-link"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-[var(--pb-line)] pt-4">
          <div className="truncate text-xs text-[var(--pb-muted)]">{user.email}</div>
          <form action={logoutAction} className="mt-2">
            <button
              type="submit"
              data-testid="nav-logout"
              className="text-sm font-semibold text-[var(--pb-ink)] transition-colors hover:text-[var(--pb-pulse-deep)]"
            >
              Log out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 overflow-x-auto border-b border-[var(--pb-line)] bg-[color-mix(in_srgb,var(--pb-card-solid)_40%,transparent)] px-3 py-3 backdrop-blur-md md:hidden">
          <span className="shrink-0 font-display text-sm font-semibold text-[var(--pb-ink)]">
            <span className="pb-brand-mark" aria-hidden />
            Pulseboard
          </span>
          <ThemeToggle className="!h-8 !w-8 shrink-0" />
          <div className="flex gap-1 pl-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                data-testid={`m-${item.testId}`}
                className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--pb-slate)] hover:bg-[color-mix(in_srgb,var(--pb-pulse)_12%,transparent)] hover:text-[var(--pb-ink)]"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="relative z-[1] flex-1 px-4 py-7 md:px-8 md:py-9">{children}</div>
      </div>
    </div>
  );
}
