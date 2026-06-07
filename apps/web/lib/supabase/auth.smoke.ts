// ---------------------------------------------------------------------------
// Auth smoke test — lightweight validation that the Supabase auth boundary
// files are wired correctly without requiring a live Supabase instance.
//
// This module exports check functions that can be called from a script or
// from a test runner to validate that:
// 1. The auth module exports all 8 server actions.
// 2. The validation schemas parse correctly.
// 3. The config module provides getSiteUrl/buildSiteUrl.
// 4. The client/server boundary helpers exist.
//
// Run: bun run apps/web/lib/supabase/auth.smoke.ts
// ---------------------------------------------------------------------------

import {
  signUpWithPassword,
  signInWithPassword,
  signInWithGoogle,
  requestPasswordRecovery,
  updatePassword,
  signOut,
  getCurrentProfile,
  updateOwnProfile
} from "./auth";
import {
  signUpSchema,
  signInSchema,
  googleSignInSchema,
  passwordRecoverySchema,
  updatePasswordSchema,
  updateOwnProfileSchema,
  parseOrFieldErrors,
  type FieldErrorMap
} from "./validation";
import { getSiteUrl, buildSiteUrl } from "./config";
import {
  getBrowserSupabaseBoundary,
  createBrowserSupabaseClient
} from "./client";
import {
  getServerSupabaseBoundary,
  getServerSupabaseUser,
  requireServerSupabaseUser
} from "./server";

type CheckResult = { ok: true; detail: string } | { ok: false; detail: string };

function check(name: string, fn: () => boolean): CheckResult {
  try {
    const result = fn();
    return result
      ? { ok: true, detail: name }
      : { ok: false, detail: `${name} — assertion failed` };
  } catch (err) {
    return { ok: false, detail: `${name} — ${(err as Error).message}` };
  }
}

export function runSmokeChecks(): CheckResult[] {
  return [
    check("signUpWithPassword is a function", () => typeof signUpWithPassword === "function"),
    check("signInWithPassword is a function", () => typeof signInWithPassword === "function"),
    check("signInWithGoogle is a function", () => typeof signInWithGoogle === "function"),
    check("requestPasswordRecovery is a function", () => typeof requestPasswordRecovery === "function"),
    check("updatePassword is a function", () => typeof updatePassword === "function"),
    check("signOut is a function", () => typeof signOut === "function"),
    check("getCurrentProfile is a function", () => typeof getCurrentProfile === "function"),
    check("updateOwnProfile is a function", () => typeof updateOwnProfile === "function"),

    check("signUpSchema parses valid input", () => {
      const r = signUpSchema.safeParse({ email: "a@b.co", password: "longenoughpw", fullName: "A", username: "abc" });
      return r.success;
    }),
    check("signInSchema parses valid input", () => signInSchema.safeParse({ email: "a@b.co", password: "x" }).success),
    check("googleSignInSchema parses empty input", () => googleSignInSchema.safeParse({}).success),
    check("passwordRecoverySchema parses valid input", () => passwordRecoverySchema.safeParse({ email: "a@b.co" }).success),
    check("updatePasswordSchema rejects short password", () => !updatePasswordSchema.safeParse({ newPassword: "short" }).success),
    check("updateOwnProfileSchema requires at least one field", () => !updateOwnProfileSchema.safeParse({}).success),

    check("getSiteUrl returns a string", () => typeof getSiteUrl() === "string"),
    check("buildSiteUrl returns a string with path", () => buildSiteUrl("/account").endsWith("/account")),
    check("parseOrFieldErrors returns fieldErrors on failure", () => {
      const r = parseOrFieldErrors(signUpSchema, {});
      return !r.ok && Object.keys((r as { ok: false; fieldErrors: FieldErrorMap }).fieldErrors).length > 0;
    }),

    check("getBrowserSupabaseBoundary returns an object", () => typeof getBrowserSupabaseBoundary() === "object"),
    check("createBrowserSupabaseClient returns null when stubbed", () => createBrowserSupabaseClient() === null),
    check("getServerSupabaseBoundary returns an object", () => typeof getServerSupabaseBoundary() === "object"),
    check("getServerSupabaseUser is a function", () => typeof getServerSupabaseUser === "function"),
    check("requireServerSupabaseUser is a function", () => typeof requireServerSupabaseUser === "function"),
  ];
}

// Self-run when executed directly
if (import.meta.main ?? (typeof require !== "undefined" && require.main === module)) {
  const results = runSmokeChecks();
  let pass = 0;
  let fail = 0;
  for (const r of results) {
    if (r.ok) {
      pass++;
      console.log(`  ✓ ${r.detail}`);
    } else {
      fail++;
      console.error(`  ✗ ${r.detail}`);
    }
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}
