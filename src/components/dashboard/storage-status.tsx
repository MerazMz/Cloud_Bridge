"use client";

import type { UserProfile } from "@/types/auth.types";

/**
 * Storage channel status card for the dashboard.
 */

interface StorageStatusProps {
  user: UserProfile;
}

export function StorageStatus({ user }: StorageStatusProps) {
  const isActive = user.storageChannelStatus === "active";

  return (
    <div
      className="glass-card animate-slide-up"
      style={{
        padding: "2rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
        animationDelay: "0.1s",
        opacity: 0,
        animationFillMode: "forwards",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h3
          style={{
            fontSize: "1rem",
            fontWeight: 600,
            color: "var(--text-primary)",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          Cloud Storage
        </h3>
        <span className={`status-badge ${isActive ? "status-active" : "status-pending"}`}>
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: isActive ? "var(--color-success)" : "var(--color-warning)",
              display: "inline-block",
            }}
          />
          {isActive ? "Active" : "Setting up..."}
        </span>
      </div>

      {isActive ? (
        <div
          style={{
            padding: "1.25rem",
            background: "rgba(16, 185, 129, 0.05)",
            borderRadius: "var(--radius-md)",
            border: "1px solid rgba(16, 185, 129, 0.15)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "var(--radius-sm)",
                background: "rgba(16, 185, 129, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.25rem",
              }}
            >
              📁
            </div>
            <div>
              <p style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.95rem" }}>
                Drive_{user.telegramUserId}
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                Private Telegram Channel
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "0.75rem",
              background: "rgba(255, 255, 255, 0.02)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Channel ID</span>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontFamily: "monospace" }}>
              {user.storageChannelId}
            </span>
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: "1.25rem",
            background: "rgba(245, 158, 11, 0.05)",
            borderRadius: "var(--radius-md)",
            border: "1px solid rgba(245, 158, 11, 0.15)",
            textAlign: "center",
          }}
        >
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Your private storage channel is being set up.
            <br />
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              This usually takes a few seconds. Refresh to check status.
            </span>
          </p>
        </div>
      )}

      <div
        style={{
          padding: "1rem",
          background: "rgba(99, 102, 241, 0.05)",
          borderRadius: "var(--radius-md)",
          border: "1px solid rgba(99, 102, 241, 0.1)",
        }}
      >
        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
          💡 Files uploaded from CloudBridge appear in your private Telegram channel.
          Only you can see them.
        </p>
      </div>
    </div>
  );
}
