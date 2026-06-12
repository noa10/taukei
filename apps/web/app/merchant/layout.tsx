"use client";

import { useState, useEffect, type ReactNode } from "react";
import { MerchantSidebar, type NavItem } from "../../components/merchant-sidebar";
import { MerchantBottomNav } from "../../components/merchant-bottom-nav";
import { createBrowserSupabaseClient } from "../../lib/supabase/client";

const NAV_ITEMS: NavItem[] = [
  { href: "/merchant", label: "Dashboard", icon: "dashboard" },
  { href: "/merchant/onboarding", label: "Store Profile", icon: "onboarding" },
  { href: "/merchant/catalog", label: "Menu", icon: "menu" },
  { href: "/merchant/fulfillment", label: "Orders", icon: "orders" },
];

interface MerchantData {
  displayName: string;
  merchantId: string;
  tenantScope: string;
  loading: boolean;
}

export default function MerchantLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [merchantData, setMerchantData] = useState<MerchantData>({
    displayName: "Merchant",
    merchantId: "",
    tenantScope: "",
    loading: true,
  });

  // Read sidebar collapsed state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sidebar:merchant");
      if (saved !== null) {
        setCollapsed(saved === "true");
      }
    } catch {
      // ignore localStorage errors
    }
  }, []);

  // Write sidebar collapsed state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem("sidebar:merchant", String(collapsed));
    } catch {
      // ignore localStorage errors
    }
  }, [collapsed]);

  // Fetch merchant data client-side
  useEffect(() => {
    let cancelled = false;

    async function loadMerchantData() {
      const client = createBrowserSupabaseClient();
      if (!client) {
        if (!cancelled) {
          setMerchantData((prev) => ({ ...prev, loading: false }));
        }
        return;
      }

      const { data: { user } } = await client.auth.getUser();
      if (!user || cancelled) {
        if (!cancelled) {
          setMerchantData((prev) => ({ ...prev, loading: false }));
        }
        return;
      }

      const { data: membership } = await client
        .from("merchant_memberships")
        .select("merchant_id, merchants(display_name)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (membership) {
        const merchantId = membership.merchant_id as string;
        const merchant = membership.merchants as unknown as { display_name: string } | null;
        setMerchantData({
          displayName: merchant?.display_name ?? "Merchant",
          merchantId,
          tenantScope: `merchant:${merchantId}`,
          loading: false,
        });
      } else {
        setMerchantData((prev) => ({ ...prev, loading: false }));
      }
    }

    loadMerchantData();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggleCollapsed = () => setCollapsed((prev) => !prev);
  const handleToggleMobile = () => setMobileOpen((prev) => !prev);

  return (
    <div className={`merchant-shell ${collapsed ? "merchant-shell-collapsed" : ""}`}>
      {/* Mobile header with hamburger menu */}
      <header className="merchant-mobile-header">
        <button
          className="merchant-btn merchant-btn-secondary"
          style={{ padding: "8px 12px", minHeight: "40px" }}
          onClick={handleToggleMobile}
          aria-label="Toggle menu"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <span className="merchant-brand-text" style={{ fontSize: "1.1rem" }}>
          {merchantData.displayName}
        </span>
        <div style={{ width: 40 }} /> {/* Spacer for balance */}
      </header>

      <MerchantSidebar
        navItems={NAV_ITEMS}
        brandName={merchantData.displayName}
        merchantId={merchantData.merchantId}
        collapsed={collapsed}
        onToggleCollapsed={handleToggleCollapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <main className="merchant-main">
        {children}
      </main>

      <MerchantBottomNav />
    </div>
  );
}
