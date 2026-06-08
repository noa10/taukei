"use client";

import { useActionState } from "react";
import { signInWithPassword, signInWithGoogle } from "../../../lib/supabase/auth";
import type { VoidActionResult } from "../../../lib/supabase/auth";
import { useSearchParams } from "next/navigation";

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? undefined;

  const [result, submitAction, isPending] = useActionState(
    async (_prev: VoidActionResult | null, formData: FormData) => {
      const res = await signInWithPassword(Object.fromEntries(formData));
      if (res.status === "ok") {
        // If an explicit next path was provided, use it.
        // Otherwise the server action will have set a smart redirect.
        // For now, redirect to the next param or let the auth callback
        // handle smart routing via /account.
        const nextParam = next;
        if (nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")) {
          window.location.href = nextParam;
        } else {
          // Default: go to account page; account page will show merchant link
          // if user has a membership, and the auth callback handles smart
          // redirect for email/OAuth flows.
          window.location.href = "/account";
        }
      }
      return res;
    },
    null
  );

  async function handleGoogle() {
    const nextParam = next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;
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
      <p className="small" style={{ marginTop: 8 }}>
        <a href="/merchant/login">Merchant login →</a>
      </p>
    </div>
  );
}
