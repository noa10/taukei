import { describe, expect, it } from "vitest";
import {
  avatarUrlSchema,
  emailSchema,
  flattenZodErrors,
  fullNameSchema,
  googleSignInSchema,
  nextPathSchema,
  passwordSchema,
  passwordRecoverySchema,
  parseOrFieldErrors,
  signInSchema,
  signUpSchema,
  updateOwnProfileSchema,
  updatePasswordSchema,
  usernameSchema
} from "./validation";
import { buildSiteUrl, getSiteUrl } from "./config";

describe("supabase/validation", () => {
  describe("field-level schemas", () => {
    it("rejects short usernames and lowercases the rest", () => {
      expect(usernameSchema.safeParse("ab").success).toBe(false);
      const ok = usernameSchema.safeParse("Alice.Smith_99");
      expect(ok.success).toBe(true);
      if (ok.success) expect(ok.data).toBe("alice.smith_99");
    });

    it("rejects invalid emails", () => {
      expect(emailSchema.safeParse("not-an-email").success).toBe(false);
      expect(emailSchema.safeParse("hi@taukei.my").success).toBe(true);
    });

    it("enforces a minimum password length", () => {
      expect(passwordSchema.safeParse("short").success).toBe(false);
      expect(passwordSchema.safeParse("longenoughpw").success).toBe(true);
    });

    it("trims and validates full name", () => {
      const ok = fullNameSchema.safeParse("  Alice Doe ");
      expect(ok.success).toBe(true);
      if (ok.success) expect(ok.data).toBe("Alice Doe");
    });

    it("accepts a valid avatar URL or an empty string", () => {
      expect(avatarUrlSchema.safeParse("https://x.supabase.co/storage/v1/avatars/a/b.png").success).toBe(true);
      const empty = avatarUrlSchema.safeParse("");
      expect(empty.success).toBe(true);
      if (empty.success) expect(empty.data).toBeUndefined();
    });

    it("rejects external `next` paths", () => {
      expect(nextPathSchema.safeParse("https://evil.example/x").success).toBe(false);
      expect(nextPathSchema.safeParse("//evil.example").success).toBe(false);
      expect(nextPathSchema.safeParse("/account").success).toBe(true);
    });
  });

  describe("form payloads", () => {
    it("signUp requires all four fields", () => {
      const result = signUpSchema.safeParse({ email: "a@b.co", password: "longenoughpw", fullName: "Alice" });
      expect(result.success).toBe(false);
    });

    it("signIn accepts a valid payload", () => {
      const result = signInSchema.safeParse({ email: "a@b.co", password: "x" });
      expect(result.success).toBe(true);
    });

    it("password recovery only needs an email", () => {
      expect(passwordRecoverySchema.safeParse({ email: "a@b.co" }).success).toBe(true);
    });

    it("update password enforces the same length floor", () => {
      expect(updatePasswordSchema.safeParse({ newPassword: "short" }).success).toBe(false);
    });

    it("google sign-in accepts an optional internal next", () => {
      expect(googleSignInSchema.safeParse({}).success).toBe(true);
      expect(googleSignInSchema.safeParse({ next: "/account" }).success).toBe(true);
      expect(googleSignInSchema.safeParse({ next: "https://evil" }).success).toBe(false);
    });

    it("updateOwnProfile requires at least one field", () => {
      expect(updateOwnProfileSchema.safeParse({}).success).toBe(false);
      expect(updateOwnProfileSchema.safeParse({ fullName: "Alice" }).success).toBe(true);
    });
  });

  describe("parseOrFieldErrors", () => {
    it("returns ok=true with parsed data on success", () => {
      const out = parseOrFieldErrors(emailSchema, "a@b.co");
      expect(out.ok).toBe(true);
      if (out.ok) expect(out.data).toBe("a@b.co");
    });

    it("returns ok=false with fieldErrors on failure", () => {
      const out = parseOrFieldErrors(emailSchema, "nope");
      expect(out.ok).toBe(false);
      if (!out.ok) expect(out.fieldErrors._form).toBeTruthy();
    });
  });

  describe("flattenZodErrors", () => {
    it("falls back to _form when no path is present", () => {
      const result = signUpSchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        const map = flattenZodErrors(result.error);
        expect(Object.keys(map).length).toBeGreaterThan(0);
      }
    });
  });
});

describe("supabase/config", () => {
  it("getSiteUrl falls back to localhost when env is empty", () => {
    const url = getSiteUrl({});
    expect(url).toBe("http://localhost:56778");
  });

  it("getSiteUrl strips trailing slashes", () => {
    const url = getSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://taukei.example/" });
    expect(url).toBe("https://taukei.example");
  });

  it("buildSiteUrl appends a safe internal path", () => {
    const url = buildSiteUrl("/account");
    expect(url.endsWith("/account")).toBe(true);
  });

  it("buildSiteUrl refuses to append an external URL", () => {
    const url = buildSiteUrl("https://evil.example/x");
    expect(url).toBe(getSiteUrl());
  });
});
