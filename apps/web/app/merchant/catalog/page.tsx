import { Badge, ButtonLink, Card, SectionHeader } from "../../../components/primitives";
import { getMerchantOperationsContext } from "../../../lib/data-access";
import { getDemoMerchantSession } from "../../../lib/supabase/session";
import { upsertCatalogItemAction } from "../actions";

export const metadata = { title: "Merchant catalog" };

export default async function MerchantCatalogPage() {
  const context = await getMerchantOperationsContext();
  if (!context.ok) throw new Error(context.guard.reason);
  const catalogDrafts = context.catalog;
  const stubMerchantSession = getDemoMerchantSession();
  const mutationPreview = await upsertCatalogItemAction({ merchantId: stubMerchantSession.merchantId, itemId: catalogDrafts[0]?.id ?? "beef-krapow", isAvailable: true });
  return (
    <main className="shell customer-shell">
      <SectionHeader eyebrow="Catalog CRUD" title="Menu item basics" body="Create/update/delete affordances are stubbed but show the exact tenant-safe mutation scope for each seeded item." />
      <section className="menu-grid">
        {catalogDrafts.map((item) => (
          <Card key={item.id}>
            <Badge tone={item.isFragile ? "salmon" : "mint"}>{item.category}</Badge>
            <h2>{item.name}</h2>
            <p>{item.sku} · {item.displayPrice} · prep {item.prepBufferMinutes}m</p>
            <p className="small">Tenant-safe mutation includes merchant_id `{stubMerchantSession.merchantId}`.</p>
            <div className="actions"><button className="button secondary" type="button">Edit item</button><button className="button secondary" type="button">Toggle availability</button></div>
          </Card>
        ))}
      </section>
      <p className="safe-copy">Catalog writes must include merchant_id and run under {stubMerchantSession.tenantScope}; cross-tenant catalog updates are rejected. Preview: {mutationPreview.status} · {mutationPreview.message}</p>
      <div className="actions"><ButtonLink href="/mad-krapow-demo" variant="secondary">Preview storefront</ButtonLink></div>
    </main>
  );
}
