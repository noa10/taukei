"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Store,
  UtensilsCrossed,
  Truck,
} from "lucide-react";

export type NavIconKey = "dashboard" | "onboarding" | "menu" | "orders";

export interface NavItem {
  label: string;
  href: string;
  icon: NavIconKey;
}

const ICON_MAP: Record<NavIconKey, React.ComponentType<{ size?: number; className?: string }>> = {
  dashboard: LayoutDashboard,
  onboarding: Store,
  menu: UtensilsCrossed,
  orders: Truck,
};

export interface MerchantSidebarProps {
  navItems: NavItem[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  brandName?: string;
  merchantId?: string;
}

export function MerchantSidebar({
  navItems,
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onMobileClose,
  brandName = "Merchant",
  merchantId = "",
}: MerchantSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {/* Mobile backdrop overlay */}
      {mobileOpen && (
        <div
          className="merchant-sidebar-mobile-overlay"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`merchant-sidebar ${collapsed ? "merchant-sidebar-collapsed" : ""} ${
          mobileOpen ? "merchant-sidebar-mobile-open" : ""
        }`}
        aria-label="Merchant navigation"
      >
        {/* Brand */}
        <div className="merchant-brand">
          <img src="/logo.png" alt="Taukei" className="merchant-logo" />
          <span className="merchant-brand-text">{brandName}</span>
        </div>

        {/* Nav links */}
        <nav className="merchant-nav">
          {navItems.map((item) => {
            const Icon = ICON_MAP[item.icon];
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`merchant-nav-link ${active ? "merchant-nav-link-active" : ""}`}
                title={collapsed ? item.label : undefined}
                onClick={mobileOpen ? onMobileClose : undefined}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="merchant-nav-icon" size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom section: Back to Store */}
        <div className="merchant-sidebar-bottom">
          <Link
            href="/"
            className="merchant-nav-link"
            title={collapsed ? "Back to Store" : undefined}
          >
            <Store className="merchant-nav-icon" size={20} />
            <span>Back to Store</span>
          </Link>
        </div>

        {/* Tenant scope */}
        <div className="merchant-tenant-scope">
          <span className="tenant-label">Tenant</span>
          <span className="tenant-id" title={merchantId ? `merchant:${merchantId}` : ""}>
            {merchantId ? `${merchantId.slice(0, 8)}…` : "—"}
          </span>
        </div>
      </aside>
    </>
  );
}
