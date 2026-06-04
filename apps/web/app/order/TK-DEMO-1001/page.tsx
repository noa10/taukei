import { Badge, ButtonLink, Card, SectionHeader } from "../../../components/primitives";
import { getOrderTrackingByPublicRef } from "../../../lib/data-access";
import { getCustomerTrackingRecords } from "../../../lib/customer-orders";

const stages = [
  { label: "Confirmed", body: "Fake Stripe session marked stubbed; no real charge." },
  { label: "Cooking", body: "Kitchen is preparing the seeded demo order." },
  { label: "Scheduled", body: "Fake Lalamove job queued; no rider booked." },
  { label: "Tracking", body: "Live map integration is deferred to production hardening." }
];

export const metadata = {
  title: "Order TK-DEMO-1001 tracking",
  description: "Taukei demo confirmation and tracking skeleton."
};

export default async function OrderTrackingPage() {
  const { merchant: demoMerchant, order, evidence } = await getOrderTrackingByPublicRef("TK-DEMO-1001");
  const records = await getCustomerTrackingRecords("TK-DEMO-1001");
  const trackingEvents = records?.trackingEvents ?? stages.map((stage) => ({ label: stage.label, status: stage.label.toLowerCase(), source: "fulfillment" as const, payload: {} }));
  return (
    <main className="shell customer-shell">
      <SectionHeader eyebrow="Order confirmed" title="TK-DEMO-1001" body={`Thanks for ordering from ${demoMerchant.name}. This is a safe tracking skeleton with fake payment and delivery records.`} />
      <section className="tracking-grid">
        {trackingEvents.map((event, index) => (
          <Card key={event.label}>
            <Badge tone={index < 3 ? "mint" : "white"}>{index + 1}</Badge>
            <h2>{event.label}</h2>
            <p>{stages[index]?.body ?? event.status}</p>
            <p className="small">Source: {event.source} · Status: {event.status}</p>
          </Card>
        ))}
      </section>
      <section className="safety">
        <h2>No-live-side-effect verification</h2>
        <p>Payment provider: {records?.paymentSession.provider ?? order?.paymentMode ?? "fake_stripe"}. Delivery provider: {records?.deliveryJob.provider ?? order?.deliveryMode ?? "fake_lalamove"}. Data boundary: {evidence.source}; record source: {records?.source ?? "stubbed-demo"}. This customer path does not move money or book riders.</p>
      </section>
      <div className="actions"><ButtonLink href="/mad-krapow-demo" variant="secondary">Back to storefront</ButtonLink></div>
    </main>
  );
}
