"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import type { AuthActionState } from "@/lib/auth/validation";
import { authClient } from "@/lib/auth/client";
import { getAuthErrorMessage, validateSignInInput } from "@/lib/auth/validation";

import { FieldError } from "./auth-card";
import { GoogleSignInButton } from "./google-sign-in-button";

export function SignInForm() {
  const router = useRouter();
  const [state, setState] = useState<AuthActionState>({});
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({});

    const formData = new FormData(event.currentTarget);
    const parsed = validateSignInInput({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!parsed.ok) {
      setState({ fieldErrors: parsed.fieldErrors });
      return;
    }

    setPending(true);
    try {
      const { error } = await authClient.signIn.email({
        ...parsed.values,
        callbackURL: "/app",
      });

      if (error) {
        setState({ error: getAuthErrorMessage("sign-in", error) });
        return;
      }
    } catch (error) {
      setState({ error: getAuthErrorMessage("sign-in", error) });
      return;
    } finally {
      setPending(false);
    }

    router.push("/app");
  }

  return (
    <div className="grid gap-5">
      <GoogleSignInButton />
      <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-stone-500">
        <span className="h-px flex-1 bg-stone-200" />
        or
        <span className="h-px flex-1 bg-stone-200" />
      </div>
      <form onSubmit={handleSubmit} className="grid gap-4">
        {state.error ? <p className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700">{state.error}</p> : null}
        <label className="grid gap-2 text-sm font-medium text-stone-800">
          Email
          <input
            name="email"
            type="email"
            autoComplete="email"
            aria-describedby="email-error"
            className="min-h-11 rounded-md border border-stone-300 px-3 text-base outline-none focus:border-emerald-700"
          />
          <FieldError id="email-error" message={state.fieldErrors?.email} />
        </label>
        <label className="grid gap-2 text-sm font-medium text-stone-800">
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            aria-describedby="password-error"
            className="min-h-11 rounded-md border border-stone-300 px-3 text-base outline-none focus:border-emerald-700"
          />
          <FieldError id="password-error" message={state.fieldErrors?.password} />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
