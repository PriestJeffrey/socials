import { SignupForm } from "@/components/auth/signup-form";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default async function SignupPage() {
  const user = await getSessionUser();
  if (user) redirect("/overview");

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16">
      <div className="pb-mesh" aria-hidden>
        <div className="pb-mesh__orb pb-mesh__orb--a" />
        <div className="pb-mesh__orb pb-mesh__orb--c" />
      </div>
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center font-display text-lg font-semibold text-[var(--pb-ink)]"
          >
            <span className="pb-brand-mark" aria-hidden />
            Pulseboard
          </Link>
          <ThemeToggle />
        </div>
        <div className="pb-panel pb-panel-3d rounded-2xl p-8">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--pb-ink)]">
            Start your board
          </h1>
          <p className="mt-2 text-sm text-[var(--pb-slate)]">Create your account</p>
          <SignupForm />
        </div>
      </div>
    </main>
  );
}
