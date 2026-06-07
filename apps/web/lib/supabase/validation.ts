import { z } from "zod";

// ---------------------------------------------------------------------------
// Field-level constraints
//
// Rationale: Taukei allows ASCII usernames, email + password auth, and
// Google OAuth. Password rules are deliberately loose at the schema layer
// because the server action forwards to Supabase auth, which enforces its
// own password policy server-side. The schema exists to surface clear
// form errors before the round-trip.
// ---------------------------------------------------------------------------

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters.")
  .max(32, "Username must be at most 32 characters.")
  .regex(/^[a-z0-9_.-]+$/i, "Username may contain letters, digits, dot, underscore, and dash only.")
  .transform((value) => value.toLowerCase());

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required.")
  .email("Enter a valid email address.")
  .max(254, "Email is too long.");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password is too long.");

export const fullNameSchema = z
  .string()
  .trim()
  .min(1, "Full name is required.")
  .max(80, "Full name must be at most 80 characters.");

export const avatarUrlSchema = z
  .string()
  .trim()
  .url("Avatar URL must be a valid URL.")
  .max(2048, "Avatar URL is too long.")
  .or(z.literal("").transform(() => undefined));

export const nextPathSchema = z
  .string()
  .trim()
  .min(1)
  .max(512)
  .regex(/^\/(?!\/)/, "next must be an internal path starting with a single slash.")
  .optional();

// ---------------------------------------------------------------------------
// Form payloads
// ---------------------------------------------------------------------------

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: fullNameSchema,
  username: usernameSchema
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required.")
});
export type SignInInput = z.infer<typeof signInSchema>;

export const passwordRecoverySchema = z.object({
  email: emailSchema
});
export type PasswordRecoveryInput = z.infer<typeof passwordRecoverySchema>;

export const updatePasswordSchema = z.object({
  newPassword: passwordSchema
});
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;

export const googleSignInSchema = z.object({
  next: nextPathSchema
});
export type GoogleSignInInput = z.infer<typeof googleSignInSchema>;

export const updateOwnProfileSchema = z
  .object({
    fullName: fullNameSchema.optional(),
    username: usernameSchema.optional(),
    avatarUrl: avatarUrlSchema.optional()
  })
  .refine(
    (value) =>
      value.fullName !== undefined ||
      value.username !== undefined ||
      value.avatarUrl !== undefined,
    { message: "Provide at least one field to update." }
  );
export type UpdateOwnProfileInput = z.infer<typeof updateOwnProfileSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export interface FieldErrorMap {
  [fieldName: string]: string;
}

export function flattenZodErrors(error: z.ZodError): FieldErrorMap {
  const out: FieldErrorMap = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function parseOrFieldErrors<T>(
  schema: z.ZodType<T>,
  candidate: unknown
): { ok: true; data: T } | { ok: false; fieldErrors: FieldErrorMap } {
  const result = schema.safeParse(candidate);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, fieldErrors: flattenZodErrors(result.error) };
}
