"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signInWithPassword } from "../../../lib/supabase/auth";
import type { VoidActionResult } from "../../../lib/supabase/auth";

export function MerchantLoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/merchant";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result: VoidActionResult = await signInWithPassword({ email, password });
      if (result.status === "ok") {
        // Redirect to the next page (default: /merchant)
        window.location.href = next.startsWith("/") && !next.startsWith("//") ? next : "/merchant";
      } else if (result.status === "auth-error" || result.status === "field-errors") {
        setError(result.message);
      } else if (result.status === "boundary-stubbed") {
        setError("Supabase is not configured. Set environment variables to enable auth.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }

    setLoading(false);
  };

  return (
    <div className="merchant-login-shell">
      <div className="merchant-login-card">
        <img src="/logo.png" alt="Taukei" className="merchant-login-logo" />
        <h1 className="merchant-login-title">Merchant Login</h1>
        <p className="merchant-login-subtitle">
          Sign in to manage your store, menu, and orders
        </p>

        <form onSubmit={handleSubmit} className="merchant-login-form">
          <div className="merchant-form-group">
            <label className="merchant-form-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="merchant-form-input"
              placeholder="merchant@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="merchant-form-group">
            <label className="merchant-form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="merchant-form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div style={{ padding: "12px 16px", borderRadius: 12, background: "var(--error-container)", border: "2px solid var(--outline)", color: "var(--error)", fontWeight: 700, fontSize: "0.85rem" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="merchant-btn merchant-btn-primary"
            disabled={loading}
            style={{ width: "100%", marginTop: 8 }}
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: "1.2rem", animation: "spin 1s linear infinite" }}>progress_activity</span>
                Signing in…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: "1.2rem" }}>login</span>
                Sign in
              </>
            )}
          </button>
        </form>

        <div className="merchant-login-footer">
          <p>
            Not a merchant yet?{" "}
            <Link href="/signup" className="merchant-login-link">
              Sign up
            </Link>
          </p>
          <p style={{ marginTop: 8 }}>
            <Link href="/forgot-password" className="merchant-login-link">
              Forgot password?
            </Link>
          </p>
          <p style={{ marginTop: 8 }}>
            <Link href="/login" className="merchant-login-link">
              Customer login →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
