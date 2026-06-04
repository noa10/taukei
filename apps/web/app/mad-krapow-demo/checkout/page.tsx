import { Badge, ButtonLink, Card, SectionHeader } from "../../../components/primitives";
import { demoMerchant, money } from "../../../lib/demo-data";
import { createDemoCheckoutAction } from "./actions";

export const metadata = {
  title: "Stub checkout",
  description: "Taukei demo checkout with fake Stripe and fake Lalamove orchestration."
};

export default async function CheckoutPage() {
  const checkout = await createDemoCheckoutAction();
  if (!checkout.draft) {
    throw new Error(checkout.message);
  }
  const { draft, records } = checkout;
  if (!records) throw new Error("Checkout records unavailable");

  return (
    <main className="shell customer-shell">
      <SectionHeader eyebrow="Checkout" title="Stubbed order creation" body="This page exercises the domain checkout flow while keeping all payment and delivery side effects fake." />
      <section className="checkout-layout">
        <Card>
          <h2>Delivery details</h2>
          <label className="field-label">Customer</label>
          <div className="field-box">{draft.customer.name} · {draft.customer.phone}</div>
          <label className="field-label">Drop-off</label>
          <div className="field-box">{draft.deliveryAddress.line1}, {draft.deliveryAddress.city}</div>
          <p className="safe-copy">No live Lalamove booking. Fake quote `{draft.deliveryQuote.id}` uses {draft.deliveryQuote.vehicleType} because the cart includes a fragile drink.</p>
        </Card>

        <Card>
          <h2>Order summary</h2>
          {draft.lines.map((line) => (
            <div className="cart-row" key={line.menuItemId}>
              <span>{line.quantity}× {line.nameSnapshot}</span>
              <strong>{money(line.lineTotalCents)}</strong>
            </div>
          ))}
          <div className="cart-row"><span>Delivery</span><strong>{money(draft.totals.deliveryFeeCents)}</strong></div>
          <div className="cart-row"><span>Taukei platform fee</span><strong>{money(draft.totals.platformFeeCents)}</strong></div>
          <div className="cart-total"><span>Total</span><strong>{money(draft.totals.totalCents)}</strong></div>
          <Badge tone="salmon">{draft.paymentSession.provider} · {draft.paymentSession.status}</Badge>
          <p className="safe-copy">No live Stripe payment. Stub session `{records.paymentSession.provider_session_id}` records `noLivePayment=true`.</p>
          <p className="small">Supabase-shaped order `{records.order.public_ref}` has {records.orderItems.length} order_items, payment_session, and delivery_job records ({records.source}).</p>
          <div className="actions"><ButtonLink href="/order/TK-DEMO-1001">Create stub order</ButtonLink></div>
        </Card>
      </section>
      <p className="small">Demo merchant: {demoMerchant.storeName}. Boundary: {checkout.boundary}. Dispatch skeleton: {draft.deliveryJob.scheduledDispatchAt}. Tracking events: {records.trackingEvents.map((event) => event.source).join(" → ")}.</p>
    </main>
  );
}
