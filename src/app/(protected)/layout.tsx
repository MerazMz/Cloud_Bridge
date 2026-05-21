"use client";

import { useEffect, useState, Suspense } from "react";
import { useAuth } from "@/hooks/use-auth";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function LayoutWithSidebarContent({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "dashboard";
  const [totalSize, setTotalSize] = useState(0);

  // States for dual logout confirmation and 10 second countdown timer
  const [logoutStep, setLogoutStep] = useState<"none" | "confirm" | "countdown">("none");
  const [logoutCountdown, setLogoutCountdown] = useState(10);

  // Effect to handle countdown tick and logout execution
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (logoutStep === "countdown") {
      setLogoutCountdown(10);
      interval = setInterval(() => {
        setLogoutCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            logout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [logoutStep, logout]);

  // Fetch files to update sidebar storage progress bar
  useEffect(() => {
    if (user) {
      fetch("/api/files")
        .then((res) => res.json())
        .then((json) => {
          if (json.success && Array.isArray(json.data)) {
            const size = json.data
              .filter((f: any) => !f.isDeleted)
              .reduce((acc: number, f: any) => acc + Number(f.fileSize), 0);
            setTotalSize(size);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  if (!user) return null;

  // Format bytes helper
  const formatGB = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return gb.toFixed(1);
  };

  const limitGB = 100;
  const usedGB = Number(formatGB(totalSize));
  const usagePercent = Math.min(Math.round((usedGB / limitGB) * 100), 100);

  const userName = user.displayName || user.username || user.phoneNumber || "User";
  const userInitials = userName.slice(0, 2).toUpperCase();

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="app-sidebar">
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", paddingLeft: "0.5rem", marginBottom: "2.5rem" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 15V9M12 9L9 12M12 9L15 12" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontSize: "1.45rem", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text-primary)", display: "flex", alignItems: "center" }}>
            Cloud<span style={{ color: "#F59E0B" }}>Bridge</span>
          </span>
        </div>

        {/* Navigation links */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "0.35rem", flex: 1 }}>
          <Link href="/dashboard?tab=dashboard" className={`nav-link ${tab === "dashboard" ? "active" : ""}`}>
            <svg style={{ width: "1.15rem", height: "1.15rem", flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
            </svg>
            <span>Dashboard</span>
          </Link>
          <Link href="/dashboard?tab=my-files" className={`nav-link ${tab === "my-files" ? "active" : ""}`}>
            <svg style={{ width: "1.15rem", height: "1.15rem", flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            <span>My Files</span>
          </Link>
          <Link href="/dashboard?tab=uploads" className={`nav-link ${tab === "uploads" ? "active" : ""}`}>
            <svg style={{ width: "1.15rem", height: "1.15rem", flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V15"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span>Uploads</span>
          </Link>
          <Link href="/dashboard?tab=folders" className={`nav-link ${tab === "folders" ? "active" : ""}`}>
            <svg style={{ width: "1.15rem", height: "1.15rem", flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="9" rx="1"/>
              <rect x="14" y="3" width="7" height="5" rx="1"/>
              <rect x="14" y="12" width="7" height="9" rx="1"/>
              <rect x="3" y="16" width="7" height="5" rx="1"/>
            </svg>
            <span>Organiser</span>
          </Link>
          <Link href="/dashboard?tab=favorites" className={`nav-link ${tab === "favorites" ? "active" : ""}`}>
            <svg style={{ width: "1.15rem", height: "1.15rem", flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <span>Favorites</span>
          </Link>
          <Link href="/dashboard?tab=shared" className={`nav-link ${tab === "shared" ? "active" : ""}`}>
            <svg style={{ width: "1.15rem", height: "1.15rem", flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span>Shared with me</span>
          </Link>
          <Link href="/dashboard?tab=trash" className={`nav-link ${tab === "trash" ? "active" : ""}`}>
            <svg style={{ width: "1.15rem", height: "1.15rem", flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
            </svg>
            <span>Trash</span>
          </Link>
          <Link href="/dashboard?tab=settings" className={`nav-link ${tab === "settings" ? "active" : ""}`}>
            <svg style={{ width: "1.15rem", height: "1.15rem", flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <span>Settings</span>
          </Link>
        </nav>

        {/* Storage Usage Card */}
        <div
          className="glass-card"
          style={{
            padding: "1.25rem",
            marginBottom: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            borderRadius: "16px",
            border: "1px solid var(--border-default)",
            background: "transparent",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "-0.01em" }}>
              Storage Used
            </span>
            <span style={{ fontSize: "1.05rem", color: "var(--text-primary)", fontWeight: 700, letterSpacing: "-0.02em" }}>
              {usedGB} GB <span style={{ fontWeight: 500, color: "var(--text-muted)" }}>/ {limitGB} GB</span>
            </span>
          </div>

          <div
            style={{
              width: "100%",
              height: "6px",
              background: "var(--bg-secondary)",
              borderRadius: "9999px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${usagePercent}%`,
                height: "100%",
                background: "#F59E0B",
                borderRadius: "9999px",
              }}
            />
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>
            {usagePercent}% used
          </span>

          <button
            className="btn"
            style={{
              padding: "0.55rem",
              fontSize: "0.85rem",
              background: "#F59E0B",
              color: "#ffffff",
              borderRadius: "8px",
              fontWeight: 700,
              width: "100%",
              marginTop: "0.25rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              boxShadow: "0 2px 6px rgba(245, 158, 11, 0.2)",
            }}
            onClick={() => alert("Premium plans coming soon!")}
          >
            <svg style={{ width: "0.95rem", height: "0.95rem" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/>
            </svg>
            Upgrade Plan
          </button>
        </div>

        {/* User profile footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            paddingTop: "1rem",
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "#F59E0B",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "1rem",
              textTransform: "uppercase",
            }}
          >
            {userInitials[0] || "U"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: "0.9rem",
                fontWeight: 700,
                color: "var(--text-primary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                letterSpacing: "-0.015em",
              }}
            >
              {userName}
            </p>
            <p
              style={{
                fontSize: "0.78rem",
                color: "var(--text-muted)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                letterSpacing: "-0.01em",
              }}
            >
              {user.username ? `${user.username}` : "chapri@example.com"}
            </p>
          </div>
          <button
            onClick={() => setLogoutStep("confirm")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "0.25rem",
              display: "flex",
              alignItems: "center",
              color: "var(--text-muted)",
              transition: "color 0.15s ease",
            }}
            title="Logout"
            className="dropdown-item-hover"
          >
            <svg style={{ width: "1.15rem", height: "1.15rem" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Main viewport */}
      <main className="app-main">{children}</main>

      {/* Logout Dual Confirmation Modal Overlay */}
      {logoutStep !== "none" && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.4)",
            backdropFilter: "blur(8px)",
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            animation: "fadeIn 0.2s ease-out",
          }}
        >
          <div
            className="glass-card"
            style={{
              width: "380px",
              background: "var(--bg-card)",
              border: "1px solid var(--border-default)",
              borderRadius: "14px",
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
              boxShadow: "var(--glass-shadow)",
              textAlign: "center",
              fontFamily: "Outfit, sans-serif",
            }}
          >
            {/* Warning / Timer Header Icon */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  background: logoutStep === "confirm" ? "rgba(239, 68, 68, 0.1)" : "rgba(245, 158, 11, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: logoutStep === "confirm" ? "#EF4444" : "#F59E0B",
                }}
              >
                {logoutStep === "confirm" ? (
                  <svg style={{ width: "1.5rem", height: "1.5rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                ) : (
                  <svg style={{ width: "1.5rem", height: "1.5rem" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                )}
              </div>
            </div>

            {logoutStep === "confirm" ? (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em", margin: 0 }}>
                    Are you sure you want to logout?
                  </h3>
                  <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: 500, margin: 0, lineHeight: "1.4" }}>
                    You will need to re-authenticate with your credentials to access your secure CloudBridge vault.
                  </p>
                </div>

                <div style={{ display: "flex", gap: "0.75rem", width: "100%" }}>
                  <button
                    onClick={() => setLogoutStep("none")}
                    style={{
                      flex: 1,
                      padding: "0.65rem",
                      borderRadius: "8px",
                      border: "1px solid var(--border-default)",
                      background: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setLogoutStep("countdown")}
                    style={{
                      flex: 1,
                      padding: "0.65rem",
                      borderRadius: "8px",
                      background: "#EF4444",
                      color: "#ffffff",
                      border: "none",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      boxShadow: "0 2px 6px rgba(239, 68, 68, 0.2)",
                    }}
                  >
                    Yes, Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em", margin: 0 }}>
                    Logging you out...
                  </h3>
                  <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: 500, margin: 0 }}>
                    Securely closing your active session in
                  </p>
                  <div
                    style={{
                      fontSize: "3.5rem",
                      fontWeight: 900,
                      color: "#F59E0B",
                      lineHeight: 1,
                      margin: "0.5rem 0",
                      letterSpacing: "-0.04em",
                    }}
                  >
                    {logoutCountdown}
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500, margin: 0 }}>
                    seconds
                  </p>
                </div>

                <button
                  onClick={() => setLogoutStep("none")}
                  style={{
                    width: "100%",
                    padding: "0.65rem",
                    borderRadius: "8px",
                    border: "1px solid var(--border-default)",
                    background: "var(--bg-secondary)",
                    color: "var(--text-primary)",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                  }}
                >
                  Click to Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "var(--bg-primary)",
        }}
      >
        <LoadingSpinner size="lg" label="Loading CloudBridge..." />
      </div>
    );
  }

  if (!user) {
    return null; // Let middleware / proxy redirect to login
  }

  return (
    <Suspense
      fallback={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            background: "var(--bg-primary)",
          }}
        >
          <LoadingSpinner size="lg" label="Loading view..." />
        </div>
      }
    >
      <LayoutWithSidebarContent>{children}</LayoutWithSidebarContent>
    </Suspense>
  );
}
