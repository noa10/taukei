import Link from "next/link";

export default function StorefrontNotFound() {
  return (
    <main className="shell" style={{ paddingTop: 80, paddingBottom: 80, textAlign: "center" }}>
      <div
        className="hero-card"
        style={{ padding: 48, display: "inline-block", maxWidth: 480 }}
      >
        <span style={{ fontSize: "3rem" }} aria-hidden="true">🔍</span>
        <h1
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "1.6rem",
            fontWeight: 700,
            margin: "16px 0 8px",
          }}
        >
          Storefront not found
        </h1>
        <p style={{ color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>
          We couldn&apos;t find a merchant at this address. They may have moved or the link may be incorrect.
        </p>
        <div style={{ marginTop: 24 }}>
          <Link href="/" className="button primary">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
