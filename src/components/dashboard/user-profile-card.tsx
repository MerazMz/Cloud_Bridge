"use client";

import type { UserProfile } from "@/types/auth.types";

/**
 * User profile card for the dashboard.
 */

interface UserProfileCardProps {
  user: UserProfile;
}

export function UserProfileCard({ user }: UserProfileCardProps) {
  const initials = (user.displayName || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className="glass-card animate-slide-up"
      style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
        {/* Avatar */}
        <div
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "white",
            flexShrink: 0,
            boxShadow: "0 4px 20px var(--color-primary-glow)",
          }}
        >
          {user.profilePhotoUrl ? (
            <img
              src={user.profilePhotoUrl}
              alt={user.displayName || "Profile"}
              style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
            />
          ) : (
            initials
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2
            style={{
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: "0.25rem",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {user.displayName || "Telegram User"}
          </h2>
          {user.username && (
            <p style={{ color: "var(--color-primary)", fontSize: "0.9rem", fontWeight: 500 }}>
              @{user.username}
            </p>
          )}
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
            {user.phoneNumber}
          </p>
        </div>
      </div>

      {/* Details Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1rem",
          padding: "1rem",
          background: "rgba(255, 255, 255, 0.02)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <DetailItem label="Telegram ID" value={user.telegramUserId} />
        <DetailItem
          label="Member Since"
          value={new Date(user.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        />
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </p>
      <p style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: 500 }}>
        {value}
      </p>
    </div>
  );
}
