/**
 * Auth layout — centered card layout for login flows.
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
      }}
    >
      {/* Logo */}
      <div
        className="animate-fade-in"
        style={{
          marginBottom: "2rem",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.75rem",
            marginBottom: "0.5rem",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "var(--radius-md)",
              background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
              boxShadow: "0 4px 20px var(--color-primary-glow)",
            }}
          >
            🌩️
          </div>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 800,
              background: "linear-gradient(135deg, var(--text-primary), var(--color-primary-hover))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            CloudBridge
          </h1>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
          Secure cloud storage powered by Telegram
        </p>
      </div>

      {/* Card */}
      <div
        className="glass-card"
        style={{
          width: "100%",
          maxWidth: "440px",
          padding: "2rem",
        }}
      >
        {children}
      </div>

      {/* Footer */}
      <p
        style={{
          marginTop: "2rem",
          fontSize: "0.8rem",
          color: "var(--text-muted)",
        }}
      >
        Your files, your privacy, your Telegram.
      </p>
    </div>
  );
}
