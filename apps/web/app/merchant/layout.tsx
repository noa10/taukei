import type { ReactNode } from "react";
import Link from "next/link";
import { createServerSupabaseClient } from "../../lib/supabase/server";
import { getServerSupabaseUser } from "../../lib/supabase/server";

const NAV_ITEMS = [
  { href: "/merchant", label: "Dashboard", icon: "dashboard" },
  { href: "/merchant/onboarding", label: "Onboarding", icon: "settings" },
  { href: "/merchant/catalog", label: "Menu", icon: "restaurant_menu" },
  { href: "/merchant/fulfillment", label: "Orders", icon: "local_shipping" },
];

export default async function MerchantLayout({ children }: { children: ReactNode }) {
  const { user } = await getServerSupabaseUser();

  let merchantDisplayName = "Merchant";
  let merchantId = "";
  let tenantScope = "";

  if (user) {
    const client = await createServerSupabaseClient();
    if (client) {
      const { data: membership } = await client
        .from("merchant_memberships")
        .select("merchant_id, merchants(display_name)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (membership) {
        merchantId = membership.merchant_id as string;
        tenantScope = `merchant:${merchantId}`;
        const merchant = membership.merchants as unknown as { display_name: string } | null;
        merchantDisplayName = merchant?.display_name ?? "Merchant";
      }
    }
  }

  return (
    <div className="merchant-shell">
      <aside className="merchant-sidebar">
        <div className="merchant-brand">
          <img src="/logo.png" alt="Taukei" className="merchant-logo" />
          <span className="merchant-brand-text">{merchantDisplayName}</span>
        </div>

        <nav className="merchant-nav">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className="merchant-nav-link">
              <span className="material-symbols-outlined merchant-nav-icon">{item.icon}</span>
              <span className="merchant-nav-label">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="merchant-tenant-scope">
          <span className="tenant-label">Tenant</span>
          <span className="tenant-id" title={tenantScope}>
            {merchantId ? `${merchantId.slice(0, 8)}…` : "—"}
          </span>
        </div>
      </aside>

      <main className="merchant-main">
        {children}
      </main>
    </div>
  );
}
