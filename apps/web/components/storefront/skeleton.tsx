export function StorefrontSkeleton() {
  return (
    <main className="shell" style={{ paddingTop: 40, paddingBottom: 40 }}>
      {/* Merchant header skeleton */}
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            width: 200,
            height: 20,
            borderRadius: 999,
            background: "var(--surface-container, #e9edff)",
            marginBottom: 16,
          }}
        />
        <div
          style={{
            width: "70%",
            maxWidth: 400,
            height: 36,
            borderRadius: 12,
            background: "var(--surface-container, #e9edff)",
            marginBottom: 12,
          }}
        />
        <div
          style={{
            width: "45%",
            maxWidth: 280,
            height: 18,
            borderRadius: 12,
            background: "var(--surface-container, #e9edff)",
          }}
        />
      </div>

      {/* Menu grid skeleton */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 16,
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            style={{
              border: "2px solid var(--outline)",
              borderRadius: 16,
              background: "var(--card, #fff)",
              padding: 16,
            }}
          >
            <div
              style={{
                width: "100%",
                aspectRatio: "4/3",
                borderRadius: 12,
                background: "var(--surface-container, #e9edff)",
                marginBottom: 12,
              }}
            />
            <div
              style={{
                width: "60%",
                height: 18,
                borderRadius: 8,
                background: "var(--surface-container, #e9edff)",
                marginBottom: 8,
              }}
            />
            <div
              style={{
                width: "35%",
                height: 16,
                borderRadius: 8,
                background: "var(--surface-container, #e9edff)",
              }}
            />
          </div>
        ))}
      </div>
    </main>
  );
}
