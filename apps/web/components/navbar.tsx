"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createBrowserSupabaseClient } from "../lib/supabase/client";
import { AvatarMenu } from "./avatar-menu";

export function Navbar() {
  const [user, setUser] = useState<{ email: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = createBrowserSupabaseClient();
    if (!client) {
      setLoading(false);
      return;
    }
    client.auth.getUser().then(({ data }) => {
      setUser(data.user ? { email: data.user.email ?? null } : null);
      setLoading(false);
    });
  }, []);

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="navbar-brand" aria-label="Taukei home">
          <Image
            src="/logo.png"
            alt="Taukei"
            width={36}
            height={36}
            priority
            style={{ display: "block", borderRadius: 8 }}
          />
        </Link>
        <nav className="nav-links" aria-label="Main navigation">
          {loading ? (
            <div style={{ width: 36, height: 36 }} /> /* Placeholder to prevent layout shift */
          ) : user ? (
            <AvatarMenu email={user.email} displayName={null} />
          ) : (
            <>
              <Link href="/login" className="nav-link">Sign in</Link>
              <Link href="/signup" className="button primary">Sign up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
