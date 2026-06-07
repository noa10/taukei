"use client";

import { useActionState } from "react";
import { requestPasswordRecovery } from "../../../lib/supabase/auth";
import type { VoidActionResult } from "../../../lib/supabase/auth";

export function ForgotPasswordForm() {
  const [result, submitAction, isPending] = useActionState(
    async (_prev: VoidActionResult | null, formData: FormData) => {
      return requestPasswordRecovery(Object.fromEntries(formData));
    },
    null
  );

  return (
    <div>
      {result && result.status !== "ok" && result.status !== "redirect" && (
        <p className="field-error">{result.message}</p>
      )}
      {result?.status === "ok" && (
        <p className="safe-copy">{result.message}</p>
      )}

      <form action={submitAction}>
        <label className="field-label">Email</label>
        <input className="field-box" type="email" name="email" required autoComplete="email" />
        {result?.fieldErrors?.email && <p className="field-error">{result.fieldErrors.email}</p>}

        <div style={{ marginTop: 20 }}>
          <button className="button primary" type="submit" disabled={isPending}>
            {isPending ? "Sending…" : "Send reset link"}
          </button>
        </div>
      </form>

      <p className="small" style={{ marginTop: 16 }}>
        <a href="/login">Back to sign in</a>
      </p>
    </div>
  );
}
