import { createServerSupabaseClient } from "../../../lib/supabase/server";
import { getServerSupabaseUser } from "../../../lib/supabase/server";
import OnboardingForm from "./onboarding-form";

export default async function MerchantOnboardingPage() {
  const { user } = await getServerSupabaseUser();

  let hasMembership = false;
  let profile: {
    storeName: string;
    city: string;
    kitchenPrepBufferMinutes: number;
    defaultVehicleType: "MOTORCYCLE" | "CAR";
    publicOrderingEnabled: boolean;
    slug: string;
    onboardingComplete: boolean;
  } = {
    storeName: "",
    city: "Kuala Lumpur",
    kitchenPrepBufferMinutes: 20,
    defaultVehicleType: "MOTORCYCLE" as const,
    publicOrderingEnabled: false,
    slug: "",
    onboardingComplete: false,
  };

  if (user) {
    const client = await createServerSupabaseClient();
    if (client) {
      const { data: membership } = await client
        .from("merchant_memberships")
        .select("merchant_id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (membership) {
        hasMembership = true;

        const { data: store } = await client
          .from("stores")
          .select("name, city, prep_buffer_minutes, default_vehicle_type, public_ordering_enabled")
          .eq("merchant_id", membership.merchant_id)
          .limit(1)
          .maybeSingle();

        const { data: merchant } = await client
          .from("merchants")
          .select("slug, display_name")
          .eq("id", membership.merchant_id)
          .single();

        profile = {
          storeName: store?.name ?? merchant?.display_name ?? "",
          city: store?.city ?? "Kuala Lumpur",
          kitchenPrepBufferMinutes: store?.prep_buffer_minutes ?? 20,
          defaultVehicleType: (store?.default_vehicle_type as "MOTORCYCLE" | "CAR") ?? "MOTORCYCLE",
          publicOrderingEnabled: store?.public_ordering_enabled ?? false,
          slug: merchant?.slug ?? "",
          onboardingComplete: Boolean(store?.name),
        };
      }
    }
  }

  return (
    <>
      <h1 className="merchant-page-title">Onboarding</h1>
      <p className="merchant-page-subtitle">
        {hasMembership
          ? "Set up your store profile, kitchen settings, and logistics defaults"
          : "Create your merchant store to start taking orders"
        }
      </p>

      <div className="merchant-card" style={{ maxWidth: 640 }}>
        <div className="merchant-card-title">
          <span className="material-symbols-outlined">store</span>
          {hasMembership ? "Store Profile" : "Create Your Store"}
        </div>
        <OnboardingForm initialProfile={profile} hasMembership={hasMembership} />
      </div>

      {hasMembership && (
        <div className="merchant-card" style={{ maxWidth: 640, marginTop: 24 }}>
          <div className="merchant-card-title">
            <span className="material-symbols-outlined">info</span>
            Your Storefront
          </div>
          <p style={{ fontSize: "0.9rem", color: "var(--muted)", lineHeight: 1.6 }}>
            Your public storefront is live at{" "}
            <a
              href={`/${profile.slug}`}
              style={{ fontFamily: "Space Grotesk, monospace", color: "var(--primary)", fontWeight: 600 }}
            >
              {profile.slug}
            </a>
            . Share this link with customers so they can place orders directly.
          </p>
        </div>
      )}
    </>
  );
}
