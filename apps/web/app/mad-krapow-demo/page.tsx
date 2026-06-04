import { Badge, ButtonLink, Card, SectionHeader } from "../../components/primitives";
import { demoMerchant as metadataMerchant, money } from "../../lib/demo-data";
import { getPublicStorefrontBySlug } from "../../lib/data-access";

export const metadata = {
  title: `${metadataMerchant.name} storefront`,
  description: "Taukei demo customer storefront with menu, cart preview, and safe stub checkout."
};

export default async function StorefrontPage() {
  const { merchant, catalog, evidence } = await getPublicStorefrontBySlug("mad-krapow-demo");
  if (!merchant) throw new Error("Demo storefront not found");
  const demoMerchant = merchant;
  const demoCatalog = catalog;
  const cartPreview = [demoCatalog[0], demoCatalog[2]].filter(Boolean);
  const subtotal = cartPreview.reduce((sum, item) => sum + item.priceCents, 0);

  return (
    <main className="shell customer-shell">
      <section className="store-hero">
        <div>
          <Badge>Open now · {demoMerchant.city}</Badge>
          <h1>{demoMerchant.name}</h1>
          <p className="lede">{demoMerchant.tagline}</p>
          <p className="safe-copy">{demoMerchant.notice}</p>
          <p className="small">Data boundary: {evidence.source} · {evidence.boundary}</p>
          <div className="actions">
            <ButtonLink href="/mad-krapow-demo/checkout">Checkout demo cart</ButtonLink>
            <ButtonLink href="/order/TK-DEMO-1001" variant="secondary">Track demo order</ButtonLink>
          </div>
        </div>
        <Card className="cart-card">
          <h2>Cart preview</h2>
          {cartPreview.map((item) => (
            <div className="cart-row" key={item.id}>
              <span>{item.name}</span>
              <strong>{money(item.priceCents)}</strong>
            </div>
          ))}
          <div className="cart-total"><span>Trusted subtotal</span><strong>{money(subtotal)}</strong></div>
          <p className="small">Prices are rendered from seeded catalog snapshots, not client-entered totals.</p>
        </Card>
      </section>

      <SectionHeader eyebrow="Menu" title="High-energy bowls and drinks" body="Mobile-first cards use Taukei tokens, crisp outlines, rounded containers, and high-contrast action states." />
      <section className="menu-grid" aria-label="Demo menu">
        {demoCatalog.map((item) => (
          <Card key={item.id}>
            <div className="menu-card-top">
              <Badge tone={item.isFragile ? "salmon" : "mint"}>{item.isFragile ? "Fragile · car" : "Motorcycle ok"}</Badge>
              <strong>{money(item.priceCents)}</strong>
            </div>
            <h3>{item.name}</h3>
            <p>{item.isFragile ? "Flagged fragile so fake Lalamove routing selects a car." : "Standard packed food; fake routing can use motorcycle."}</p>
            <button className="button primary" type="button">Add to cart</button>
          </Card>
        ))}
      </section>
    </main>
  );
}
