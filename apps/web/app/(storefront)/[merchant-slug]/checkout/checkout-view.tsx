"use client";

import { useState, type FormEvent, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toRinggit } from "../../../../lib/format";
import type { MenuItemSnapshot } from "@taukei/domain";
import type { StorefrontMerchant } from "../../../../lib/data-access";
import { useCart } from "../../../../components/storefront/cart-context";
import { submitCheckout } from "./actions";

interface CheckoutViewProps {
  merchant: StorefrontMerchant;
  catalog: MenuItemSnapshot[];
  storeId: string;
}

interface DeliveryQuoteResult {
  quotationId: string;
  stopIds: { pickup: string; dropoff: string };
  feeCents: number;
  currency: string;
  vehicleType: string;
  serviceType: string;
  expiresAt: string;
}

interface FormErrors {
  name?: string;
  phone?: string;
  line1?: string;
  city?: string;
}

export function CheckoutView({ merchant, catalog, storeId }: CheckoutViewProps) {
  const router = useRouter();
  const { state: cart, dispatch, subtotalCents } = useCart();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressPostcode, setAddressPostcode] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Delivery quote state
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [deliveryQuote, setDeliveryQuote] = useState<DeliveryQuoteResult | null>(null);
  const [quoteError, setQuoteError] = useState("");

  const deliveryFeeCents = deliveryQuote?.feeCents ?? 0;
  const platformFeeCents = 100; // RM 1.00
  const totalCents = subtotalCents + deliveryFeeCents + platformFeeCents;

  // Redirect if cart is empty
  if (cart.lines.length === 0 && typeof window !== "undefined") {
    router.replace(`/${merchant.slug}`);
    return null;
  }

  function validate(): boolean {
    const newErrors: FormErrors = {};

    if (!customerName.trim()) {
      newErrors.name = "Name is required";
    }

    const phoneRegex = /^01[0-9]-?[0-9]{7,8}$/;
    const cleanPhone = customerPhone.replace(/-/g, "");
    if (!customerPhone.trim()) {
      newErrors.phone = "Phone number is required for delivery";
    } else if (!phoneRegex.test(cleanPhone)) {
      newErrors.phone = "Enter a valid Malaysian mobile (e.g. 0123456789)";
    }

    if (!addressLine1.trim()) {
      newErrors.line1 = "Address is required";
    }
    if (!addressCity.trim()) {
      newErrors.city = "City is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  const fetchDeliveryQuote = useCallback(async () => {
    if (!addressLine1.trim() || !addressCity.trim()) return;

    setQuoteLoading(true);
    setQuoteError("");
    try {
      const res = await fetch("/api/delivery/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          dropoff: {
            latitude: 3.139, // Default KL coords — will be replaced with geocoded values
            longitude: 101.6869,
            address: `${addressLine1}, ${addressCity}${addressPostcode ? `, ${addressPostcode}` : ""}`,
          },
        }),
      });

      const data = await res.json();

      if (data.success) {
        setDeliveryQuote(data);
        setQuoteError("");
      } else {
        setDeliveryQuote(null);
        setQuoteError(data.error || "Unable to get delivery quote");
      }
    } catch {
      setDeliveryQuote(null);
      setQuoteError("Failed to fetch delivery quote");
    } finally {
      setQuoteLoading(false);
    }
  }, [storeId, addressLine1, addressCity, addressPostcode]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError("");

    if (!validate()) return;

    setSubmitting(true);
    try {
      const result = await submitCheckout({
        cartLines: cart.lines.map((l) => ({
          menuItemId: l.item.id,
          quantity: l.quantity,
        })),
        catalog,
        merchantId: merchant.id,
        storeId,
        merchantSlug: merchant.slug,
        customerName,
        customerPhone,
        customerEmail,
        addressLine1,
        addressCity,
        addressPostcode,
        deliveryQuote: deliveryQuote
          ? {
              quotationId: deliveryQuote.quotationId,
              stopIds: deliveryQuote.stopIds,
              feeCents: deliveryQuote.feeCents,
              serviceType: deliveryQuote.serviceType,
              expiresAt: deliveryQuote.expiresAt,
            }
          : undefined,
      });

      if (result.ok) {
        if (result.checkoutUrl) {
          // Redirect to Stripe Checkout
          window.location.href = result.checkoutUrl;
        }
        dispatch({ type: "CLEAR_CART" });
      } else {
        setSubmitError(result.message);
        setSubmitting(false);
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong. Please try again.",
      );
      setSubmitting(false);
    }
  }

  return (
    <main className="shell" style={{ paddingTop: 24, paddingBottom: 60, maxWidth: 600 }}>
      <a
        href={`/${merchant.slug}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: "var(--muted)",
          textDecoration: "none",
          fontWeight: 600,
          fontSize: "0.94rem",
          marginBottom: 20,
        }}
      >
        ← Back to menu
      </a>

      <h1
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: "clamp(1.5rem, 4vw, 2rem)",
          fontWeight: 700,
          margin: "0 0 8px",
        }}
      >
        Checkout
      </h1>
      <p style={{ color: "var(--muted)", margin: "0 0 28px", lineHeight: 1.5 }}>
        {merchant.name} · {merchant.city}
      </p>

      <form onSubmit={handleSubmit} noValidate>
        {/* Order Summary Card */}
        <div className="hero-card" style={{ padding: 20, marginBottom: 20 }}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.1rem", fontWeight: 700, margin: "0 0 14px" }}>
            Your Order
          </h2>

          {cart.lines.map((line) => (
            <div key={line.item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", fontSize: "0.94rem" }}>
              <span style={{ fontWeight: 600 }}>{line.quantity}× {line.item.name}</span>
              <span>{toRinggit(line.item.priceCents * line.quantity)}</span>
            </div>
          ))}

          <div style={{ borderTop: "1.5px solid var(--surface-container, #e9edff)", marginTop: 12, paddingTop: 12, display: "flex", flexDirection: "column", gap: 6, fontSize: "0.94rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)" }}>
              <span>Subtotal</span>
              <span>{toRinggit(subtotalCents)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)" }}>
              <span>Delivery fee</span>
              <span>
                {quoteLoading ? "Calculating..." : deliveryQuote ? toRinggit(deliveryFeeCents) : "Enter address to calculate"}
              </span>
            </div>
            {quoteError && (
              <p style={{ margin: 0, color: "var(--primary)", fontSize: "0.82rem" }}>
                {quoteError}
              </p>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)" }}>
              <span>Platform fee</span>
              <span>{toRinggit(platformFeeCents)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "1.1rem", fontFamily: "'Space Grotesk', sans-serif", paddingTop: 6, borderTop: "2px solid var(--outline)" }}>
              <span>Total</span>
              <span style={{ color: "var(--primary)" }}>{toRinggit(totalCents)}</span>
            </div>
          </div>
        </div>

        {/* Customer Info Card */}
        <div className="hero-card" style={{ padding: 20, marginBottom: 20 }}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.1rem", fontWeight: 700, margin: "0 0 16px" }}>
            Your Details
          </h2>
          <div style={{ marginBottom: 14 }}>
            <label htmlFor="c-name" style={{ display: "block", fontWeight: 700, fontSize: "0.88rem", marginBottom: 4 }}>Name</label>
            <input id="c-name" type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. Ahmad bin Ali" style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: `2px solid ${errors.name ? "var(--primary)" : "var(--outline)"}`, background: "var(--surface-container, #e9edff)", fontSize: "0.94rem", fontWeight: 500, outline: "none" }} />
            {errors.name && <p className="field-error" style={{ margin: "4px 0 0", color: "var(--primary)", fontSize: "0.82rem" }}>{errors.name}</p>}
          </div>
          <div style={{ marginBottom: 14 }}>
            <label htmlFor="c-phone" style={{ display: "block", fontWeight: 700, fontSize: "0.88rem", marginBottom: 4 }}>Phone (for delivery coordination)</label>
            <input id="c-phone" type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="e.g. 0123456789" style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: `2px solid ${errors.phone ? "var(--primary)" : "var(--outline)"}`, background: "var(--surface-container, #e9edff)", fontSize: "0.94rem", fontWeight: 500, outline: "none" }} />
            {errors.phone && <p className="field-error" style={{ margin: "4px 0 0", color: "var(--primary)", fontSize: "0.82rem" }}>{errors.phone}</p>}
          </div>
          <div>
            <label htmlFor="c-email" style={{ display: "block", fontWeight: 700, fontSize: "0.88rem", marginBottom: 4 }}>Email (optional — for order updates)</label>
            <input id="c-email" type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="e.g. ahmad@email.com" style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: "2px solid var(--outline)", background: "var(--surface-container, #e9edff)", fontSize: "0.94rem", fontWeight: 500, outline: "none" }} />
          </div>
        </div>

        {/* Delivery Address Card */}
        <div className="hero-card" style={{ padding: 20, marginBottom: 24 }}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.1rem", fontWeight: 700, margin: "0 0 16px" }}>
            Delivery Address
          </h2>
          <div style={{ marginBottom: 14 }}>
            <label htmlFor="addr-line1" style={{ display: "block", fontWeight: 700, fontSize: "0.88rem", marginBottom: 4 }}>Address</label>
            <input id="addr-line1" type="text" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} placeholder="e.g. 12 Jalan Ampang, Unit 3-5" style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: `2px solid ${errors.line1 ? "var(--primary)" : "var(--outline)"}`, background: "var(--surface-container, #e9edff)", fontSize: "0.94rem", fontWeight: 500, outline: "none" }} />
            {errors.line1 && <p className="field-error" style={{ margin: "4px 0 0", color: "var(--primary)", fontSize: "0.82rem" }}>{errors.line1}</p>}
          </div>
          <div style={{ marginBottom: 14 }}>
            <label htmlFor="addr-city" style={{ display: "block", fontWeight: 700, fontSize: "0.88rem", marginBottom: 4 }}>City</label>
            <input id="addr-city" type="text" value={addressCity} onChange={(e) => setAddressCity(e.target.value)} placeholder="e.g. Kuala Lumpur" style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: `2px solid ${errors.city ? "var(--primary)" : "var(--outline)"}`, background: "var(--surface-container, #e9edff)", fontSize: "0.94rem", fontWeight: 500, outline: "none" }} />
            {errors.city && <p className="field-error" style={{ margin: "4px 0 0", color: "var(--primary)", fontSize: "0.82rem" }}>{errors.city}</p>}
          </div>
          <div>
            <label htmlFor="addr-postcode" style={{ display: "block", fontWeight: 700, fontSize: "0.88rem", marginBottom: 4 }}>Postcode (optional)</label>
            <input id="addr-postcode" type="text" value={addressPostcode} onChange={(e) => setAddressPostcode(e.target.value)} placeholder="e.g. 50450" style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: "2px solid var(--outline)", background: "var(--surface-container, #e9edff)", fontSize: "0.94rem", fontWeight: 500, outline: "none" }} />
          </div>
          {/* Get Quote Button */}
          <button
            type="button"
            onClick={fetchDeliveryQuote}
            disabled={quoteLoading || !addressLine1.trim() || !addressCity.trim()}
            style={{
              marginTop: 16,
              width: "100%",
              padding: "10px 14px",
              borderRadius: 12,
              border: "2px solid var(--outline)",
              background: quoteLoading ? "var(--muted)" : "var(--surface-container, #e9edff)",
              color: "var(--primary)",
              fontWeight: 700,
              fontSize: "0.88rem",
              cursor: quoteLoading ? "not-allowed" : "pointer",
            }}
          >
            {quoteLoading ? "Calculating delivery fee..." : "Calculate Delivery Fee"}
          </button>
        </div>

        {submitError && (
          <div style={{ padding: "12px 16px", borderRadius: 12, background: "#fce4e4", border: "2px solid var(--primary)", color: "var(--primary)", fontWeight: 600, fontSize: "0.94rem", marginBottom: 20 }}>
            {submitError}
          </div>
        )}

        <button
          type="submit"
          className="button primary"
          disabled={submitting || quoteLoading}
          style={{
            width: "100%",
            minHeight: 52,
            border: "2px solid var(--outline)",
            borderRadius: 999,
            background: submitting ? "var(--muted)" : "var(--primary)",
            color: "#fff",
            fontWeight: 800,
            fontSize: "1.05rem",
            cursor: submitting ? "not-allowed" : "pointer",
            boxShadow: "3px 3px 0 var(--outline)",
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? "Processing..." : `Place Order · ${toRinggit(totalCents)}`}
        </button>
      </form>
    </main>
  );
}
