/**
 * Protected layout — requires authentication (handled by proxy.ts).
 */

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "2rem 1rem",
      }}
    >
      {/* Top Bar */}
      <header
        style={{
          maxWidth: "720px",
          margin: "0 auto 2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "var(--radius-sm)",
              background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.1rem",
            }}
          >
            🌩️
          </div>
          <span
            style={{
              fontSize: "1.1rem",
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            CloudBridge
          </span>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: "720px", margin: "0 auto" }}>
        {children}
      </main>
    </div>
  );
}
