"use client";

import { useActionState } from "react";
import { updateOwnProfile, signOut } from "../../../lib/supabase/auth";
import type { ProfileSnapshot, ProfileActionResult } from "../../../lib/supabase/auth";

export function AccountView({ profile: initial }: { profile: ProfileSnapshot }) {
  const [result, submitAction, isPending] = useActionState(
    async (_prev: ProfileActionResult | null, formData: FormData) => {
      return updateOwnProfile(Object.fromEntries(formData));
    },
    null
  );

  const profile = result?.status === "ok" && result.profile ? result.profile : initial;

  async function handleSignOut() {
    await signOut();
  }

  return (
    <div>
      <p><strong>Email:</strong> {profile.email ?? "—"}</p>
      <p><strong>Username:</strong> {profile.username ?? "—"}</p>
      <p><strong>Full name:</strong> {profile.fullName ?? "—"}</p>
      <p><strong>Email verified:</strong> {profile.emailConfirmed ? "Yes" : "No"}</p>

      <hr style={{ margin: "20px 0", border: "none", borderTop: "2px solid var(--outline)" }} />

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
        <input className="field-box" type="text" name="fullName" defaultValue={profile.fullName ?? ""} autoComplete="name" />
        {result?.fieldErrors?.fullName && <p className="field-error">{result.fieldErrors.fullName}</p>}

        <label className="field-label">Username</label>
        <input className="field-box" type="text" name="username" defaultValue={profile.username ?? ""} autoComplete="username" />
        {result?.fieldErrors?.username && <p className="field-error">{result.fieldErrors.username}</p>}

        <label className="field-label">Avatar URL</label>
        <input className="field-box" type="url" name="avatarUrl" defaultValue={profile.avatarUrl ?? ""} autoComplete="photo" />
        {result?.fieldErrors?.avatarUrl && <p className="field-error">{result.fieldErrors.avatarUrl}</p>}

        <div style={{ marginTop: 20 }}>
          <button className="button primary" type="submit" disabled={isPending}>
            {isPending ? "Saving…" : "Update profile"}
          </button>
        </div>
      </form>

      <div style={{ marginTop: 24 }}>
        <button className="button secondary" type="button" onClick={handleSignOut}>
          Sign out
        </button>
      </div>
    </div>
  );
}
