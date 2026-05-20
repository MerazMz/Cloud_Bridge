"use client";

import { ChangeEvent, DragEvent, RefObject } from "react";

interface UploaderPanelProps {
  isUploading: boolean;
  triggerFileInput: () => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  isDragActive: boolean;
  handleDrag: (e: DragEvent<HTMLDivElement>) => void;
  handleDrop: (e: DragEvent<HTMLDivElement>) => void;
}

export function UploaderPanel({
  isUploading,
  triggerFileInput,
  fileInputRef,
  handleFileChange,
  isDragActive,
  handleDrag,
  handleDrop,
}: UploaderPanelProps) {
  return (
    <section style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.15rem", width: "100%" }}>
      {/* Quick Actions */}
      <div className="glass-card animate-slide-up" style={{ padding: "1.15rem", borderRadius: "14px", border: "1px solid var(--border-default)", background: "var(--bg-card)", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
        <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.015em" }}>Quick Actions</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.6rem" }}>
          <button
            onClick={triggerFileInput}
            className="glass-card card-hover"
            disabled={isUploading}
            style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.65rem 0.85rem", borderRadius: "10px", border: "1px solid var(--border-default)", background: "rgba(245, 158, 11, 0.03)", cursor: "pointer", transition: "all 0.2s ease", textAlign: "left" }}
          >
            <div style={{ width: "30px", height: "30px", borderRadius: "6px", background: "rgba(245, 158, 11, 0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg style={{ width: "1rem", height: "1rem", color: "#F59E0B" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 15V9M12 9L9 12M12 9L15 12"/><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/></svg>
            </div>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)" }}>Upload Files</span>
          </button>

          <button
            className="glass-card card-hover"
            onClick={() => alert("Creating custom folder directories is coming soon!")}
            style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.65rem 0.85rem", borderRadius: "10px", border: "1px solid var(--border-default)", background: "transparent", cursor: "pointer", transition: "all 0.2s ease", textAlign: "left" }}
          >
            <div style={{ width: "30px", height: "30px", borderRadius: "6px", background: "rgba(100, 116, 139, 0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg style={{ width: "1rem", height: "1rem", color: "#64748B" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            </div>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)" }}>Create Folder</span>
          </button>

          <button
            className="glass-card card-hover"
            onClick={() => alert("File encryption vault feature coming soon!")}
            style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.65rem 0.85rem", borderRadius: "10px", border: "1px solid var(--border-default)", background: "transparent", cursor: "pointer", transition: "all 0.2s ease", textAlign: "left" }}
          >
            <div style={{ width: "30px", height: "30px", borderRadius: "6px", background: "rgba(16, 185, 129, 0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg style={{ width: "1rem", height: "1rem", color: "#10B981" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)" }}>Encrypt Files</span>
          </button>

          <button
            className="glass-card card-hover"
            onClick={() => alert("Public file sharing links configurations panel coming soon!")}
            style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.65rem 0.85rem", borderRadius: "10px", border: "1px solid var(--border-default)", background: "transparent", cursor: "pointer", transition: "all 0.2s ease", textAlign: "left" }}
          >
            <div style={{ width: "30px", height: "30px", borderRadius: "6px", background: "rgba(99, 102, 241, 0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg style={{ width: "1rem", height: "1rem", color: "#6366F1" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>
            </div>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)" }}>Share Files</span>
          </button>
        </div>
      </div>

      {/* Drag & Drop Core File Area */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        className="glass-card card-hover animate-slide-up"
        style={{
          borderRadius: "14px",
          background: isDragActive ? "rgba(245, 158, 11, 0.02)" : "var(--bg-card)",
          border: isDragActive ? "2px dashed #F59E0B" : "2px dashed var(--border-default)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.15rem",
          cursor: "pointer",
          transition: "all 0.25s ease",
          textAlign: "center",
          position: "relative",
        }}
      >
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            background: isDragActive ? "rgba(245, 158, 11, 0.12)" : "rgba(245, 158, 11, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "0.55rem",
            transform: isDragActive ? "scale(1.08)" : "scale(1)",
            transition: "transform 0.25s ease",
          }}
        >
          <svg style={{ width: "1.3rem", height: "1.3rem", color: "#F59E0B" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
          </svg>
        </div>
        <h4 style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.15rem" }}>
          {isDragActive ? "Drop your files here!" : "Drag & drop files here"}
        </h4>
        <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 500 }}>
          or click to browse from desktop
        </p>
      </div>
    </section>
  );
}
