/**
 * Auth layout — Centered, premium container providing the warm cream gradient
 * background for the authentication flow.
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
        width: "100%",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(135deg, #FFFDF9 0%, #FFF8EA 100%)",
        color: "#0F172A",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      {children}
    </div>
  );
}
