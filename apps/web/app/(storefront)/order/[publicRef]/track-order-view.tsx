"use client";

import type { FulfillmentOrder, StorefrontMerchant } from "../../../../lib/data-access";
import type { CustomerOrderRecordSet } from "../../../../lib/customer-orders";

const fulfilmentSteps = [
  { key: "new", label: "Order Placed", icon: "📝" },
  { key: "accepted", label: "Accepted", icon: "✅" },
  { key: "preparing", label: "Preparing", icon: "👨‍🍳" },
  { key: "ready_for_pickup", label: "Ready for Pickup", icon: "📦" },
  { key: "out_for_delivery", label: "Out for Delivery", icon: "🛵" },
  { key: "delivered", label: "Delivered", icon: "🎉" },
] as const;

const stepOrder: Record<string, number> = {};
fulfilmentSteps.forEach((step, i) => {
  stepOrder[step.key] = i;
});

const statusColors: Record<string, { bg: string; border: string; text: string }> = {
  new: { bg: "#fff3cd", border: "#856404", text: "#856404" },
  accepted: { bg: "#cce5ff", border: "#004085", text: "#004085" },
  preparing: { bg: "#fff3cd", border: "#856404", text: "#856404" },
  ready_for_pickup: { bg: "#d4edda", border: "#155724", text: "#155724" },
  out_for_delivery: { bg: "#d4edda", border: "#155724", text: "#155724" },
  delivered: { bg: "#d4edda", border: "#155724", text: "#155724" },
  cancelled: { bg: "#fce4e4", border: "#b52330", text: "#b52330" },
};

interface TrackOrderViewProps {
  order: FulfillmentOrder;
  merchant: StorefrontMerchant | null;
  trackingRecords?: CustomerOrderRecordSet | null;
}

function formatRinggit(cents: number): string {
  return `RM ${(cents / 100).toFixed(2)}`;
}

export function TrackOrderView({ order, merchant, trackingRecords }: TrackOrderViewProps) {
  const currentStepIdx = stepOrder[order.status] ?? -1;
  const isCancelled = order.status === "cancelled";
  const isDelivered = order.status === "delivered";
  const colors = statusColors[order.status] ?? statusColors.new;

  const driverInfo = trackingRecords?.deliveryJob;
  const hasDriver = driverInfo?.driver_name || driverInfo?.driver_phone;

  return (
    <main className="shell" style={{ paddingTop: 24, paddingBottom: 60, maxWidth: 560 }}>
      <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--muted)", textDecoration: "none", fontWeight: 600, fontSize: "0.94rem", marginBottom: 20 }}>
        ← Home
      </a>

      {/* Status banner */}
      <div className="hero-card" style={{ padding: 24, marginBottom: 20, background: isCancelled ? "#fce4e4" : isDelivered ? "#d4edda" : "var(--card, #fff)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 999, background: colors.bg, border: `2px solid ${colors.border}`, color: colors.text, fontSize: "0.88rem", fontWeight: 700 }}>
            {isCancelled ? "❌ Cancelled" : isDelivered ? "🎉 Delivered" : "🔄 Active"}
          </span>
          <span style={{ fontSize: "0.88rem", color: "var(--muted)", fontWeight: 600 }}>
            {order.publicRef}
          </span>
        </div>

        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(1.4rem, 3vw, 1.8rem)", fontWeight: 700, margin: "0 0 4px" }}>
          {merchant?.name ?? "Your Order"}
        </h1>

        <p style={{ color: "var(--muted)", margin: 0, fontSize: "0.94rem" }}>
          {isCancelled ? "This order has been cancelled." : isDelivered ? "Your order has been delivered. Enjoy!" : `Next: ${order.nextAction}`}
        </p>
      </div>

      {/* Progress steps */}
      {!isCancelled && (
        <div className="hero-card" style={{ padding: 24, marginBottom: 20 }}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.05rem", fontWeight: 700, margin: "0 0 20px" }}>
            Order Progress
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {fulfilmentSteps.map((step, idx) => {
              const isPast = idx <= currentStepIdx && currentStepIdx >= 0;
              const isCurrent = idx === currentStepIdx;
              const isFuture = idx > currentStepIdx;
              return (
                <div key={step.key} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 40, flexShrink: 0 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", border: `2px solid ${isPast ? "var(--mint, #6bfe9c)" : "var(--outline)"}`, background: isPast ? "var(--mint, #6bfe9c)" : isCurrent ? "var(--primary)" : "#fff", color: isPast ? "var(--ink)" : isCurrent ? "#fff" : "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem", fontWeight: 800 }}>
                      {isPast ? "✓" : idx + 1}
                    </div>
                    {idx < fulfilmentSteps.length - 1 && (
                      <div style={{ width: 2, flex: 1, minHeight: 24, background: isPast ? "var(--mint, #6bfe9c)" : "var(--surface-container, #e9edff)", margin: "4px 0" }} />
                    )}
                  </div>
                  <div style={{ paddingTop: 4, paddingBottom: idx < fulfilmentSteps.length - 1 ? 20 : 0 }}>
                    <p style={{ margin: 0, fontWeight: isPast || isCurrent ? 700 : 500, fontSize: "0.94rem", color: isFuture ? "var(--muted)" : "var(--ink)", opacity: isFuture ? 0.6 : 1 }}>
                      {step.icon} {step.label}
                    </p>
                    {isCurrent && <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "var(--primary)", fontWeight: 600 }}>Current step</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Driver info card (live data) */}
      {hasDriver && (
        <div className="hero-card" style={{ padding: 20, marginBottom: 20 }}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.05rem", fontWeight: 700, margin: "0 0 14px" }}>
            🛵 Your Rider
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: "0.94rem" }}>
            {driverInfo?.driver_name && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>Name</span>
                <span style={{ fontWeight: 600 }}>{driverInfo.driver_name}</span>
              </div>
            )}
            {driverInfo?.driver_phone && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>Phone</span>
                <a href={`tel:${driverInfo.driver_phone}`} style={{ fontWeight: 600, color: "var(--primary)", textDecoration: "none" }}>{driverInfo.driver_phone}</a>
              </div>
            )}
            {driverInfo?.driver_plate && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>Vehicle plate</span>
                <span style={{ fontWeight: 600, fontFamily: "monospace" }}>{driverInfo.driver_plate}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Order details */}
      <div className="hero-card" style={{ padding: 20 }}>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.05rem", fontWeight: 700, margin: "0 0 14px" }}>
          Order Details
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: "0.94rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--muted)" }}>Order Ref</span>
            <span style={{ fontWeight: 700, fontFamily: "monospace" }}>{order.publicRef}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--muted)" }}>Customer</span>
            <span style={{ fontWeight: 600 }}>{order.customer}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--muted)" }}>Total</span>
            <span style={{ fontWeight: 700, color: "var(--primary)", fontFamily: "'Space Grotesk', sans-serif" }}>{order.total}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--muted)" }}>Payment</span>
            <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{order.paymentMode}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--muted)" }}>Delivery</span>
            <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{order.deliveryMode}</span>
          </div>
          {trackingRecords?.order && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>Delivery fee</span>
                <span>{formatRinggit(trackingRecords.order.delivery_fee_cents)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>Platform fee</span>
                <span>{formatRinggit(trackingRecords.order.platform_fee_cents)}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
