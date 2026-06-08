import { createServerSupabaseClient } from "../../lib/supabase/server";
import { getServerSupabaseUser } from "../../lib/supabase/server";
import { getMerchantOperationsContext } from "../../lib/data-access";
import { getMerchantSession } from "../../lib/supabase/session";

function money(cents: number): string {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
  }).format(cents / 100);
}

export default async function MerchantDashboardPage() {
  const { user } = await getServerSupabaseUser();

  if (!user) {
    return (
      <div>
        <h1 className="merchant-page-title">Dashboard</h1>
        <p className="field-error">Please sign in to view your merchant dashboard.</p>
      </div>
    );
  }

  const client = await createServerSupabaseClient();
  if (!client) {
    return (
      <div>
        <h1 className="merchant-page-title">Dashboard</h1>
        <p className="field-error">Supabase is not configured.</p>
      </div>
    );
  }

  const session = await getMerchantSession(client);
  if (!session) {
    return (
      <div>
        <h1 className="merchant-page-title">Dashboard</h1>
        <p>No merchant membership found. <a href="/merchant/onboarding">Set up your merchant →</a></p>
      </div>
    );
  }

  const ctx = await getMerchantOperationsContext(session);

  if (!ctx.ok) {
    return (
      <div>
        <h1 className="merchant-page-title">Dashboard</h1>
        <p className="field-error">{ctx.guard.reason ?? "Cannot access merchant data."}</p>
      </div>
    );
  }

  const { profile, catalog, fulfillment } = ctx;

  const activeOrders = fulfillment.filter(
    (o) => o.status !== "delivered" && o.status !== "cancelled",
  );
  const totalRevenue = fulfillment
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => {
      const cents = parseFloat(o.total.replace(/[^0-9.]/g, "")) * 100;
      return sum + cents;
    }, 0);

  const stats = [
    { label: "Active Orders", value: activeOrders.length },
    { label: "Menu Items", value: catalog.length },
    { label: "Delivered", value: fulfillment.filter((o) => o.status === "delivered").length },
    { label: "Revenue", value: money(totalRevenue) },
  ];

  return (
    <>
      <h1 className="merchant-page-title">Dashboard</h1>
      <p className="merchant-page-subtitle">
        Welcome back, {profile.displayName} — here is your store at a glance
      </p>

      <div className="merchant-stats">
        {stats.map((stat) => (
          <div key={stat.label} className="merchant-stat-card">
            <div className="merchant-stat-value">{stat.value}</div>
            <div className="merchant-stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div className="merchant-card">
          <div className="merchant-card-title">
            <span className="material-symbols-outlined">receipt_long</span>
            Recent Orders
          </div>
          <div className="merchant-list">
            {fulfillment.length === 0 ? (
              <p style={{ color: "var(--muted)", padding: 16, textAlign: "center" }}>
                No orders yet. Share your storefront link to start receiving orders.
              </p>
            ) : (
              fulfillment.slice(0, 5).map((order) => (
                <div key={order.publicRef} className="merchant-list-item">
                  <div className="merchant-list-item-info">
                    <div className="merchant-list-item-title">{order.publicRef}</div>
                    <div className="merchant-list-item-meta">
                      {order.customer} • {order.total} • {order.status.replace(/_/g, " ")}
                    </div>
                  </div>
                  <span className={`status-badge status-${order.status}`}>
                    {order.status.replace(/_/g, " ")}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="merchant-card">
          <div className="merchant-card-title">
            <span className="material-symbols-outlined">restaurant_menu</span>
            Menu Quick View
          </div>
          <div className="merchant-list">
            {catalog.length === 0 ? (
              <p style={{ color: "var(--muted)", padding: 16, textAlign: "center" }}>
                No menu items. Add items in the Menu section.
              </p>
            ) : (
              catalog.slice(0, 5).map((item) => (
                <div key={item.id} className="merchant-list-item">
                  <div className="merchant-list-item-info">
                    <div className="merchant-list-item-title">{item.name}</div>
                    <div className="merchant-list-item-meta">
                      {item.displayPrice} • {item.isAvailable ? "Available" : "Unavailable"}
                    </div>
                  </div>
                  <span
                    className="status-badge"
                    style={{
                      background: item.isAvailable ? "var(--mint)" : "var(--error-container)",
                      color: item.isAvailable ? "var(--ink)" : "var(--error)",
                    }}
                  >
                    {item.isAvailable ? "On" : "Off"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
