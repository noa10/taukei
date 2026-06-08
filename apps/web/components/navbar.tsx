import Image from "next/image";
import Link from "next/link";
import { getServerSupabaseUser } from "../lib/supabase/server";
import { AvatarMenu } from "./avatar-menu";

export async function Navbar() {
  const { user } = await getServerSupabaseUser();

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
          {user ? (
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
