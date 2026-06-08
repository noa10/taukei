"use client";

import { useState, useRef, useEffect } from "react";
import { signOut } from "../lib/supabase/auth";

interface AvatarMenuProps {
  email: string | null;
  displayName: string | null;
}

const MENU_ITEMS = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/merchant", label: "Dashboard", icon: "dashboard" },
  { href: "/merchant/fulfillment", label: "Orders", icon: "local_shipping" },
  { href: "/merchant/catalog", label: "Menu", icon: "restaurant_menu" },
  { href: "/account", label: "Profile", icon: "person" },
  { href: "/merchant/onboarding", label: "Settings", icon: "settings" },
];

async function handleSignOut() {
  await signOut();
}

export function AvatarMenu({ email, displayName }: AvatarMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const initial = (displayName || email || "U")[0].toUpperCase();

  return (
    <div className="avatar-menu" ref={menuRef}>
      <button
        className="avatar-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="User menu"
      >
        <span className="avatar-initial">{initial}</span>
      </button>

      {open && (
        <nav className="avatar-dropdown" role="menu">
          {email && (
            <div className="avatar-dropdown-header">
              <span className="avatar-dropdown-email">{email}</span>
            </div>
          )}
          {MENU_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="avatar-dropdown-item"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <span className="material-symbols-outlined avatar-dropdown-icon">{item.icon}</span>
              {item.label}
            </a>
          ))}
          <div className="avatar-dropdown-divider" />
          <button
            type="button"
            className="avatar-dropdown-item avatar-dropdown-signout"
            role="menuitem"
            onClick={async () => { await handleSignOut(); }}
          >
            <span className="material-symbols-outlined avatar-dropdown-icon">logout</span>
            Sign out
          </button>
        </nav>
      )}
    </div>
  );
}
