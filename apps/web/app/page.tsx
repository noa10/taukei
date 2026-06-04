import { describeIntegrationSafety, loadTaukeiEnv } from "@taukei/env";
import { ButtonLink } from "../components/primitives";

const foundationCards = [
  "Next.js App Router web/PWA shell",
  "Multi-merchant Supabase-ready repository layout",
  "Stripe and Lalamove live modes fail closed",
  "Customer storefront path with stubbed checkout"
];

export default function Home() {
  const env = loadTaukeiEnv();
  const safety = describeIntegrationSafety(env);

  return (
    <main className="shell">
      <section className="hero-card" aria-labelledby="hero-title">
        <p className="eyebrow">Taukei platform foundation</p>
        <h1 id="hero-title">Merchant-owned ordering links for Malaysian food operators.</h1>
        <p className="lede">
          Taukei starts as a safe web/PWA foundation: public storefronts, merchant operations, Supabase schema work,
          and sandbox-only payment plus delivery seams before any production integration phase.
        </p>
        <div className="actions" aria-label="Foundation status actions">
          <ButtonLink href="/mad-krapow-demo">Open demo storefront</ButtonLink>
          <ButtonLink href="/mad-krapow-demo/checkout" variant="secondary">Try stub checkout</ButtonLink>
          <ButtonLink href="/manifest.webmanifest" variant="secondary">View PWA manifest</ButtonLink>
        </div>
      </section>

      <section className="grid" aria-label="Foundation capabilities">
        {foundationCards.map((card) => (
          <article className="capability" key={card}>
            <span aria-hidden="true">✦</span>
            <p>{card}</p>
          </article>
        ))}
      </section>

      <section className="safety" aria-label="Integration safety status">
        <h2>Integration safety</h2>
        <p>{safety}</p>
        <p className="small">Live Stripe payment movement and live Lalamove rider booking are deferred and guarded by environment validation.</p>
      </section>
    </main>
  );
}
