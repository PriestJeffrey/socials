import { SignupForm } from "@/components/auth/signup-form";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";

export default async function SignupPage() {
  const user = await getSessionUser();
  if (user) redirect("/overview");

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="relative w-full max-w-md">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-6 -z-10 hidden rounded-3xl border border-[var(--pb-line)] bg-white/40 shadow-[0_30px_80px_rgba(11,31,42,0.1)] md:block"
          style={{ transform: "rotateX(4deg) rotateY(-6deg)" }}
        />
        <div className="rounded-2xl border border-[var(--pb-line)] bg-white/90 p-8 shadow-sm backdrop-blur">
          <h1 className="font-display text-3xl font-semibold text-[var(--pb-ink)]">
            Pulseboard
          </h1>
          <p className="mt-2 text-sm text-[var(--pb-slate)]">Create your account</p>
          <SignupForm />
        </div>
      </div>
    </main>
  );
}
