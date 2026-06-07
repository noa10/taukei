"use client";

import type { MenuItemSnapshot } from "@taukei/domain";
import type { StorefrontMerchant, MenuCategory } from "../../../lib/data-access";
import { MenuItemCard } from "../../../components/storefront/menu-item-card";
import { CartDrawer } from "../../../components/storefront/cart-drawer";
import { CartIcon } from "../../../components/storefront/cart-icon";
import { useCart } from "../../../components/storefront/cart-context";
import { Badge, SectionHeader } from "../../../components/primitives";

interface StorefrontViewProps {
  merchant: StorefrontMerchant;
  catalog: MenuItemSnapshot[];
  categories: MenuCategory[];
}

export function StorefrontView({ merchant, catalog, categories }: StorefrontViewProps) {
  const { dispatch } = useCart();
  const hasItems = catalog.length > 0;

  return (
    <>
      <main className="shell" style={{ paddingTop: 32, paddingBottom: 100 }}>
        {/* Merchant Header */}
        <header style={{ marginBottom: 32 }}>
          <Badge tone="salmon">{merchant.city || "Malaysia"}</Badge>
          <h1
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "clamp(1.8rem, 5vw, 2.8rem)",
              fontWeight: 700,
              lineHeight: 1.1,
              margin: "16px 0 8px",
              letterSpacing: "-0.02em",
            }}
          >
            {merchant.name}
          </h1>
          <p
            style={{
              color: "var(--muted, #5a403f)",
              fontSize: "1.05rem",
              lineHeight: 1.6,
              maxWidth: 560,
              margin: 0,
            }}
          >
            {merchant.tagline || "Fresh, made-to-order food from our kitchen to your door."}
          </p>

          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            {merchant.prepBufferMinutes > 0 && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "6px 12px",
                  borderRadius: 999,
                  background: "var(--surface-container, #e9edff)",
                  border: "1.5px solid var(--outline, #293040)",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                }}
              >
                ⏱ ~{merchant.prepBufferMinutes}min prep
              </span>
            )}
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "6px 12px",
                borderRadius: 999,
                background: "var(--surface-container, #e9edff)",
                border: "1.5px solid var(--outline, #293040)",
                fontSize: "0.82rem",
                fontWeight: 600,
              }}
            >
              📍 {merchant.city}
            </span>
          </div>
        </header>

        {/* Menu Section */}
        {hasItems ? (
          <>
            {categories.length > 0 ? (
              categories.map((category) => {
                const categoryItems = catalog.filter(
                  (item) => item.categoryId === category.id,
                );
                if (categoryItems.length === 0) return null;
                return (
                  <section key={category.id} style={{ marginBottom: 32 }}>
                    <SectionHeader
                      eyebrow={category.name}
                      title={category.name}
                    />
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fill, minmax(220px, 1fr))",
                        gap: 16,
                      }}
                      aria-label={category.name + " items"}
                    >
                      {categoryItems.map((item) => (
                        <MenuItemCard
                          key={item.id}
                          item={item}
                          onAddToCart={(menuItem) =>
                            dispatch({ type: "ADD_ITEM", item: menuItem })
                          }
                        />
                      ))}
                    </div>
                  </section>
                );
              })
            ) : (
              <>
                <SectionHeader
                  eyebrow="Menu"
                  title="Order from our kitchen"
                  body="Tap any item to add it to your order. All prices include GST."
                />
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(220px, 1fr))",
                    gap: 16,
                  }}
                  aria-label="Menu items"
                >
                  {catalog.map((item) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      onAddToCart={(menuItem) =>
                        dispatch({ type: "ADD_ITEM", item: menuItem })
                      }
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div
            className="hero-card"
            style={{ padding: 40, textAlign: "center" }}
          >
            <p style={{ fontSize: "1.2rem", color: "var(--muted)", margin: 0 }}>
              🍽️ No items available right now. Check back soon!
            </p>
            <p style={{ fontSize: "0.94rem", color: "var(--muted)", margin: "8px 0 0" }}>
              The kitchen may be updating their menu. Refresh the page to try again.
            </p>
          </div>
        )}
      </main>

      {/* Cart UI */}
      <CartIcon />
      <CartDrawer merchantSlug={merchant.slug} />
    </>
  );
}
