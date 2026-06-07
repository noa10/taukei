"use client";

import type { MenuItemSnapshot } from "@taukei/domain";
import { toRinggit } from "../../lib/format";

interface MenuItemCardProps {
  item: MenuItemSnapshot;
  onAddToCart?: (item: MenuItemSnapshot) => void;
}

export function MenuItemCard({ item, onAddToCart }: MenuItemCardProps) {
  return (
    <div
      className="menu-item-card"
      style={{
        border: "2px solid var(--outline)",
        borderRadius: 16,
        background: "var(--card, #fff)",
        boxShadow: "3px 3px 0 var(--outline)",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {/* Image */}
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt={item.name}
          style={{
            width: "100%",
            aspectRatio: "4/3",
            borderRadius: 12,
            objectFit: "cover",
          }}
          loading="lazy"
        />
      ) : (
        <div
          style={{
            width: "100%",
            aspectRatio: "4/3",
            borderRadius: 12,
            background: "var(--surface-container, #e9edff)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2rem",
          }}
          aria-hidden="true"
        >
          🍽️
        </div>
      )}

      {/* Name + price */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <h3
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "1.05rem",
            fontWeight: 700,
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          {item.name}
        </h3>
        <span
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "1.05rem",
            fontWeight: 700,
            color: "var(--primary, #b52330)",
            whiteSpace: "nowrap",
          }}
        >
          {toRinggit(item.priceCents)}
        </span>
      </div>

      {/* Badges row */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {item.isFragile && (
          <span className="chip chip-fragile" style={{
            display: "inline-block",
            padding: "4px 10px",
            borderRadius: 999,
            fontSize: "0.72rem",
            fontWeight: 700,
            background: "#fff3cd",
            color: "#856404",
            border: "1.5px solid #856404",
          }}>
            🥡 Fragile
          </span>
        )}
        {item.prepBufferMinutes > 0 && (
          <span className="chip chip-prep" style={{
            display: "inline-block",
            padding: "4px 10px",
            borderRadius: 999,
            fontSize: "0.72rem",
            fontWeight: 600,
            background: "var(--surface-container, #e9edff)",
            color: "var(--muted, #5a403f)",
            border: "1.5px solid var(--outline, #293040)",
          }}>
            ⏱ {item.prepBufferMinutes}min prep
          </span>
        )}
      </div>

      {/* Add button */}
      <button
        type="button"
        className="button primary"
        style={{
          width: "100%",
          minHeight: 40,
          padding: "0 16px",
          border: "2px solid var(--outline)",
          borderRadius: 999,
          background: "var(--primary, #b52330)",
          color: "#fff",
          fontWeight: 800,
          fontSize: "0.88rem",
          cursor: "pointer",
          boxShadow: "2px 2px 0 var(--outline)",
          marginTop: "auto",
        }}
        onClick={() => onAddToCart?.(item)}
        disabled={!item.isAvailable}
      >
        {item.isAvailable ? "Add" : "Unavailable"}
      </button>
    </div>
  );
}
