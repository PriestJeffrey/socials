"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signupAction } from "@/app/actions/auth";
import type { AuthErr } from "@/lib/auth/service";

type State = AuthErr | null;

async function action(_prev: State, formData: FormData): Promise<State> {
  const result = await signupAction(formData);
  if (result && "ok" in result && result.ok === false) return result;
  return null;
}

export function SignupForm() {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} data-testid="signup-form" className="mt-8 space-y-4">
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
          className="pb-input"
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
          autoComplete="new-password"
          data-testid="auth-password"
          className="pb-input"
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
        className="pb-btn pb-btn-primary w-full disabled:opacity-60"
      >
        {pending ? "Creating…" : "Get started"}
      </button>
      <p className="text-sm text-[var(--pb-slate)]">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-[var(--pb-pulse-deep)]">
          Log in
        </Link>
      </p>
    </form>
  );
}
