"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Store,
  UtensilsCrossed,
  Truck,
} from "lucide-react";

const BOTTOM_NAV_ITEMS = [
  { href: "/merchant", label: "Dashboard", icon: LayoutDashboard },
  { href: "/merchant/onboarding", label: "Onboarding", icon: Store },
  { href: "/merchant/catalog", label: "Menu", icon: UtensilsCrossed },
  { href: "/merchant/fulfillment", label: "Orders", icon: Truck },
];

export function MerchantBottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="merchant-bottom-nav" aria-label="Mobile merchant navigation">
      {BOTTOM_NAV_ITEMS.map((item) => {
        const active = isActive(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`merchant-bottom-nav-link ${active ? "merchant-bottom-nav-link-active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="merchant-nav-icon" size={20} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
