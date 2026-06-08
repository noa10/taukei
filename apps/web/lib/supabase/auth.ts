"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { buildSiteUrl, getSiteUrl } from "./config";
import { createServerSupabaseClient } from "./server";
import {
  flattenZodErrors,
  googleSignInSchema,
  passwordRecoverySchema,
  signInSchema,
  signUpSchema,
  updateOwnProfileSchema,
  updatePasswordSchema,
  type FieldErrorMap,
  type GoogleSignInInput,
  type PasswordRecoveryInput,
  type SignInInput,
  type SignUpInput,
  type UpdateOwnProfileInput,
  type UpdatePasswordInput
} from "./validation";

// ---------------------------------------------------------------------------
// Result envelopes
//
// Server actions in Next.js return data to client components. We standardize
// on a discriminated union so the form components can render field errors
// consistently without throwing across the action boundary.
// ---------------------------------------------------------------------------

export type AuthActionStatus =
  | "ok"
  | "field-errors"
  | "boundary-stubbed"
  | "auth-error"
  | "redirect";

export interface AuthActionBase {
  status: AuthActionStatus;
  message: string;
  fieldErrors?: FieldErrorMap;
  redirectTo?: string;
}

export interface ProfileSnapshot {
  id: string;
  email: string | null;
  username: string | null;
  fullName: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  emailConfirmed: boolean;
  defaultMerchantId: string | null;
}

export interface ProfileActionResult extends AuthActionBase {
  profile?: ProfileSnapshot;
}

export type VoidActionResult = AuthActionBase;

// ---------------------------------------------------------------------------
// Stubbed-boundary short-circuit
//
// When NEXT_PUBLIC_SUPABASE_URL is not set, the server cannot make a real
// auth call. We surface this as a stable "boundary-stubbed" status instead
// of throwing, so the UI can render a "configure Supabase" notice without
// a 500.
// ---------------------------------------------------------------------------

const STUBBED_MESSAGE = "Supabase auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in .env to enable auth.";

async function requireSupabaseServer() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return {
      supabase: null as never,
      stubbed: {
        status: "boundary-stubbed" as const,
        message: STUBBED_MESSAGE
      }
    };
  }
  return { supabase, stubbed: null };
}

function mapAuthError(message: string): AuthActionBase {
  return { status: "auth-error", message };
}

function userToProfile(user: User): ProfileSnapshot {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  return {
    id: user.id,
    email: user.email ?? null,
    username: typeof meta.username === "string" ? (meta.username as string) : null,
    fullName: typeof meta.full_name === "string" ? (meta.full_name as string) : null,
    displayName: typeof meta.display_name === "string" ? (meta.display_name as string) : null,
    avatarUrl: typeof meta.avatar_url === "string" ? (meta.avatar_url as string) : null,
    emailConfirmed: Boolean(user.email_confirmed_at),
    defaultMerchantId: null
  };
}

function profileToSnapshot(
  row: Record<string, unknown>,
  user: User
): ProfileSnapshot {
  return {
    id: row.id as string,
    email: (row.email as string | null) ?? user.email ?? null,
    username: (row.username as string | null) ?? null,
    fullName: (row.full_name as string | null) ?? null,
    displayName: (row.display_name as string | null) ?? null,
    avatarUrl: (row.avatar_url as string | null) ?? null,
    defaultMerchantId: (row.default_merchant_id as string | null) ?? null,
    emailConfirmed: Boolean(user.email_confirmed_at),
  };
}


// ---------------------------------------------------------------------------
// signUpWithPassword
//
// 1. Validate the form payload with zod.
// 2. Call supabase.auth.signUp with emailRedirectTo pointing at
//    /auth/callback (the OAuth-style code exchange route, reused for the
//    email confirmation link).
// 3. Persist full_name + username in raw_user_meta_data so the
//    handle_new_user() trigger can copy them into public.profiles.
// ---------------------------------------------------------------------------

