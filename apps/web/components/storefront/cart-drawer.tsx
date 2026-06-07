"use client";

import { useRouter } from "next/navigation";
import { useCart } from "./cart-context";
import { toRinggit } from "../../lib/format";

interface CartDrawerProps {
  merchantSlug: string;
}

export function CartDrawer({ merchantSlug }: CartDrawerProps) {
  const router = useRouter();
  const { state, dispatch, subtotalCents, itemCount } = useCart();

  if (!state.isOpen) return null;

  const handleCheckout = () => {
    dispatch({ type: "CLOSE_DRAWER" });
    router.push(`/${merchantSlug}/checkout`);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => dispatch({ type: "CLOSE_DRAWER" })}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(20, 27, 43, 0.5)",
          zIndex: 60,
        }}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 70,
          maxHeight: "70vh",
          background: "var(--card, #fff)",
          borderTop: "2px solid var(--outline, #293040)",
          borderRadius: "24px 24px 0 0",
          boxShadow: "0 -4px 0 var(--outline, #293040)",
          display: "flex",
          flexDirection: "column",
          animation: "slideUp 0.2s ease-out",
        }}
        role="dialog"
        aria-label="Shopping cart"
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px 12px",
            borderBottom: "1.5px solid var(--surface-container, #e9edff)",
          }}
        >
          <h2
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "1.25rem",
              fontWeight: 700,
              margin: 0,
            }}
          >
            Your Order ({itemCount})
          </h2>
          <button
            type="button"
            onClick={() => dispatch({ type: "CLOSE_DRAWER" })}
            aria-label="Close cart"
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: "2px solid var(--outline, #293040)",
              background: "#fff",
              fontSize: "1rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        {/* Line items */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px" }}>
          {state.lines.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "var(--muted)" }}>
              <span style={{ fontSize: "3rem", display: "block", marginBottom: 12 }}>🛒</span>
              <p style={{ margin: 0, fontSize: "1rem" }}>Your cart is empty</p>
              <p style={{ margin: "4px 0 0", fontSize: "0.88rem" }}>Tap items from the menu to add them.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {state.lines.map((line) => (
                <div
                  key={line.item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 0",
                    borderBottom: "1px solid var(--surface-container, #e9edff)",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontWeight: 700,
                        fontSize: "0.94rem",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {line.item.name}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "var(--primary)" }}>
                      {toRinggit(line.item.priceCents)} each
                    </p>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button
                      type="button"
                      onClick={() =>
                        dispatch({
                          type: "SET_QUANTITY",
                          itemId: line.item.id,
                          quantity: line.quantity - 1,
                        })
                      }
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        border: "2px solid var(--outline)",
                        background: "#fff",
                        fontWeight: 800,
                        fontSize: "1rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      aria-label={`Remove one ${line.item.name}`}
                    >
                      −
                    </button>
                    <span style={{ minWidth: 20, textAlign: "center", fontWeight: 700, fontSize: "0.94rem" }}>
                      {line.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        dispatch({
                          type: "SET_QUANTITY",
                          itemId: line.item.id,
                          quantity: line.quantity + 1,
                        })
                      }
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        border: "2px solid var(--outline)",
                        background: "var(--primary)",
                        color: "#fff",
                        fontWeight: 800,
                        fontSize: "1rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      aria-label={`Add one ${line.item.name}`}
                    >
                      +
                    </button>
                  </div>

                  <span style={{ fontWeight: 700, fontSize: "0.94rem", minWidth: 60, textAlign: "right" }}>
                    {toRinggit(line.item.priceCents * line.quantity)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {state.lines.length > 0 && (
          <div
            style={{
              borderTop: "2px solid var(--outline, #293040)",
              padding: "16px 20px 20px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <span style={{ fontWeight: 600, fontSize: "1rem" }}>Subtotal</span>
              <span
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700,
                  fontSize: "1.15rem",
                }}
              >
                {toRinggit(subtotalCents)}
              </span>
            </div>
            <button
              type="button"
              className="button primary"
              style={{
                width: "100%",
                minHeight: 48,
                border: "2px solid var(--outline)",
                borderRadius: 999,
                background: "var(--primary)",
                color: "#fff",
                fontWeight: 800,
                fontSize: "1rem",
                cursor: "pointer",
                boxShadow: "3px 3px 0 var(--outline)",
              }}
              onClick={handleCheckout}
            >
              Go to Checkout →
            </button>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
