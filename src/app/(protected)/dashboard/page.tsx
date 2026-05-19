"use client";

import type { Metadata } from "next";
import { useAuth } from "@/hooks/use-auth";
import { UserProfileCard } from "@/components/dashboard/user-profile-card";
import { StorageStatus } from "@/components/dashboard/storage-status";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/components/ui/toast";

/**
 * Dashboard page — shows user profile and storage status.
 */

export default function DashboardPage() {
  const { user, loading, error, logout } = useAuth();
  const { showToast } = useToast();

  const handleLogout = async () => {
    showToast("info", "Logging out...");
    await logout();
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
        }}
      >
        <LoadingSpinner size="lg" label="Loading your dashboard..." />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div
        className="glass-card"
        style={{
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <p style={{ color: "var(--color-error)", marginBottom: "1rem" }}>
          {error || "Failed to load user data."}
        </p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Page Title */}
      <div className="animate-fade-in">
        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: 800,
            color: "var(--text-primary)",
            marginBottom: "0.25rem",
          }}
        >
          Dashboard
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
          Welcome back, {user.displayName || "there"}!
        </p>
      </div>

      {/* Profile Card */}
      <UserProfileCard user={user} />

      {/* Storage Status */}
      <StorageStatus user={user} />

      {/* Quick Actions */}
      <div
        className="glass-card animate-slide-up"
        style={{
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          animationDelay: "0.2s",
          opacity: 0,
          animationFillMode: "forwards",
        }}
      >
        <h3
          style={{
            fontSize: "1rem",
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          Quick Actions
        </h3>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            className="btn btn-secondary"
            style={{ flex: 1, minWidth: "140px" }}
            onClick={() => showToast("info", "File upload coming in Phase 2!")}
          >
            📤 Upload Files
          </button>
          <button
            className="btn btn-danger"
            style={{ flex: 1, minWidth: "140px" }}
            onClick={handleLogout}
          >
            ↪ Logout
          </button>
        </div>
      </div>

      {/* Phase 2 Preview */}
      <div
        className="animate-slide-up"
        style={{
          padding: "1.5rem",
          borderRadius: "var(--radius-xl)",
          border: "1px dashed var(--border-default)",
          textAlign: "center",
          animationDelay: "0.3s",
          opacity: 0,
          animationFillMode: "forwards",
        }}
      >
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          🚀 File management, uploads, and browsing coming in Phase 2
        </p>
      </div>
    </div>
  );
}
