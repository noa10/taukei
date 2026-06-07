"use client";

import { useCart } from "./cart-context";

export function CartIcon() {
  const { itemCount, dispatch } = useCart();

  return (
    <button
      type="button"
      onClick={() => dispatch({ type: "TOGGLE_DRAWER" })}
      aria-label={`Shopping cart, ${itemCount} items`}
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 50,
        width: 56,
        height: 56,
        borderRadius: "50%",
        border: "2px solid var(--outline, #293040)",
        background: "var(--primary, #b52330)",
        color: "#fff",
        boxShadow: "3px 3px 0 var(--outline, #293040)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "1.4rem",
        cursor: "pointer",
      }}
    >
      🛒
      {itemCount > 0 && (
        <span
          style={{
            position: "absolute",
            top: -6,
            right: -6,
            minWidth: 22,
            height: 22,
            borderRadius: 999,
            background: "var(--mint, #6bfe9c)",
            color: "var(--ink, #141b2b)",
            fontSize: "0.72rem",
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid var(--outline, #293040)",
            padding: "0 4px",
          }}
        >
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      )}
    </button>
  );
}
