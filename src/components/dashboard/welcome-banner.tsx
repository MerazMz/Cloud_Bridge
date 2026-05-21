"use client";

import { useState, useRef, useEffect } from "react";

interface WelcomeBannerProps {
  userName: string;
  tab: string;
  triggerFileInput: () => void;
  isUploading: boolean;
  showBanner: boolean;
  isBannerVisible: boolean;
  handleCloseBanner: (e: React.MouseEvent) => void;
  onCreateFolderClick?: () => void;
}

export function WelcomeBanner({
  userName,
  tab,
  triggerFileInput,
  isUploading,
  showBanner,
  isBannerVisible,
  handleCloseBanner,
  onCreateFolderClick,
}: WelcomeBannerProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", width: "100%" }}>
      <div className="animate-fade-in" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1.25rem", width: "100%", position: "relative", zIndex: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
          <h1 style={{ fontSize: "1.55rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.03em" }}>
            Good morning, {userName}
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", fontWeight: 500 }}>
            {tab === "dashboard" && "Here's what's happening with your cloud storage today."}
            {tab === "my-files" && "Access and manage all your uploaded cloud files."}
            {tab === "folders" && "Organize and browse files by categories."}
            {tab === "recent" && "Review your recently added files."}
            {tab === "favorites" && "Your bookmarked and favorited important items."}
            {tab === "shared" && "Public shared links you created for download."}
            {tab === "trash" && "Recover or permanently delete trashed items."}
          </p>
        </div>

        {tab === "dashboard" && (
          <div style={{ position: "relative", zIndex: 50 }}>
            <div style={{ display: "flex", alignItems: "center", borderRadius: "10px", background: "#FBBF24", overflow: "hidden", boxShadow: "0 3px 8px rgba(245, 158, 11, 0.15)" }}>
              <button
                onClick={triggerFileInput}
                disabled={isUploading}
                style={{
                  background: "transparent",
                  color: "#000000",
                  padding: "0.55rem 1rem",
                  fontWeight: 700,
                  border: "none",
                  fontSize: "0.88rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  cursor: "pointer",
                }}
              >
                <svg style={{ width: "0.95rem", height: "0.95rem", color: "#000000" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                </svg>
                Upload
              </button>
              <div style={{ width: "1px", height: "1.3rem", background: "rgba(0, 0, 0, 0.08)" }} />
              <button
                ref={triggerRef}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDropdownOpen(!isDropdownOpen);
                }}
                disabled={isUploading}
                style={{
                  background: "transparent",
                  color: "#000000",
                  padding: "0.55rem 0.75rem",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg style={{ width: "0.8rem", height: "0.8rem", color: "#000000" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
            </div>

            {isDropdownOpen && (
              <div
                ref={dropdownRef}
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  right: 0,
                  background: "var(--bg-card, #ffffff)",
                  border: "1px solid var(--border-default, #e2e8f0)",
                  borderRadius: "8px",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                  zIndex: 100,
                  minWidth: "160px",
                  padding: "4px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                }}
              >
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    triggerFileInput();
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: "var(--text-primary, #1e293b)",
                    border: "none",
                    background: "transparent",
                    borderRadius: "6px",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(245, 158, 11, 0.1)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <svg style={{ width: "0.85rem", height: "0.85rem", color: "#F59E0B" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                  </svg>
                  Upload File
                </button>
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    if (onCreateFolderClick) {
                      onCreateFolderClick();
                    }
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: "var(--text-primary, #1e293b)",
                    border: "none",
                    background: "transparent",
                    borderRadius: "6px",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(245, 158, 11, 0.1)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <svg style={{ width: "0.85rem", height: "0.85rem", color: "#F59E0B" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                  </svg>
                  Create Folder
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cover Banner with solid background and floating movement */}
      {tab === "dashboard" && showBanner && (
        <div
          className={`glass-card ${isBannerVisible ? "animate-fade-in" : "animate-fade-out"}`}
          style={{
            position: "relative",
            width: "100%",
            borderRadius: "20px",
            background: "var(--bg-card)",
            border: "1px solid var(--border-default)",
            padding: "2rem 2.25rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            overflow: "hidden",
            gap: "2rem",
            transition: "opacity 0.4s ease, transform 0.4s ease",
            boxShadow: "var(--glass-shadow)",
            zIndex: 10,
          }}
        >
          {/* Main info text column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", maxWidth: "55%", zIndex: 2 }}>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "#FBBF24",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                background: "rgba(251, 191, 36, 0.06)",
                padding: "0.25rem 0.6rem",
                borderRadius: "9999px",
                alignSelf: "flex-start",
              }}
            >
              Secure Cloud Engine
            </span>
            <h2
              style={{
                fontSize: "1.6rem",
                fontWeight: 800,
                color: "var(--text-primary)",
                lineHeight: 1.22,
                letterSpacing: "-0.03em",
              }}
            >
              All your files in one secure place, accessible anywhere
            </h2>
            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
                lineHeight: 1.5,
                fontWeight: 500,
              }}
            >
              CloudBridge gives you the power to stream uploads directly to secure Telegram channels, encrypt private keys on the fly, and download files with zero limits.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.4rem" }}>
              <button
                onClick={triggerFileInput}
                className="btn btn-primary"
                style={{
                  padding: "0.55rem 1.15rem",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  boxShadow: "0 4px 12px rgba(245, 158, 11, 0.2)",
                  background: "#F59E0B",
                  color: "#ffffff",
                }}
              >
                Start Uploading
              </button>
              <button
                className="btn btn-secondary"
                style={{
                  padding: "0.55rem 1.15rem",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                }}
                onClick={() => alert("Learn more documentation coming soon!")}
              >
                Learn More
              </button>
            </div>
          </div>

          {/* Graphical floating elements right column */}
          <div
            style={{
              position: "relative",
              width: "250px",
              height: "170px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: "1rem",
              zIndex: 1,
            }}
          >
            <img
              src="/banner.png"
              alt="CloudBridge Illustration"
              className="animate-float"
              style={{
                width: "260px",
                height: "185px",
                objectFit: "contain",
                filter: "drop-shadow(0 15px 25px rgba(0, 0, 0, 0.15))",
                pointerEvents: "none",
                userSelect: "none",
              }}
            />
          </div>

          {/* Elegant top-right cross dismiss button */}
          <button
            onClick={handleCloseBanner}
            style={{
              position: "absolute",
              top: "1.25rem",
              right: "1.25rem",
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              border: "1px solid var(--border-default)",
              background: "var(--bg-secondary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--text-muted)",
              transition: "all 0.15s ease",
              zIndex: 3,
            }}
            title="Dismiss Banner"
          >
            <svg style={{ width: "0.85rem", height: "0.85rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
