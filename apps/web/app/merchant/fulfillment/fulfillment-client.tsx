"use client";

import { useState } from "react";
import { transitionOrderStatus } from "./actions";
import { legalFulfillmentNextStatuses, type FulfillmentStatus } from "../../../lib/merchant-types";

function formatCents(cents: number): string {
  return `RM ${(cents / 100).toFixed(2)}`;
}

function formatDateTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleString("en-MY", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const statusLabels: Record<FulfillmentStatus, string> = {
  new: "New",
  accepted: "Accepted",
  preparing: "Preparing",
  ready_for_pickup: "Ready for Pickup",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

interface FulfillmentOrder {
  publicRef: string;
  merchantId: string;
  customerName: string;
  customerPhone: string;
  items: { name: string; quantity: number; priceCents: number }[];
  totalCents: number;
  status: FulfillmentStatus;
  createdAt: string;
  paymentMethod: string;
  deliveryProvider: string;
  notes?: string;
}

interface FulfillmentClientProps {
  initialOrders: FulfillmentOrder[];
}

export default function FulfillmentClient({ initialOrders }: FulfillmentClientProps) {
  const [orders, setOrders] = useState<FulfillmentOrder[]>(initialOrders);
  const [selectedOrder, setSelectedOrder] = useState<FulfillmentOrder | null>(null);
  const [filter, setFilter] = useState<FulfillmentStatus | "all">("all");
  const [transitioning, setTransitioning] = useState(false);

  const handleTransition = async (publicRef: string, nextStatus: FulfillmentStatus) => {
    setTransitioning(true);
    try {
      const result = await transitionOrderStatus(publicRef, nextStatus);
      if (result.status === "rejected") {
        alert(result.message);
      } else {
        // Optimistic update
        setOrders((prev) =>
          prev.map((o) =>
            o.publicRef === publicRef ? { ...o, status: nextStatus } : o
          )
        );
        if (selectedOrder?.publicRef === publicRef) {
          setSelectedOrder((prev) =>
            prev ? { ...prev, status: nextStatus } : prev
          );
        }
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to transition order.");
    }
    setTransitioning(false);
  };

  const filteredOrders = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  const statusCounts = {
    new: orders.filter((o) => o.status === "new").length,
    accepted: orders.filter((o) => o.status === "accepted").length,
    preparing: orders.filter((o) => o.status === "preparing").length,
    ready_for_pickup: orders.filter((o) => o.status === "ready_for_pickup").length,
    out_for_delivery: orders.filter((o) => o.status === "out_for_delivery").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  };

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        <button className={`merchant-btn merchant-btn-sm ${filter === "all" ? "merchant-btn-primary" : "merchant-btn-secondary"}`} onClick={() => setFilter("all")}>
          All ({orders.length})
        </button>
        {(Object.keys(statusCounts) as FulfillmentStatus[]).map((status) => (
          <button key={status} className={`merchant-btn merchant-btn-sm ${filter === status ? "merchant-btn-primary" : "merchant-btn-secondary"}`} onClick={() => setFilter(status)}>
            {statusLabels[status]} ({statusCounts[status]})
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24 }}>
        <div className="merchant-list">
          {filteredOrders.length === 0 ? (
            <div className="merchant-card" style={{ textAlign: "center", padding: 48 }}>
              <span className="material-symbols-outlined" style={{ fontSize: "3rem", color: "var(--muted)", marginBottom: 16, display: "block" }}>inbox</span>
              <p style={{ color: "var(--muted)", fontWeight: 600 }}>No orders in this status</p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div
                key={order.publicRef}
                className="merchant-list-item"
                style={{ cursor: "pointer", borderLeft: selectedOrder?.publicRef === order.publicRef ? "4px solid var(--primary)" : "4px solid transparent" }}
                onClick={() => setSelectedOrder(order)}
              >
                <div className="merchant-list-item-info">
                  <div className="merchant-list-item-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {order.publicRef}
                    <span className={`status-badge status-${order.status}`}>{statusLabels[order.status]}</span>
                  </div>
                  <div className="merchant-list-item-meta">
                    {order.customerName} • {formatCents(order.totalCents)} • {timeAgo(order.createdAt)}
                  </div>
                </div>
                <div className="merchant-list-item-actions">
                  {legalFulfillmentNextStatuses(order.status).map((nextStatus) => (
                    <button key={nextStatus} className="merchant-btn merchant-btn-sm merchant-btn-secondary" disabled={transitioning} onClick={(e) => { e.stopPropagation(); handleTransition(order.publicRef, nextStatus); }}>
                      {statusLabels[nextStatus]}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div>
          {selectedOrder ? (
            <div className="merchant-card">
              <div className="merchant-card-title" style={{ justifyContent: "space-between" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="material-symbols-outlined">receipt</span>
                  {selectedOrder.publicRef}
                </span>
                <span className={`status-badge status-${selectedOrder.status}`}>{statusLabels[selectedOrder.status]}</span>
              </div>

              <div className="order-detail-grid" style={{ marginBottom: 16 }}>
                <div className="order-detail-section"><span className="order-detail-label">Customer</span><span className="order-detail-value">{selectedOrder.customerName}</span></div>
                <div className="order-detail-section"><span className="order-detail-label">Phone</span><span className="order-detail-value">{selectedOrder.customerPhone}</span></div>
                <div className="order-detail-section"><span className="order-detail-label">Ordered</span><span className="order-detail-value">{formatDateTime(selectedOrder.createdAt)}</span></div>
                <div className="order-detail-section"><span className="order-detail-label">Total</span><span className="order-detail-value" style={{ color: "var(--primary)", fontWeight: 700 }}>{formatCents(selectedOrder.totalCents)}</span></div>
                <div className="order-detail-section"><span className="order-detail-label">Payment</span><span className="order-detail-value">{selectedOrder.paymentMethod}</span></div>
                <div className="order-detail-section"><span className="order-detail-label">Delivery</span><span className="order-detail-value">{selectedOrder.deliveryProvider}</span></div>
              </div>

              {selectedOrder.notes && (
                <div style={{ marginBottom: 16, padding: 12, background: "var(--surface-container)", borderRadius: 12, border: "2px solid var(--outline)" }}>
                  <span className="order-detail-label">Notes</span>
                  <p style={{ margin: "4px 0 0", fontWeight: 600, color: "var(--ink)" }}>{selectedOrder.notes}</p>
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <span className="order-detail-label">Items</span>
                <div className="order-items-list" style={{ marginTop: 8 }}>
                  {selectedOrder.items.map((item, i) => (
                    <div key={i} className="order-item-row">
                      <span style={{ fontWeight: 600 }}>{item.quantity}× {item.name}</span>
                      <span style={{ fontWeight: 700, color: "var(--primary)" }}>{formatCents(item.priceCents * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: "2px solid var(--outline)", paddingTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span className="order-detail-label" style={{ width: "100%", marginBottom: 4 }}>Actions</span>
                {legalFulfillmentNextStatuses(selectedOrder.status).map((nextStatus) => (
                  <button key={nextStatus} className={`merchant-btn merchant-btn-sm ${nextStatus === "cancelled" ? "merchant-btn-danger" : "merchant-btn-primary"}`} disabled={transitioning} onClick={() => handleTransition(selectedOrder.publicRef, nextStatus)}>
                    {nextStatus === "cancelled" ? <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>cancel</span> : <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>arrow_forward</span>}
                    {statusLabels[nextStatus]}
                  </button>
                ))}
                {legalFulfillmentNextStatuses(selectedOrder.status).length === 0 && (
                  <span style={{ color: "var(--muted)", fontStyle: "italic" }}>No further actions available</span>
                )}
              </div>
            </div>
          ) : (
            <div className="merchant-card" style={{ textAlign: "center", padding: 48, position: "sticky", top: 24 }}>
              <span className="material-symbols-outlined" style={{ fontSize: "3rem", color: "var(--muted)", marginBottom: 16, display: "block" }}>touch_app</span>
              <p style={{ color: "var(--muted)", fontWeight: 600 }}>Select an order to view details</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