export async function signUpWithPassword(
  raw: unknown
): Promise<VoidActionResult> {
  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      status: "field-errors",
      message: "Please correct the highlighted fields.",
      fieldErrors: flattenZodErrors(parsed.error)
    };
  }
  const data: SignUpInput = parsed.data;

  const { supabase, stubbed } = await requireSupabaseServer();
  if (stubbed) return stubbed;

  const { error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        full_name: data.fullName,
        display_name: data.fullName,
        username: data.username
      },
      emailRedirectTo: buildSiteUrl("/auth/callback?next=/account")
    }
  });

  if (error) return mapAuthError(error.message);

  return {
    status: "ok",
    message: "Check your email to confirm your account before signing in."
  };
}

// ---------------------------------------------------------------------------
// signInWithPassword
// ---------------------------------------------------------------------------

export async function signInWithPassword(raw: unknown): Promise<VoidActionResult> {
  const parsed = signInSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      status: "field-errors",
      message: "Please correct the highlighted fields.",
      fieldErrors: flattenZodErrors(parsed.error)
    };
  }
  const data: SignInInput = parsed.data;

  const { supabase, stubbed } = await requireSupabaseServer();
  if (stubbed) return stubbed;

  const { error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password
  });

  if (error) return mapAuthError(error.message);

  revalidatePath("/", "layout");
  return { status: "ok", message: "Signed in." };
}

// ---------------------------------------------------------------------------
// signInWithGoogle
//
// Returns a `redirectTo` URL the form should navigate to. We do not call
// `redirect()` here because that would throw out of the server action and
// the client form would lose its loading state. The form can render
// `result.redirectTo` as a Link.
// ---------------------------------------------------------------------------

export async function signInWithGoogle(raw: unknown = {}): Promise<VoidActionResult> {
  const parsed = googleSignInSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      status: "field-errors",
      message: "Invalid sign-in options.",
      fieldErrors: flattenZodErrors(parsed.error)
    };
  }
  const data: GoogleSignInInput = parsed.data;

  const { supabase, stubbed } = await requireSupabaseServer();
  if (stubbed) return stubbed;

  const next = data.next ?? "/account";
  const { data: oauth, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: buildSiteUrl(`/auth/callback?next=${encodeURIComponent(next)}`)
    }
  });

  if (error) return mapAuthError(error.message);
  if (!oauth?.url) {
    return mapAuthError("Google sign-in did not return a redirect URL.");
  }

  return {
    status: "redirect",
    message: "Redirecting to Google...",
    redirectTo: oauth.url
  };
}

// ---------------------------------------------------------------------------
// requestPasswordRecovery
// ---------------------------------------------------------------------------

export async function requestPasswordRecovery(raw: unknown): Promise<VoidActionResult> {
  const parsed = passwordRecoverySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      status: "field-errors",
      message: "Please correct the highlighted fields.",
      fieldErrors: flattenZodErrors(parsed.error)
    };
  }
  const data: PasswordRecoveryInput = parsed.data;

  const { supabase, stubbed } = await requireSupabaseServer();
  if (stubbed) return stubbed;

  const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
    redirectTo: buildSiteUrl("/auth/callback?next=/reset-password")
  });

  // Per Supabase guidance: do not leak whether the email exists. Always
  // return ok with the same message.
  if (error) {
    // We still log to the server console for ops; the user sees a neutral reply.
    console.warn("[auth] resetPasswordForEmail error:", error.message);
  }

  return {
    status: "ok",
    message: "If that email is registered, a reset link is on its way."
  };
}

// ---------------------------------------------------------------------------
// updatePassword (used by the reset-password page after the recovery link
// has been exchanged for a session).
// ---------------------------------------------------------------------------

export async function updatePassword(raw: unknown): Promise<VoidActionResult> {
  const parsed = updatePasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      status: "field-errors",
      message: "Please correct the highlighted fields.",
      fieldErrors: flattenZodErrors(parsed.error)
    };
  }
  const data: UpdatePasswordInput = parsed.data;

  const { supabase, stubbed } = await requireSupabaseServer();
  if (stubbed) return stubbed;

  const { error } = await supabase.auth.updateUser({ password: data.newPassword });
  if (error) return mapAuthError(error.message);

  return { status: "ok", message: "Password updated." };
}

// ---------------------------------------------------------------------------
// signOut
//
// `redirect()` is the documented way to send the user away from a server
// action. We redirect to the site root after clearing the session.
// ---------------------------------------------------------------------------

