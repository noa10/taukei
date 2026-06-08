import { getServerSupabaseUser } from "../lib/supabase/server";
import { Badge, SectionHeader, Card } from "../components/primitives";

const features = [
  {
    icon: "🏪",
    title: "Your own storefront",
    body: "A clean, fast ordering page under your brand. No marketplace middleman taking a cut of every order."
  },
  {
    icon: "📊",
    title: "Own your customer data",
    body: "Every order, every customer, every preference — yours. Build loyalty without platform gatekeepers."
  },
  {
    icon: "💰",
    title: "Keep your margins",
    body: "Zero marketplace fees. You set your prices, you keep your revenue. We provide the rails."
  },
  {
    icon: "⚡",
    title: "Simple setup",
    body: "Get your storefront live in minutes. Add your menu, set your hours, start taking orders."
  }
];

const howItWorks = [
  { step: "1", title: "Sign up", body: "Create your merchant account in under two minutes." },
  { step: "2", title: "Add your menu", body: "Upload your items, set prices, configure prep times." },
  { step: "3", title: "Go live", body: "Share your storefront link. Orders come straight to you." }
];

export default async function Home() {
  const { user } = await getServerSupabaseUser();
  const isLoggedIn = !!user;
  const ctaHref = isLoggedIn ? "/merchant" : "/signup";

  return (
    <main className="shell">
      {/* Hero */}
      <section className="hero-card" aria-labelledby="hero-title">
        <Badge tone="mint">For Malaysian food operators</Badge>
        <h1 id="hero-title">Own your ordering.<br />No marketplace fees.</h1>
        <p className="lede">
          Taukei gives independent hawkers, cafés, and restaurants their own direct storefronts.
          Your customers order from you — not through a third-party app that takes a cut and owns your data.
        </p>
        <div className="actions" aria-label="Get started actions">
          <a className="button primary" href={ctaHref}>
            {isLoggedIn ? "Get started" : "Get started"}
          </a>
          <a className="button secondary" href="#how-it-works">
            See how it works
          </a>
        </div>
      </section>

      {/* Features */}
      <SectionHeader
        eyebrow="Why Taukei"
        title="Built for merchants, not marketplaces"
        body="Every feature exists to put you in control of your ordering business."
      />
      <section className="grid" aria-label="Feature cards">
        {features.map((f) => (
          <Card className="capability" key={f.title}>
            <span aria-hidden="true" style={{ fontSize: "1.6rem" }}>{f.icon}</span>
            <p>{f.title}</p>
            <p className="small" style={{ marginTop: 8 }}>{f.body}</p>
          </Card>
        ))}
      </section>

      {/* How it works */}
      <section id="how-it-works">
        <SectionHeader
          eyebrow="How it works"
          title="Three steps to your storefront"
        />
        <div className="grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }} aria-label="Steps">
          {howItWorks.map((s) => (
            <Card key={s.step}>
              <Badge tone="salmon">Step {s.step}</Badge>
              <h3 style={{ margin: "12px 0 6px" }}>{s.title}</h3>
              <p>{s.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="safety" aria-labelledby="cta-title" style={{ textAlign: "center", marginTop: 40 }}>
        <h2 id="cta-title" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)" }}>Ready to take back your orders?</h2>
        <p style={{ maxWidth: 560, margin: "12px auto 0", color: "var(--muted)" }}>
          Join Malaysian food operators who are moving off marketplace apps and onto their own storefronts.
        </p>
        <div className="actions" style={{ justifyContent: "center", marginTop: 24 }}>
          <a className="button primary" href={ctaHref}>
            {isLoggedIn ? "Go to dashboard" : "Sign up as a merchant"}
          </a>
        </div>
      </section>
    </main>
  );
}
