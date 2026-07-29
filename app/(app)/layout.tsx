import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { getSessionUser } from "@/lib/auth/session";

const NAV = [
  { href: "/overview", label: "Overview", testId: "nav-overview" },
  { href: "/analytics", label: "Analytics ▾", testId: "nav-analytics" },
  { href: "/create", label: "Create", testId: "nav-create" },
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
    <div className="mx-auto flex min-h-screen max-w-7xl gap-0 md:gap-8">
      <aside className="hidden w-56 shrink-0 border-r border-[var(--pb-line)] bg-white/50 p-5 md:block">
        <div className="font-display text-lg font-semibold text-[var(--pb-ink)]">
          Pulseboard
        </div>
        <nav className="mt-8 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-testid={item.testId}
              className="block rounded-md px-3 py-2 text-sm font-medium text-[var(--pb-slate)] hover:bg-black/5 hover:text-[var(--pb-ink)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-10 border-t border-[var(--pb-line)] pt-4 text-xs text-[var(--pb-slate)]">
          <div className="truncate">{user.email}</div>
          <form action={logoutAction} className="mt-2">
            <button
              type="submit"
              data-testid="nav-logout"
              className="text-sm font-medium text-[var(--pb-ink)] hover:underline"
            >
              Log out
            </button>
          </form>
        </div>
      </aside>
      <div className="flex-1 px-4 py-6 md:px-2 md:py-8">{children}</div>
    </div>
  );
}