export async function signOut(): Promise<VoidActionResult> {
  const { supabase, stubbed } = await requireSupabaseServer();
  if (stubbed) return stubbed;

  const { error } = await supabase.auth.signOut();
  if (error) return mapAuthError(error.message);

  revalidatePath("/", "layout");
  redirect(getSiteUrl() + "/");
}

// ---------------------------------------------------------------------------
// getCurrentProfile — returns the active profile row joined with the auth
// user. Returns null when the caller is not signed in or the boundary is
// stubbed.
// ---------------------------------------------------------------------------

export async function getCurrentProfile(): Promise<ProfileActionResult> {
  const { supabase, stubbed } = await requireSupabaseServer();
  if (stubbed) {
    return { status: "boundary-stubbed", message: stubbed.message };
  }
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) return mapAuthError(userError.message);
  if (!userData.user) {
    return { status: "auth-error", message: "Not signed in." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, username, full_name, display_name, avatar_url, default_merchant_id")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profileError) return mapAuthError(profileError.message);

  const profile_row = profile as Record<string, unknown> | null;
  const snapshot: ProfileSnapshot = profile_row
    ? profileToSnapshot(profile_row, userData.user)
    : { ...userToProfile(userData.user), email: userData.user.email ?? null };

  return { status: "ok", message: "ok", profile: snapshot };
}

// ---------------------------------------------------------------------------
// updateOwnProfile — updates the current profile row. RLS on public.profiles
// limits writes to the row whose id matches auth.uid(), so this is safe to
// expose as a server action without a merchant_id parameter.
// ---------------------------------------------------------------------------

export async function updateOwnProfile(raw: unknown): Promise<ProfileActionResult> {
  const parsed = updateOwnProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      status: "field-errors",
      message: "Please correct the highlighted fields.",
      fieldErrors: flattenZodErrors(parsed.error)
    };
  }
  const data: UpdateOwnProfileInput = parsed.data;

  const { supabase, stubbed } = await requireSupabaseServer();
  if (stubbed) return stubbed;

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) return mapAuthError(userError.message);
  if (!userData.user) return mapAuthError("Not signed in.");

  const updates: Record<string, string | null> = {};
  if (data.fullName !== undefined) updates.full_name = data.fullName;
  if (data.username !== undefined) updates.username = data.username;
  if (data.avatarUrl !== undefined) updates.avatar_url = data.avatarUrl ?? null;

  if (Object.keys(updates).length === 0) {
    return { status: "field-errors", message: "Nothing to update." };
  }

  const { data: updated, error: updateError } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userData.user.id)
    .select("id, email, username, full_name, display_name, avatar_url, default_merchant_id")
    .single();

  if (updateError) return mapAuthError(updateError.message);

  revalidatePath("/account");
  return {
    status: "ok",
    message: "Profile updated.",
    profile: profileToSnapshot(updated as Record<string, unknown>, userData.user)
  };
}

// ---------------------------------------------------------------------------
// Merchant session resolution for post-auth redirect
//
// After login/signup, we need to know whether the user has a merchant
// membership so we can redirect to /merchant instead of /account.
// ---------------------------------------------------------------------------

import type { MerchantSession } from "./session";

export interface MerchantSessionResult {
  session: MerchantSession | null;
  hasMembership: boolean;
}

export async function getCurrentMerchantSession(): Promise<MerchantSessionResult> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { session: null, hasMembership: false };

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user?.email) return { session: null, hasMembership: false };

  const { data: membership } = await supabase
    .from("merchant_memberships")
    .select("merchant_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!membership) return { session: null, hasMembership: false };

  const session: MerchantSession = {
    userId: user.id,
    merchantId: membership.merchant_id as string,
    role: membership.role as MerchantSession["role"],
    email: user.email,
    tenantScope: `merchant:${membership.merchant_id}`,
    authMode: "supabase-rls",
  };

  return { session, hasMembership: true };
}

/**
 * Determine the post-auth redirect path for the current user.
 * Returns /merchant if the user has an active merchant membership,
 * otherwise /account.
 */
export async function getPostAuthRedirectPath(): Promise<string> {
  const { hasMembership } = await getCurrentMerchantSession();
  return hasMembership ? "/merchant" : "/account";
}
