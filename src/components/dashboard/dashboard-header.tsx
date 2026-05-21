"use client";

import { useState, useEffect, useRef } from "react";
import { NotificationItem } from "@/app/(protected)/dashboard/page";

interface DashboardHeaderProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  toggleDarkMode: () => void;
  userName: string;
  onSearchClick: () => void;
  notifications: NotificationItem[];
  setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
  darkMode?: boolean;
}

export function DashboardHeader({
  searchTerm,
  setSearchTerm,
  toggleDarkMode,
  userName,
  onSearchClick,
  notifications,
  setNotifications,
  darkMode,
}: DashboardHeaderProps) {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close notifications panel on outside clicks
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleBellClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsNotificationOpen(!isNotificationOpen);
    // Mark all as read when opening
    if (!isNotificationOpen) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  const handleDismissNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications([]);
    setIsNotificationOpen(false);
  };

  const formatTimeAgo = (date: Date) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1.25rem", width: "100%" }}>
      {/* Search Bar */}
      <div
        style={{ position: "relative", width: "360px" }}
      >
        <span style={{ position: "absolute", left: "0.8rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.9rem", color: "var(--text-muted)", display: "flex", alignItems: "center" }}>
          <svg style={{ width: "1rem", height: "1rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </span>
        <input
          type="text"
          placeholder="Search files and folders..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field"
          style={{
            paddingLeft: "2.2rem",
            paddingRight: "2.8rem",
            borderRadius: "18px",
            height: "38px",
            border: "1px solid var(--border-default)",
            background: "var(--bg-card)",
            fontSize: "0.85rem",
            letterSpacing: "-0.01em",
          }}
        />
        <span
          onClick={(e) => {
            e.stopPropagation();
            onSearchClick();
          }}
          style={{ position: "absolute", right: "0.8rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", background: "var(--bg-secondary)", border: "1px solid var(--border-default)", borderRadius: "5px", padding: "0.1rem 0.3rem", letterSpacing: "-0.02em", cursor: "pointer" }}>
          ⌘ K
        </span>
      </div>

      {/* Action Widgets */}
      <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
        {/* Light/Dark Toggle */}
        <button
          onClick={toggleDarkMode}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg style={{ width: "1.2rem", height: "1.2rem", color: "#F59E0B" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4"/>
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
          </svg>
        </button>

        {/* Notifications Bell & Dropdown */}
        <div ref={dropdownRef} style={{ position: "relative", display: "flex", alignItems: "center" }}>
          {/* Bell Icon Trigger */}
          <button
            onClick={handleBellClick}
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              background: "none",
              border: "none",
              padding: "0.25rem",
              borderRadius: "50%",
              transition: "background 0.2s ease",
            }}
            title="Notifications"
            className="dropdown-item-hover"
          >
            <svg style={{ width: "1.2rem", height: "1.2rem", color: isNotificationOpen ? "var(--text-primary)" : "#64748B" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "1px",
                  right: "1px",
                  background: "#EF4444",
                  color: "white",
                  borderRadius: "50%",
                  width: "14px",
                  height: "14px",
                  fontSize: "0.58rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  boxShadow: "0 0 0 2px var(--bg-primary)",
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Translucent Glassmorphic Dropdown Panel */}
          {isNotificationOpen && (
            <div
              className="glass-card"
              style={{
                position: "absolute",
                top: "135%",
                right: 0,
                width: "320px",
                background: darkMode ? "rgba(15, 23, 42, 0.88)" : "rgba(248, 250, 252, 0.88)",
                backdropFilter: "blur(20px)",
                border: darkMode ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.06)",
                borderRadius: "12px",
                boxShadow: darkMode ? "0 10px 30px rgba(0,0,0,0.5)" : "0 10px 30px rgba(15,23,42,0.08)",
                zIndex: 9999,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                fontFamily: "Outfit, sans-serif",
                animation: "slideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              {/* Dropdown Header */}
              <div
                style={{
                  padding: "0.85rem 1rem",
                  borderBottom: darkMode ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.06)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "var(--text-primary)" }}>
                  Notifications
                </span>
                {notifications.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#F59E0B",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Notification List Panel */}
              <div
                style={{
                  maxHeight: "260px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {notifications.length === 0 ? (
                  <div
                    style={{
                      padding: "2rem 1rem",
                      textAlign: "center",
                      color: "var(--text-muted)",
                      fontSize: "0.78rem",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <span style={{ fontSize: "1.5rem" }}>🔔</span>
                    <span>No notifications yet.</span>
                  </div>
                ) : (
                  notifications.map((n) => {
                    // Match icons & color styling by type
                    let iconColor = "#10B981";
                    let iconSvg = (
                      <svg style={{ width: "0.95rem", height: "0.95rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    );

                    if (n.type === "cancel") {
                      iconColor = "#F59E0B";
                      iconSvg = (
                        <svg style={{ width: "0.95rem", height: "0.95rem" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"/>
                          <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      );
                    } else if (n.type === "error") {
                      iconColor = "#EF4444";
                      iconSvg = (
                        <svg style={{ width: "0.95rem", height: "0.95rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      );
                    }

                    return (
                      <div
                        key={n.id}
                        style={{
                          padding: "0.75rem 1rem",
                          borderBottom: darkMode ? "1px solid rgba(255, 255, 255, 0.05)" : "1px solid rgba(0, 0, 0, 0.04)",
                          display: "flex",
                          gap: "0.75rem",
                          alignItems: "flex-start",
                          transition: "background 0.15s ease",
                          position: "relative",
                        }}
                        className="dropdown-item-hover"
                      >
                        {/* Status Icon Wrapper */}
                        <div
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            background: n.type === "success" ? "rgba(16, 185, 129, 0.1)" : n.type === "cancel" ? "rgba(245, 158, 11, 0.1)" : "rgba(239, 68, 68, 0.1)",
                            color: iconColor,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {iconSvg}
                        </div>

                        {/* Text Message & Subtext */}
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.2rem", minWidth: 0 }}>
                          <span
                            style={{
                              fontSize: "0.76rem",
                              fontWeight: 600,
                              color: "var(--text-primary)",
                              lineHeight: "1.35",
                              wordBreak: "break-word",
                            }}
                          >
                            {n.message}
                          </span>
                          <span
                            style={{
                              fontSize: "0.66rem",
                              color: "var(--text-muted)",
                              fontWeight: 500,
                            }}
                          >
                            {formatTimeAgo(n.timestamp)}
                          </span>
                        </div>

                        {/* Individual Dismiss Trigger */}
                        <button
                          onClick={(e) => handleDismissNotification(n.id, e)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "0.1rem",
                            color: "var(--text-muted)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: 0.7,
                          }}
                          className="close-hover"
                          title="Dismiss"
                        >
                          <svg style={{ width: "0.8rem", height: "0.8rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Circle Dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.2rem", cursor: "pointer" }}>
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "50%",
              background: "#FBBF24",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "0.85rem",
              textTransform: "uppercase",
            }}
          >
            {userName.slice(0, 1)}
          </div>
          <svg style={{ width: "0.75rem", height: "0.75rem", color: "#64748B" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </div>
    </header>
  );
}
