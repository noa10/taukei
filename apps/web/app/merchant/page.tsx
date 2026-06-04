import { Badge, ButtonLink, Card, SectionHeader } from "../../components/primitives";
import { getMerchantOperationsContext } from "../../lib/data-access";
import { getDemoMerchantSession } from "../../lib/supabase/session";

export const metadata = { title: "Merchant dashboard" };

export default async function MerchantDashboardPage() {
  const context = await getMerchantOperationsContext();
  if (!context.ok || !context.profile) throw new Error(context.guard.reason ?? "Merchant profile unavailable");
  const merchantProfile = context.profile;
  const stubMerchantSession = getDemoMerchantSession();
  return (
    <main className="shell customer-shell">
      <SectionHeader eyebrow="Merchant ops" title="Taukei merchant command center" body="Stubbed merchant operations for onboarding, catalog, and fulfillment under one tenant-scoped local session." />
      <section className="merchant-nav-grid">
        <Card>
          <Badge>Stub session</Badge>
          <h2>{merchantProfile.displayName}</h2>
          <p>{stubMerchantSession.email} · {stubMerchantSession.role}</p>
          <p className="safe-copy">Tenant scope: {stubMerchantSession.tenantScope}. Merchant pages render only seeded data for this merchant id.</p>
          <div className="actions"><ButtonLink href="/merchant/login">View login</ButtonLink></div>
        </Card>
        <Card><h2>Onboarding</h2><p>Profile, kitchen, and logistics defaults.</p><ButtonLink href="/merchant/onboarding" variant="secondary">Open onboarding</ButtonLink></Card>
        <Card><h2>Catalog</h2><p>Menu CRUD basics with seeded items.</p><ButtonLink href="/merchant/catalog" variant="secondary">Manage menu</ButtonLink></Card>
        <Card><h2>Fulfillment</h2><p>Order queue and status actions.</p><ButtonLink href="/merchant/fulfillment" variant="secondary">Open dashboard</ButtonLink></Card>
      </section>
    </main>
  );
}
