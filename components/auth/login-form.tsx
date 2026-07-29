"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "@/app/actions/auth";
import type { AuthErr } from "@/lib/auth/service";

type State = AuthErr | null;

async function action(_prev: State, formData: FormData): Promise<State> {
  const result = await loginAction(formData);
  if (result && "ok" in result && result.ok === false) return result;
  return null;
}

export function LoginForm() {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} data-testid="login-form" className="mt-8 space-y-4">
      <div>
        <label htmlFor="email" className="text-sm font-medium text-[var(--pb-ink)]">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          data-testid="auth-email"
          className="mt-1 w-full rounded-md border border-[var(--pb-line)] bg-white px-3 py-2 outline-none ring-[var(--pb-pulse)] focus:ring-2"
        />
      </div>
      <div>
        <label htmlFor="password" className="text-sm font-medium text-[var(--pb-ink)]">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="current-password"
          data-testid="auth-password"
          className="mt-1 w-full rounded-md border border-[var(--pb-line)] bg-white px-3 py-2 outline-none ring-[var(--pb-pulse)] focus:ring-2"
        />
      </div>
      {state?.message ? (
        <p role="alert" data-testid="auth-error" className="text-sm text-[var(--pb-warn)]">
          {state.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        data-testid="auth-submit"
        className="w-full rounded-md bg-[var(--pb-pulse)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--pb-pulse-deep)] disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Log in"}
      </button>
      <p className="text-sm text-[var(--pb-slate)]">
        New here?{" "}
        <Link href="/signup" className="font-medium text-[var(--pb-pulse-deep)]">
          Get started
        </Link>
      </p>
    </form>
  );
}
