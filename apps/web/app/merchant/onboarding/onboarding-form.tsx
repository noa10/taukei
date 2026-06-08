"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveMerchantProfile, createNewMerchant } from "../../../lib/merchant-actions";

interface MerchantProfileShape {
  storeName: string;
  city: string;
  kitchenPrepBufferMinutes: number;
  defaultVehicleType: "MOTORCYCLE" | "CAR";
  publicOrderingEnabled: boolean;
  slug: string;
  onboardingComplete: boolean;
}

interface OnboardingFormProps {
  initialProfile: MerchantProfileShape;
  hasMembership: boolean;
}

export default function OnboardingForm({ initialProfile, hasMembership }: OnboardingFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    storeName: initialProfile.storeName,
    city: initialProfile.city,
    kitchenPrepBufferMinutes: initialProfile.kitchenPrepBufferMinutes,
    defaultVehicleType: initialProfile.defaultVehicleType,
    publicOrderingEnabled: initialProfile.publicOrderingEnabled,
    // New merchant fields (only used when hasMembership is false)
    slug: initialProfile.slug || initialProfile.storeName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    description: "",
    phone: "",
    addressLine1: "",
    state: "Kuala Lumpur",
    postcode: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : type === "number"
          ? parseInt(value, 10)
          : value,
    }));
    setSaved(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (hasMembership) {
        // Update existing merchant profile
        const result = await saveMerchantProfile({
          storeName: form.storeName,
          city: form.city,
          kitchenPrepBufferMinutes: form.kitchenPrepBufferMinutes,
          defaultVehicleType: form.defaultVehicleType,
          publicOrderingEnabled: form.publicOrderingEnabled,
        });

        if (result.status === "rejected") {
          setError(result.message);
        } else {
          setSaved(true);
        }
      } else {
        // Create new merchant + store + membership
        const result = await createNewMerchant({
          storeName: form.storeName,
          slug: form.slug,
          description: form.description || undefined,
          phone: form.phone || undefined,
          city: form.city,
          state: form.state,
          addressLine1: form.addressLine1 || undefined,
          postcode: form.postcode || undefined,
        });

        if (!result.ok) {
          setError(result.message);
        } else {
          setSaved(true);
          // Redirect to merchant dashboard after creating merchant
          router.push("/merchant");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }

    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="merchant-form">
      {!hasMembership && (
        <>
          <div className="merchant-form-group">
            <label className="merchant-form-label" htmlFor="storeName">Store Name</label>
            <input
              id="storeName"
              name="storeName"
              type="text"
              className="merchant-form-input"
              value={form.storeName}
              onChange={(e) => {
                handleChange(e);
                // Auto-generate slug from store name
                const slug = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
                setForm((prev) => ({ ...prev, slug }));
              }}
              required
            />
          </div>

          <div className="merchant-form-group">
            <label className="merchant-form-label" htmlFor="slug">Store Slug (URL)</label>
            <input
              id="slug"
              name="slug"
              type="text"
              className="merchant-form-input"
              value={form.slug}
              onChange={handleChange}
              required
              pattern="^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$"
            />
            <p className="merchant-form-hint">
              Your storefront URL: taukei.app/{form.slug}
            </p>
          </div>

          <div className="merchant-form-group">
            <label className="merchant-form-label" htmlFor="description">Store Description</label>
            <textarea
              id="description"
              name="description"
              className="merchant-form-textarea"
              rows={2}
              value={form.description}
              onChange={handleChange}
              placeholder="Brief description for your storefront"
            />
          </div>

          <div className="merchant-form-group">
            <label className="merchant-form-label" htmlFor="phone">Store Phone</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              className="merchant-form-input"
              value={form.phone}
              onChange={handleChange}
              placeholder="+60 12-345-6789"
            />
          </div>

          <div className="merchant-form-group">
            <label className="merchant-form-label" htmlFor="addressLine1">Store Address</label>
            <input
              id="addressLine1"
              name="addressLine1"
              type="text"
              className="merchant-form-input"
              value={form.addressLine1}
              onChange={handleChange}
              placeholder="No. 5, Jalan Example 1"
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div className="merchant-form-group">
              <label className="merchant-form-label" htmlFor="city">City</label>
              <input
                id="city"
                name="city"
                type="text"
                className="merchant-form-input"
                value={form.city}
                onChange={handleChange}
                required
              />
            </div>
            <div className="merchant-form-group">
              <label className="merchant-form-label" htmlFor="state">State</label>
              <input
                id="state"
                name="state"
                type="text"
                className="merchant-form-input"
                value={form.state}
                onChange={handleChange}
              />
            </div>
            <div className="merchant-form-group">
              <label className="merchant-form-label" htmlFor="postcode">Postcode</label>
              <input
                id="postcode"
                name="postcode"
                type="text"
                className="merchant-form-input"
                value={form.postcode}
                onChange={handleChange}
              />
            </div>
          </div>
        </>
      )}

      {hasMembership && (
        <div className="merchant-form-group">
          <label className="merchant-form-label" htmlFor="storeName">Store Name</label>
          <input
            id="storeName"
            name="storeName"
            type="text"
            className="merchant-form-input"
            value={form.storeName}
            onChange={handleChange}
            required
          />
        </div>
      )}

      <div className="merchant-form-group">
        <label className="merchant-form-label" htmlFor="city">{hasMembership ? "City" : "City"}</label>
        {hasMembership && (
          <input
            id="city"
            name="city"
            type="text"
            className="merchant-form-input"
            value={form.city}
            onChange={handleChange}
            required
          />
        )}
      </div>

      <div className="merchant-form-group">
        <label className="merchant-form-label" htmlFor="kitchenPrepBufferMinutes">
          Kitchen Prep Buffer (minutes)
        </label>
        <input
          id="kitchenPrepBufferMinutes"
          name="kitchenPrepBufferMinutes"
          type="number"
          min={0}
          max={240}
          className="merchant-form-input"
          value={form.kitchenPrepBufferMinutes}
          onChange={handleChange}
          required
        />
        <p className="merchant-form-hint">
          Time added before orders are marked ready for pickup. Affects storefront and delivery estimates.
        </p>
      </div>

      <div className="merchant-form-group">
        <label className="merchant-form-label" htmlFor="defaultVehicleType">
          Default Delivery Vehicle
        </label>
        <select
          id="defaultVehicleType"
          name="defaultVehicleType"
          className="merchant-form-select"
          value={form.defaultVehicleType}
          onChange={handleChange}
        >
          <option value="MOTORCYCLE">Motorcycle (fast, standard food)</option>
          <option value="CAR">Car (fragile items, cakes, boba towers)</option>
        </select>
      </div>

      <div className="merchant-form-group" style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <input
          id="publicOrderingEnabled"
          name="publicOrderingEnabled"
          type="checkbox"
          checked={form.publicOrderingEnabled}
          onChange={handleChange}
          style={{ width: 20, height: 20, accentColor: "var(--primary)" }}
        />
        <label htmlFor="publicOrderingEnabled" className="merchant-form-label" style={{ margin: 0 }}>
          Enable public ordering — customers can place orders from your storefront
        </label>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 12, background: "var(--error-container)", border: "2px solid var(--outline)", color: "var(--error)", fontWeight: 600, fontSize: "0.85rem", marginBottom: 12 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button type="submit" className="merchant-btn merchant-btn-primary" disabled={saving}>
          {saving ? (
            <>
              <span className="material-symbols-outlined" style={{ animation: "spin 1s linear infinite" }}>progress_activity</span>
              Saving…
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">save</span>
              {hasMembership ? "Save Profile" : "Create Store"}
            </>
          )}
        </button>
        {saved && (
          <span className="status-badge status-preparing" style={{ animation: "pulse 1.5s ease infinite" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>check_circle</span>
            Saved
          </span>
        )}
      </div>
    </form>
  );
}
