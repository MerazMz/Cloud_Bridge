"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const [totalSize, setTotalSize] = useState(0);

  // Fetch files to update sidebar storage progress bar
  useEffect(() => {
    if (user) {
      fetch("/api/files")
        .then((res) => res.json())
        .then((json) => {
          if (json.success && Array.isArray(json.data)) {
            const size = json.data.reduce((acc: number, f: any) => acc + Number(f.fileSize), 0);
            setTotalSize(size);
          }
        })
        .catch(() => {});
    }
  }, [user]);

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

  // Format bytes helper
  const formatGB = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return gb.toFixed(1);
  };

  const limitGB = 100;
  const usedGB = Number(formatGB(totalSize));
  const usagePercent = Math.min(Math.round((usedGB / limitGB) * 100), 100);

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="app-sidebar">
        {/* Logo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "2rem" }}>
          <svg width="64" height="64" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M30 68C20 68 15 60 15 51C15 42 22 35 32 35C35 25 45 17 57 17C71 17 82 27 84 40C91 41 96 47 96 54C96 62 90 68 80 68H30Z"
              stroke="url(#logo-grad)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M22 68C35 53 65 53 78 68" stroke="url(#logo-grad)" strokeWidth="3" strokeDasharray="3 3" />
            <line x1="38" y1="48" x2="38" y2="68" stroke="url(#logo-grad)" strokeWidth="3" />
            <line x1="62" y1="48" x2="62" y2="68" stroke="url(#logo-grad)" strokeWidth="3" />
            <line x1="18" y1="68" x2="82" y2="68" stroke="url(#logo-grad)" strokeWidth="5" />
            <path d="M48 38L62 29L55 45L52 38L48 38Z" fill="url(#logo-grad)" />
            <defs>
              <linearGradient id="logo-grad" x1="15" y1="17" x2="96" y2="68" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366F1" />
                <stop offset="1" stopColor="#06B6D4" />
              </linearGradient>
            </defs>
          </svg>
          <span
            style={{
              fontSize: "1.1rem",
              fontWeight: 800,
              letterSpacing: "0.08em",
              background: "linear-gradient(135deg, #4f46e5, #06b6d4)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              marginTop: "0.5rem",
              textTransform: "uppercase",
            }}
          >
            Cloud Bridge
          </span>
        </div>

        {/* Navigation links */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "0.4rem", flex: 1 }}>
          <Link href="/dashboard" className={`nav-link ${pathname === "/dashboard" ? "active" : ""}`}>
            <span style={{ fontSize: "1.1rem" }}>🏠</span>
            <span>Dashboard</span>
          </Link>
          <a href="#" onClick={(e) => e.preventDefault()} className="nav-link">
            <span style={{ fontSize: "1.1rem" }}>📁</span>
            <span>My Files</span>
          </a>
          <a href="#" onClick={(e) => e.preventDefault()} className="nav-link">
            <span style={{ fontSize: "1.1rem" }}>📂</span>
            <span>Folders</span>
          </a>
          <a href="#" onClick={(e) => e.preventDefault()} className="nav-link">
            <span style={{ fontSize: "1.1rem" }}>🕒</span>
            <span>Recent</span>
          </a>
          <a href="#" onClick={(e) => e.preventDefault()} className="nav-link">
            <span style={{ fontSize: "1.1rem" }}>⭐</span>
            <span>Favorites</span>
          </a>
          <a href="#" onClick={(e) => e.preventDefault()} className="nav-link">
            <span style={{ fontSize: "1.1rem" }}>👥</span>
            <span>Shared with me</span>
          </a>
          <a href="#" onClick={(e) => e.preventDefault()} className="nav-link">
            <span style={{ fontSize: "1.1rem" }}>🗑️</span>
            <span>Trash</span>
          </a>
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
            background: "rgba(99, 102, 241, 0.03)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)" }}>
              Storage Usage
            </span>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>
              {usedGB} GB <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>/ {limitGB} GB</span>
            </span>
          </div>

          <div
            style={{
              width: "100%",
              height: "6px",
              background: "var(--border-default)",
              borderRadius: "3px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${usagePercent}%`,
                height: "100%",
                background: "linear-gradient(90deg, #6366f1, #06b6d4)",
                borderRadius: "3px",
              }}
            />
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            {usagePercent}% Used
          </span>

          <button
            className="btn btn-primary"
            style={{
              padding: "0.5rem",
              fontSize: "0.8rem",
              background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              color: "white",
              borderRadius: "var(--radius-sm)",
              fontWeight: 600,
              width: "100%",
              marginTop: "0.25rem",
            }}
            onClick={() => alert("Premium plans coming soon!")}
          >
            ⚡ Upgrade Plan
          </button>
        </div>

        {/* User profile footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            paddingTop: "1rem",
            borderTop: "1px solid var(--border-default)",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #6366f1, #06b6d4)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "0.95rem",
              boxShadow: "0 2px 8px var(--color-primary-glow)",
              textTransform: "uppercase",
            }}
          >
            {user.displayName ? user.displayName.slice(0, 2) : "CB"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "var(--text-primary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user.displayName || "Aditya Kumar"}
            </p>
            <p
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user.username ? `@${user.username}` : "aditya@example.com"}
            </p>
          </div>
          <button
            onClick={logout}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "1.1rem",
              color: "var(--text-muted)",
              padding: "0.25rem",
            }}
            title="Logout"
          >
            ↩
          </button>
        </div>
      </aside>

      {/* Main viewport */}
      <main className="app-main">{children}</main>
    </div>
  );
}
