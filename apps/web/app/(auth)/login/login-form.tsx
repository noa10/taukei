"use client";

import { useActionState } from "react";
import { signInWithPassword, signInWithGoogle } from "../../../lib/supabase/auth";
import type { VoidActionResult } from "../../../lib/supabase/auth";
import { useSearchParams } from "next/navigation";

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/account";

  const [result, submitAction, isPending] = useActionState(
    async (_prev: VoidActionResult | null, formData: FormData) => {
      const res = await signInWithPassword(Object.fromEntries(formData));
      if (res.status === "ok") {
        // Redirect to the next page after successful sign-in
        window.location.href = next.startsWith("/") && !next.startsWith("//") ? next : "/account";
      }
      return res;
    },
    null
  );

  async function handleGoogle() {
    const nextParam = next.startsWith("/") && !next.startsWith("//") ? next : undefined;
    const res: VoidActionResult = await signInWithGoogle({ next: nextParam });
    if (res.redirectTo) window.location.href = res.redirectTo;
  }

  return (
    <div>
      {result && result.status !== "ok" && result.status !== "redirect" && (
        <p className={result.status === "field-errors" ? "small" : "field-error"}>
          {result.message}
        </p>
      )}

      <form action={submitAction}>
        <label className="field-label">Email</label>
        <input className="field-box" type="email" name="email" required autoComplete="email" />
        {result?.fieldErrors?.email && <p className="field-error">{result.fieldErrors.email}</p>}

        <label className="field-label">Password</label>
        <input className="field-box" type="password" name="password" required autoComplete="current-password" />
        {result?.fieldErrors?.password && <p className="field-error">{result.fieldErrors.password}</p>}

        <div style={{ marginTop: 20 }}>
          <button className="button primary" type="submit" disabled={isPending}>
            {isPending ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </form>

      <div style={{ marginTop: 14 }}>
        <button className="button secondary" type="button" onClick={handleGoogle}>
          Continue with Google
        </button>
      </div>

      <p className="small" style={{ marginTop: 16 }}>
        Don&apos;t have an account? <a href="/signup">Sign up</a>
      </p>
      <p className="small">
        <a href="/forgot-password">Forgot your password?</a>
      </p>
    </div>
  );
}
