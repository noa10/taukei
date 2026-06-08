import Link from "next/link";
import { ButtonLink } from "./primitives";

export function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="navbar-brand">
          Taukei
        </Link>
        <nav className="nav-links" aria-label="Main navigation">
          <Link href="/login" className="nav-link">Sign in</Link>
          <ButtonLink href="/signup" variant="primary">Sign up</ButtonLink>
          <Link href="/account" className="nav-link">Account</Link>
        </nav>
      </div>
    </header>
  );
}
