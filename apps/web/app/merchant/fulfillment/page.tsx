import { Badge, ButtonLink, Card, SectionHeader } from "../../../components/primitives";
import { getMerchantOperationsContext } from "../../../lib/data-access";
import { updateFulfillmentStatusAction } from "../actions";

export const metadata = { title: "Merchant fulfillment" };

export default async function MerchantFulfillmentPage() {
  const context = await getMerchantOperationsContext();
  if (!context.ok) throw new Error(context.guard.reason);
  const fulfillmentOrders = context.fulfillment;
  const mutationPreview = await updateFulfillmentStatusAction({ merchantId: context.guard.tenantScope.replace("merchant:", ""), publicRef: "TK-DEMO-1002", nextStatus: "accepted" });
  return (
    <main className="shell customer-shell">
      <SectionHeader eyebrow="Fulfillment" title="Kitchen order queue" body="Seeded order status basics for merchant operations. Payment and delivery providers remain fake." />
      <section className="checkout-layout">
        {fulfillmentOrders.map((order) => (
          <Card key={order.publicRef}>
            <Badge tone={order.status === "new" ? "salmon" : "mint"}>{order.status}</Badge>
            <h2>{order.publicRef}</h2>
            <p>{order.customer} · {order.total}</p>
            <div className="cart-row"><span>Payment</span><strong>{order.paymentMode}</strong></div>
            <div className="cart-row"><span>Delivery</span><strong>{order.deliveryMode}</strong></div>
            <p className="small">Tenant scope: {order.tenantScope}</p>
            <button className="button primary" type="button">{order.nextAction}</button>
          </Card>
        ))}
      </section>
      <section className="safety"><h2>Tenant-safety check</h2><p>Only orders scoped to the stub merchant are rendered; illegal status transitions are rejected before persistence. Preview: {mutationPreview.status} · {mutationPreview.message}</p></section>
      <div className="actions"><ButtonLink href="/order/TK-DEMO-1001" variant="secondary">View customer tracking</ButtonLink></div>
    </main>
  );
}
