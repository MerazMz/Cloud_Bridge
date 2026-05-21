"use client";

import React from "react";

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  darkMode: boolean;
  type?: "danger" | "warning" | "info";
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  darkMode,
  type = "warning",
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const getThemeColor = () => {
    if (type === "danger") return "#EF4444";
    if (type === "warning") return "#F59E0B";
    return "#3B82F6";
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: darkMode ? "rgba(15, 23, 42, 0.75)" : "rgba(15, 23, 42, 0.4)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 11000,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: darkMode ? "#1e293b" : "#ffffff",
          border: darkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)",
          borderRadius: "16px",
          padding: "1.5rem",
          width: "90%",
          maxWidth: "400px",
          boxShadow: darkMode ? "0 25px 50px -12px rgba(0, 0, 0, 0.5)" : "0 25px 50px -12px rgba(15, 23, 42, 0.15)",
          display: "flex",
          flexDirection: "column",
          gap: "1.2rem",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", gap: "0.85rem", alignItems: "flex-start" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: type === "danger" 
                ? "rgba(239, 68, 68, 0.15)" 
                : (type === "warning" ? "rgba(245, 158, 11, 0.15)" : "rgba(59, 130, 246, 0.15)"),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: getThemeColor(),
              flexShrink: 0,
            }}
          >
            {type === "danger" || type === "warning" ? (
              <svg style={{ width: "1.35rem", height: "1.35rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ) : (
              <svg style={{ width: "1.35rem", height: "1.35rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: darkMode ? "#ffffff" : "#0f172a", margin: 0, fontFamily: "var(--font-outfit, sans-serif)" }}>
              {title}
            </h3>
            <p style={{ fontSize: "0.82rem", color: darkMode ? "#94a3b8" : "#64748b", margin: 0, fontWeight: 500, lineHeight: 1.4 }}>
              {message}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px", marginTop: "0.4rem" }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "0.55rem 1.15rem",
              borderRadius: "8px",
              fontSize: "0.8rem",
              fontWeight: 700,
              background: darkMode ? "#334155" : "#e2e8f0",
              color: darkMode ? "#f1f5f9" : "#475569",
              border: "none",
              cursor: "pointer",
            }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: "0.55rem 1.15rem",
              borderRadius: "8px",
              fontSize: "0.8rem",
              fontWeight: 800,
              background: getThemeColor(),
              color: "#ffffff",
              border: "none",
              cursor: "pointer",
              boxShadow: `0 4px 6px -1px rgba(0, 0, 0, 0.1)`,
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
