"use client";

import { useState } from "react";

import { authClient } from "@/lib/auth/client";
import { getAuthErrorMessage } from "@/lib/auth/validation";

export function GoogleSignInButton() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleGoogleSignIn() {
    setPending(true);
    setError("");

    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/app",
        errorCallbackURL: "/auth/sign-in",
      });

      if ("error" in result && result.error) {
        setError(getAuthErrorMessage("provider", result.error));
      }
    } catch (caught) {
      setError(getAuthErrorMessage("provider", caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={pending}
        className="min-h-11 rounded-md border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-900 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Opening Google..." : "Continue with Google"}
      </button>
      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
    </div>
  );
}
