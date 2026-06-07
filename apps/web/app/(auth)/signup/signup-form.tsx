"use client";

import { useActionState } from "react";
import { signUpWithPassword } from "../../../lib/supabase/auth";
import type { VoidActionResult } from "../../../lib/supabase/auth";

export function SignUpForm() {
  const [result, submitAction, isPending] = useActionState(
    async (_prev: VoidActionResult | null, formData: FormData) => {
      return signUpWithPassword(Object.fromEntries(formData));
    },
    null
  );

  return (
    <div>
      {result && result.status !== "ok" && result.status !== "redirect" && (
        <p className={result.status === "field-errors" ? "small" : "field-error"}>
          {result.message}
        </p>
      )}
      {result?.status === "ok" && (
        <p className="safe-copy">{result.message}</p>
      )}

      <form action={submitAction}>
        <label className="field-label">Full name</label>
        <input className="field-box" type="text" name="fullName" required autoComplete="name" />
        {result?.fieldErrors?.fullName && <p className="field-error">{result.fieldErrors.fullName}</p>}

        <label className="field-label">Username</label>
        <input className="field-box" type="text" name="username" required autoComplete="username" />
        {result?.fieldErrors?.username && <p className="field-error">{result.fieldErrors.username}</p>}

        <label className="field-label">Email</label>
        <input className="field-box" type="email" name="email" required autoComplete="email" />
        {result?.fieldErrors?.email && <p className="field-error">{result.fieldErrors.email}</p>}

        <label className="field-label">Password</label>
        <input className="field-box" type="password" name="password" required autoComplete="new-password" minLength={8} />
        {result?.fieldErrors?.password && <p className="field-error">{result.fieldErrors.password}</p>}

        <div style={{ marginTop: 20 }}>
          <button className="button primary" type="submit" disabled={isPending}>
            {isPending ? "Creating account…" : "Create account"}
          </button>
        </div>
      </form>

      <p className="small" style={{ marginTop: 16 }}>
        Already have an account? <a href="/login">Sign in</a>
      </p>
    </div>
  );
}
