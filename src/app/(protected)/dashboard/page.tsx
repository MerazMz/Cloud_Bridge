"use client";

import { useState, useEffect, useRef, ChangeEvent, DragEvent } from "react";
import { useAuth } from "@/hooks/use-auth";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/components/ui/toast";

export interface DBFile {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

export default function DashboardPage() {
  const { user, loading, error, refresh } = useAuth();
  const { showToast } = useToast();
  const [files, setFiles] = useState<DBFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDragActive, setIsDragActive] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({});
  const [downloadingIds, setDownloadingIds] = useState<Record<string, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize theme from document element class
  useEffect(() => {
    if (typeof window !== "undefined") {
      setDarkMode(document.documentElement.classList.contains("dark"));
    }
  }, []);

  const toggleDarkMode = () => {
    const nextDark = !darkMode;
    setDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const fetchFiles = async () => {
    setFilesLoading(true);
    try {
      const res = await fetch("/api/files");
      const json = await res.json();
      if (json.success) {
        setFiles(json.data);
      } else {
        showToast("error", json.message || "Failed to load files.");
      }
    } catch (err) {
      showToast("error", "An error occurred while fetching files.");
    } finally {
      setFilesLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.storageChannelId) {
      fetchFiles();
    }
  }, [user]);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (json.success) {
        showToast("success", `${file.name} uploaded successfully.`);
        setFiles((prev) => [json.data, ...prev]);
      } else {
        showToast("error", json.message || "Failed to upload file.");
      }
    } catch (err) {
      showToast("error", "An error occurred while uploading the file.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (fileId: string, fileName: string) => {
    setDownloadingIds((prev) => ({ ...prev, [fileId]: true }));
    try {
      const res = await fetch(`/api/files/${fileId}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message || "Download failed.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast("success", `${fileName} downloaded successfully.`);
    } catch (err: any) {
      showToast("error", err.message || "Failed to download file.");
    } finally {
      setDownloadingIds((prev) => ({ ...prev, [fileId]: false }));
    }
  };

  const handleDelete = async (fileId: string) => {
    setDeletingIds((prev) => ({ ...prev, [fileId]: true }));
    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (json.success) {
        showToast("success", "File deleted successfully.");
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
      } else {
        showToast("error", json.message || "Failed to delete file.");
      }
    } catch (err) {
      showToast("error", "An error occurred while deleting the file.");
    } finally {
      setDeletingIds((prev) => ({ ...prev, [fileId]: false }));
    }
  };

  const handleShare = async (fileId: string) => {
    try {
      const sharedUrl = `${window.location.origin}/api/files/shared/${fileId}`;
      await navigator.clipboard.writeText(sharedUrl);
      showToast("success", "Shareable download link copied to clipboard!");
    } catch (err) {
      showToast("error", "Failed to copy share link.");
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      await handleUpload(file);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await handleUpload(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Helper formats
  const formatBytes = (bytes: number, decimals = 1) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Classify file category
  const classifyFile = (mime: string, name: string): "image" | "document" | "media" | "archive" | "other" => {
    const mimeLower = mime.toLowerCase();
    const nameLower = name.toLowerCase();

    if (mimeLower.startsWith("image/")) return "image";
    if (mimeLower.startsWith("video/") || mimeLower.startsWith("audio/")) return "media";
    if (mimeLower.includes("pdf")) return "document";
    if (
      mimeLower.includes("zip") ||
      mimeLower.includes("tar") ||
      mimeLower.includes("rar") ||
      mimeLower.includes("7z")
    )
      return "archive";
    if (
      nameLower.endsWith(".js") ||
      nameLower.endsWith(".ts") ||
      nameLower.endsWith(".json") ||
      nameLower.endsWith(".py") ||
      nameLower.endsWith(".go") ||
      nameLower.endsWith(".html") ||
      nameLower.endsWith(".css") ||
      nameLower.endsWith(".cpp") ||
      nameLower.endsWith(".java") ||
      mimeLower.includes("word") ||
      mimeLower.includes("excel") ||
      mimeLower.includes("csv") ||
      mimeLower.includes("text") ||
      nameLower.endsWith(".txt") ||
      nameLower.endsWith(".md")
    ) {
      return "document";
    }
    return "other";
  };

  // Get dynamic file icon class/colors matching Aditya's designs
  const getFileStyle = (mime: string, name: string) => {
    const category = classifyFile(mime, name);
    switch (category) {
      case "image":
        return { emoji: "🖼️", bg: "#f3e8ff", color: "#a855f7" }; // Purple PNG
      case "media":
        return { emoji: "🎵", bg: "#dbeafe", color: "#3b82f6" }; // Blue Media
      case "document":
        return name.toLowerCase().endsWith(".pdf")
          ? { emoji: "📕", bg: "#fee2e2", color: "#ef4444" } // Red PDF
          : { emoji: "📄", bg: "#dbeafe", color: "#2563eb" }; // Blue DOCX
      case "archive":
        return { emoji: "📦", bg: "#fef3c7", color: "#d97706" }; // Orange ZIP
      default:
        return { emoji: "📎", bg: "#f1f5f9", color: "#64748b" }; // Grey Others
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <LoadingSpinner size="lg" label="Loading dashboard panel..." />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="glass-card animate-fade-in" style={{ padding: "2rem", textAlign: "center" }}>
        <p style={{ color: "var(--color-error)", marginBottom: "1rem" }}>{error || "Failed to load user data."}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  // Metrics calculation
  const totalStorage = files.reduce((acc, f) => acc + Number(f.fileSize), 0);
  const totalFilesCount = files.length;
  const imageFiles = files.filter(f => classifyFile(f.mimeType, f.fileName) === "image");
  const documentFiles = files.filter(f => classifyFile(f.mimeType, f.fileName) === "document");
  const mediaFiles = files.filter(f => classifyFile(f.mimeType, f.fileName) === "media");

  const imagesCount = imageFiles.length;
  const documentsCount = documentFiles.length;

  const imagesPercent = totalFilesCount > 0 ? Math.round((imagesCount / totalFilesCount) * 100) : 0;
  const documentsPercent = totalFilesCount > 0 ? Math.round((documentsCount / totalFilesCount) * 100) : 0;

  // Donut chart segments
  const imagesSize = imageFiles.reduce((acc, f) => acc + Number(f.fileSize), 0);
  const documentsSize = documentFiles.reduce((acc, f) => acc + Number(f.fileSize), 0);
  const mediaSize = mediaFiles.reduce((acc, f) => acc + Number(f.fileSize), 0);
  const otherSize = Math.max(0, totalStorage - imagesSize - documentsSize - mediaSize);

  const imgPct = totalStorage > 0 ? (imagesSize / totalStorage) * 100 : 0;
  const docPct = totalStorage > 0 ? (documentsSize / totalStorage) * 100 : 0;
  const medPct = totalStorage > 0 ? (mediaSize / totalStorage) * 100 : 0;
  const othPct = totalStorage > 0 ? (otherSize / totalStorage) * 100 : 0;

  const donutGradient = totalStorage > 0 
    ? `conic-gradient(
        #a855f7 0% ${imgPct}%,
        #3b82f6 ${imgPct}% ${imgPct + docPct}%,
        #10b981 ${imgPct + docPct}% ${imgPct + docPct + medPct}%,
        #f59e0b ${imgPct + docPct + medPct}% 100%
      )`
    : "conic-gradient(#cbd5e1 0% 100%)";

  const limitBytes = 100 * 1024 * 1024 * 1024; // 100 GB
  const totalUsedPercent = Math.min(Math.round((totalStorage / limitBytes) * 100), 100);

  // Filtered files by search input
  const filteredFiles = files.filter(f =>
    f.fileName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem", width: "100%" }}>
      {/* Top Header Bar */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1.5rem",
          width: "100%",
        }}
      >
        {/* Search Bar */}
        <div style={{ position: "relative", width: "380px" }}>
          <span style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.95rem" }}>
            🔍
          </span>
          <input
            type="text"
            placeholder="Search files and folders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field"
            style={{
              paddingLeft: "2.5rem",
              borderRadius: "20px",
              height: "44px",
              border: "1px solid var(--border-default)",
              background: "var(--bg-card)",
            }}
          />
        </div>

        {/* Action Widgets */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          {/* Light/Dark Toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.1rem" }}>☀️</span>
            <label className="theme-switch">
              <input type="checkbox" checked={darkMode} onChange={toggleDarkMode} />
              <span className="slider"></span>
            </label>
            <span style={{ fontSize: "1.1rem" }}>🌙</span>
          </div>

          {/* Notifications Bell */}
          <div
            style={{
              position: "relative",
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "var(--bg-card)",
              border: "1px solid var(--border-default)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "1.1rem",
            }}
          >
            🔔
            <span
              style={{
                position: "absolute",
                top: "-2px",
                right: "-2px",
                background: "var(--color-error)",
                color: "white",
                borderRadius: "50%",
                width: "16px",
                height: "16px",
                fontSize: "0.65rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
              }}
            >
              3
            </span>
          </div>

          {/* Profile Circle Dropdown */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #a855f7, #6366f1)",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
              }}
            >
              {user.displayName ? user.displayName.slice(0, 1) : "A"}
            </div>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>▼</span>
          </div>
        </div>
      </header>

      {/* Welcome Banner */}
      <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)" }}>
          Welcome back, {user.displayName || "Aditya"}! 👋
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
          Here's what's happening with your files today.
        </p>
      </div>

      {/* Metrics Row (4 Cards) */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1.25rem",
          width: "100%",
        }}
      >
        {/* Total Storage */}
        <div className="glass-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(99, 102, 241, 0.08)", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", fontSize: "1.2rem", color: "#6366f1" }}>💾</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Total Storage</span>
              <span style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--text-primary)" }}>{formatBytes(totalStorage)}</span>
            </div>
          </div>
          <div style={{ marginTop: "0.25rem" }}>
            <div style={{ width: "100%", height: "4px", background: "var(--border-default)", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{ width: `${totalUsedPercent}%`, height: "100%", background: "#6366f1" }} />
            </div>
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.35rem", display: "block" }}>of 100 GB Used</span>
          </div>
        </div>

        {/* Total Files */}
        <div className="glass-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(59, 130, 246, 0.08)", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", fontSize: "1.2rem", color: "#3b82f6" }}>📁</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Total Files</span>
              <span style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--text-primary)" }}>{totalFilesCount}</span>
            </div>
          </div>
          <div style={{ marginTop: "0.25rem" }}>
            <div style={{ width: "100%", height: "4px", background: "var(--border-default)", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{ width: "100%", height: "100%", background: "#3b82f6" }} />
            </div>
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.35rem", display: "block" }}>Across all folders</span>
          </div>
        </div>

        {/* Images */}
        <div className="glass-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(16, 185, 129, 0.08)", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", fontSize: "1.2rem", color: "#10b981" }}>🖼️</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Images</span>
              <span style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--text-primary)" }}>{imagesCount}</span>
            </div>
          </div>
          <div style={{ marginTop: "0.25rem" }}>
            <div style={{ width: "100%", height: "4px", background: "var(--border-default)", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{ width: `${imagesPercent}%`, height: "100%", background: "#10b981" }} />
            </div>
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.35rem", display: "block" }}>{imagesPercent}% of your files</span>
          </div>
        </div>

        {/* Documents */}
        <div className="glass-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(245, 158, 11, 0.08)", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", fontSize: "1.2rem", color: "#f59e0b" }}>📄</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Documents</span>
              <span style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--text-primary)" }}>{documentsCount}</span>
            </div>
          </div>
          <div style={{ marginTop: "0.25rem" }}>
            <div style={{ width: "100%", height: "4px", background: "var(--border-default)", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{ width: `${documentsPercent}%`, height: "100%", background: "#f59e0b" }} />
            </div>
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.35rem", display: "block" }}>{documentsPercent}% of your files</span>
          </div>
        </div>
      </section>

      {/* Quick Actions & Drag Drop Section */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1.5rem",
          width: "100%",
        }}
      >
        {/* Quick Actions Panel */}
        <div className="glass-card animate-slide-up" style={{ padding: "1.5rem", animationDelay: "0.1s" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "1rem" }}>
            Quick Actions
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: "none" }}
              disabled={isUploading}
            />
            {/* Upload Action */}
            <button
              onClick={triggerFileInput}
              className="glass-card card-hover"
              disabled={isUploading}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "1rem",
                cursor: "pointer",
                background: "rgba(99, 102, 241, 0.04)",
                gap: "0.5rem",
                border: "1px solid rgba(99, 102, 241, 0.1)",
              }}
            >
              <span style={{ fontSize: "1.5rem" }}>📤</span>
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#6366f1" }}>Upload File</span>
            </button>

            {/* Folder Action */}
            <button
              onClick={() => alert("Creating custom folder folders coming soon!")}
              className="glass-card card-hover"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "1rem",
                cursor: "pointer",
                background: "rgba(59, 130, 246, 0.04)",
                gap: "0.5rem",
                border: "1px solid rgba(59, 130, 246, 0.1)",
              }}
            >
              <span style={{ fontSize: "1.5rem" }}>📁</span>
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#3b82f6" }}>New Folder</span>
            </button>

            {/* Share Action */}
            <button
              onClick={() => showToast("info", "Click the link icon (🔗) on any file below to copy its link.")}
              className="glass-card card-hover"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "1rem",
                cursor: "pointer",
                background: "rgba(16, 185, 129, 0.04)",
                gap: "0.5rem",
                border: "1px solid rgba(16, 185, 129, 0.1)",
              }}
            >
              <span style={{ fontSize: "1.5rem" }}>🔗</span>
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#10b981" }}>Share File</span>
            </button>
          </div>
        </div>

        {/* Drag & Drop Area */}
        <div
          className="glass-card animate-slide-up"
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={triggerFileInput}
          style={{
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            border: isDragActive
              ? "2px dashed var(--color-primary)"
              : "2px dashed #a855f7",
            background: isDragActive ? "rgba(99, 102, 241, 0.04)" : "rgba(168, 85, 247, 0.02)",
            cursor: "pointer",
            transition: "all 0.2s ease",
            animationDelay: "0.15s",
          }}
        >
          {isUploading ? (
            <LoadingSpinner size="md" label="Uploading to private Telegram..." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "2rem", color: "#a855f7" }}>📤</span>
              <p style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-primary)" }}>
                Drag & drop files here to upload
              </p>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                or click to <span style={{ color: "#a855f7", fontWeight: 600 }}>browse</span> your files
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Bottom Split Workspace */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "1.5rem",
          width: "100%",
        }}
      >
        {/* Recent Files Table Card */}
        <div
          className="glass-card animate-slide-up"
          style={{
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            animationDelay: "0.2s",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>Recent Files</h3>
            <button
              onClick={() => showToast("info", "All files are listed directly here.")}
              style={{ background: "none", border: "none", color: "#4f46e5", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}
            >
              View all
            </button>
          </div>

          {/* Files Table */}
          <div style={{ overflowX: "auto" }}>
            {filesLoading && files.length === 0 ? (
              <div style={{ padding: "3rem 0", display: "flex", justifyContent: "center" }}>
                <LoadingSpinner size="md" label="Loading database files..." />
              </div>
            ) : filteredFiles.length > 0 ? (
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-default)" }}>
                    <th style={{ padding: "0.75rem 0.5rem", fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600 }}>Name</th>
                    <th style={{ padding: "0.75rem 0.5rem", fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600 }}>Type</th>
                    <th style={{ padding: "0.75rem 0.5rem", fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600 }}>Size</th>
                    <th style={{ padding: "0.75rem 0.5rem", fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600 }}>Modified</th>
                    <th style={{ padding: "0.75rem 0.5rem", fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600, textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFiles.map((file) => {
                    const style = getFileStyle(file.mimeType, file.fileName);
                    const isDeleting = deletingIds[file.id];
                    const isDownloading = downloadingIds[file.id];

                    return (
                      <tr
                        key={file.id}
                        style={{
                          borderBottom: "1px solid var(--border-subtle)",
                          opacity: isDeleting ? 0.5 : 1,
                        }}
                      >
                        {/* Name and Icon */}
                        <td style={{ padding: "0.75rem 0.5rem", maxWidth: "240px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <div
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "6px",
                                background: style.bg,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "1.1rem",
                                flexShrink: 0,
                              }}
                            >
                              {style.emoji}
                            </div>
                            <span
                              title={file.fileName}
                              style={{
                                fontWeight: 500,
                                fontSize: "0.85rem",
                                color: "var(--text-primary)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {file.fileName}
                            </span>
                          </div>
                        </td>

                        {/* Type */}
                        <td style={{ padding: "0.75rem 0.5rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                          {file.mimeType.split("/")[1]?.toUpperCase() || "FILE"}
                        </td>

                        {/* Size */}
                        <td style={{ padding: "0.75rem 0.5rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                          {formatBytes(file.fileSize)}
                        </td>

                        {/* Date */}
                        <td style={{ padding: "0.75rem 0.5rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                          {getRelativeTime(file.createdAt)}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>
                          <div style={{ display: "flex", gap: "0.35rem", justifyContent: "flex-end" }}>
                            <button
                              disabled={isDeleting || isDownloading}
                              onClick={() => handleShare(file.id)}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.95rem" }}
                              title="Copy Share Link"
                            >
                              🔗
                            </button>
                            <button
                              disabled={isDeleting || isDownloading}
                              onClick={() => handleDownload(file.id, file.fileName)}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.95rem" }}
                              title="Download File"
                            >
                              {isDownloading ? "⏳" : "⬇️"}
                            </button>
                            <button
                              disabled={isDeleting || isDownloading}
                              onClick={() => handleDelete(file.id)}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.95rem" }}
                              title="Delete File"
                            >
                              {isDeleting ? "⏳" : "🗑️"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: "3rem 0", textAlign: "center" }}>
                <span style={{ fontSize: "2rem" }}>📭</span>
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                  {searchTerm ? "No files match your search" : "Your storage is empty"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right side panels */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Storage Overview Card */}
          <div className="glass-card animate-slide-up" style={{ padding: "1.5rem", animationDelay: "0.25s" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>Storage Overview</h3>
              <button
                onClick={() => showToast("info", "Dynamic breakdown based on your database files.")}
                style={{ background: "none", border: "none", color: "#4f46e5", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}
              >
                View details
              </button>
            </div>

            {/* Donut and Legend row */}
            <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", marginTop: "0.5rem" }}>
              {/* Donut Chart */}
              <div
                style={{
                  width: "110px",
                  height: "110px",
                  borderRadius: "50%",
                  background: donutGradient,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  flexShrink: 0,
                }}
              >
                {/* Center Cutout */}
                <div
                  style={{
                    width: "74px",
                    height: "74px",
                    borderRadius: "50%",
                    background: "var(--bg-card)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)" }}>
                    {totalUsedPercent}%
                  </span>
                  <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 600 }}>Used</span>
                </div>
              </div>

              {/* Legend details */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", flex: 1 }}>
                {/* Images */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#a855f7", display: "inline-block" }}></span>
                    <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>Images</span>
                  </div>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{formatBytes(imagesSize)}</span>
                </div>

                {/* Documents */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#3b82f6", display: "inline-block" }}></span>
                    <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>Documents</span>
                  </div>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{formatBytes(documentsSize)}</span>
                </div>

                {/* Videos / Media */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", display: "inline-block" }}></span>
                    <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>Videos</span>
                  </div>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{formatBytes(mediaSize)}</span>
                </div>

                {/* Others */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f59e0b", display: "inline-block" }}></span>
                    <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>Others</span>
                  </div>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{formatBytes(otherSize)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity Card */}
          <div className="glass-card animate-slide-up" style={{ padding: "1.5rem", animationDelay: "0.3s" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>Recent Activity</h3>
              <button
                onClick={() => showToast("info", "Listing your recent activities.")}
                style={{ background: "none", border: "none", color: "#4f46e5", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}
              >
                View all
              </button>
            </div>

            {/* Activity Stream */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginTop: "0.5rem" }}>
              {files.slice(0, 3).map((file, i) => (
                <div key={file.id} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: "rgba(99, 102, 241, 0.08)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.85rem",
                      color: "#6366f1",
                      flexShrink: 0,
                    }}
                  >
                    📤
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {file.fileName} uploaded
                    </p>
                    <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                      {getRelativeTime(file.createdAt)}
                    </span>
                  </div>
                </div>
              ))}

              {files.length === 0 && (
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center", display: "block" }}>
                  No recent activities recorded yet.
                </span>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
