"use client";

import { useActionState } from "react";
import { updatePassword } from "../../../lib/supabase/auth";
import type { VoidActionResult } from "../../../lib/supabase/auth";

export function ResetPasswordForm() {
  const [result, submitAction, isPending] = useActionState(
    async (_prev: VoidActionResult | null, formData: FormData) => {
      return updatePassword(Object.fromEntries(formData));
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
        <label className="field-label">New password</label>
        <input className="field-box" type="password" name="newPassword" required autoComplete="new-password" minLength={8} />
        {result?.fieldErrors?.newPassword && <p className="field-error">{result.fieldErrors.newPassword}</p>}

        <div style={{ marginTop: 20 }}>
          <button className="button primary" type="submit" disabled={isPending}>
            {isPending ? "Updating…" : "Update password"}
          </button>
        </div>
      </form>

      <p className="small" style={{ marginTop: 16 }}>
        <a href="/login">Back to sign in</a>
      </p>
    </div>
  );
}
