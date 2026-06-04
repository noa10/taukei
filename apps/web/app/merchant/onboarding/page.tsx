import { Badge, Card, SectionHeader } from "../../../components/primitives";
import { getMerchantOperationsContext } from "../../../lib/data-access";
import { upsertMerchantProfileDefaultsAction } from "../actions";

export const metadata = { title: "Merchant onboarding" };

export default async function MerchantOnboardingPage() {
  const context = await getMerchantOperationsContext();
  if (!context.ok || !context.profile) throw new Error(context.guard.reason ?? "Merchant profile unavailable");
  const merchantProfile = context.profile;
  const mutationPreview = await upsertMerchantProfileDefaultsAction({ merchantId: context.guard.tenantScope.replace("merchant:", ""), storeName: context.profile.storeName, city: context.profile.city, kitchenPrepBufferMinutes: context.profile.kitchenPrepBufferMinutes, defaultVehicleType: context.profile.defaultVehicleType, publicOrderingEnabled: context.profile.publicOrderingEnabled });
  const defaults = [
    ["Store", merchantProfile.storeName],
    ["City", merchantProfile.city],
    ["Prep buffer", `${merchantProfile.kitchenPrepBufferMinutes} minutes`],
    ["Default vehicle", merchantProfile.defaultVehicleType],
    ["Fragile override", merchantProfile.fragileOverride],
    ["Public ordering", merchantProfile.publicOrderingEnabled ? "Enabled" : "Disabled"]
  ];
  return (
    <main className="shell customer-shell">
      <SectionHeader eyebrow="Onboarding" title="Profile, kitchen, logistics" body="Seeded defaults that future forms will persist through tenant-safe Supabase mutations." />
      <section className="menu-grid">
        {defaults.map(([label, value]) => <Card key={label}><Badge>{label}</Badge><h2>{value}</h2></Card>)}
      </section>
      <section className="safety"><h2>Mutation boundary</h2><p>{mutationPreview.status}: {mutationPreview.message}</p></section>
    </main>
  );
}
