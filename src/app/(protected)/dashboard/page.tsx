"use client";

import { useState, useEffect, useRef, ChangeEvent, DragEvent, Suspense } from "react";
import { useAuth } from "@/hooks/use-auth";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/components/ui/toast";
import { useSearchParams } from "next/navigation";

export interface DBFile {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  isDeleted?: boolean;
  createdAt: string;
}

function DashboardContent() {
  const { user, loading, error } = useAuth();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "dashboard";

  const [files, setFiles] = useState<DBFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDragActive, setIsDragActive] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({});
  const [downloadingIds, setDownloadingIds] = useState<Record<string, boolean>>({});

  // Client-side visual state features
  const [favorites, setFavorites] = useState<string[]>([]);
  const [sharedIds, setSharedIds] = useState<string[]>([]);
  const [selectedFolderCategory, setSelectedFolderCategory] = useState<string | null>(null);

  // Upload Progress and Cancel State
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(null);
  const [uploadingFileSize, setUploadingFileSize] = useState<number>(0);
  const [uploadSpeed, setUploadSpeed] = useState<string | null>(null);
  const [uploadedBytes, setUploadedBytes] = useState<number>(0);
  const startTimeRef = useRef<number | null>(null);
  const cancelUploadRef = useRef<(() => void) | null>(null);
  const currentJobIdRef = useRef<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize theme and local storage states
  useEffect(() => {
    if (typeof window !== "undefined") {
      setDarkMode(document.documentElement.classList.contains("dark"));

      // Load favorites
      try {
        const favs = localStorage.getItem("favorites");
        if (favs) setFavorites(JSON.parse(favs));
      } catch {}

      // Load shared
      try {
        const sh = localStorage.getItem("shared_ids");
        if (sh) setSharedIds(JSON.parse(sh));
      } catch {}
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
    setUploadProgress(0);
    setUploadingFileName(file.name);
    setUploadingFileSize(file.size);
    setUploadSpeed("0 KB/s");
    setUploadedBytes(0);
    startTimeRef.current = Date.now();

    const abortController = new AbortController();
    cancelUploadRef.current = () => {
      abortController.abort();
    };

    try {
      // 1. Ingest streaming upload to disk and get background queue jobId
      const formData = new FormData();
      formData.append("file", file);

      const ingestResponse = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
        signal: abortController.signal,
      });

      if (!ingestResponse.ok) {
        const errText = await ingestResponse.text();
        let errMsg = "Upload failed.";
        try {
          const errJson = JSON.parse(errText);
          errMsg = errJson.message || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const { jobId } = await ingestResponse.json();
      currentJobIdRef.current = jobId;

      // 2. Connect to SSE telemetry stream for live speed, bytes, and percentage
      const response = await fetch(`/api/files/upload/progress?jobId=${jobId}`, {
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        let errMsg = "Failed to establish progress stream.";
        try {
          const errJson = JSON.parse(errText);
          errMsg = errJson.message || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Failed to read progress stream.");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const cleanLine = line.trim();
          if (cleanLine.startsWith("data: ")) {
            const dataStr = cleanLine.slice(6).trim();
            if (!dataStr) continue;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.type === "progress") {
                setUploadProgress(parsed.percent);
                setUploadedBytes(parsed.uploadedBytes);
                if (parsed.totalBytes) {
                  setUploadingFileSize(parsed.totalBytes);
                }
                setUploadSpeed(parsed.speed);
              } else if (parsed.type === "success") {
                showToast("success", `${file.name} uploaded successfully.`);
                if (parsed.data) {
                  setFiles((prev) => [parsed.data, ...prev]);
                }
              } else if (parsed.type === "error") {
                throw new Error(parsed.message || "Failed to upload file.");
              }
            } catch (jsonErr) {
              console.error("Failed to parse progress SSE JSON chunk", jsonErr);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError" || err.message === "Upload cancelled") {
        showToast("info", "Upload cancelled.");
      } else {
        showToast("error", err.message || "An error occurred while uploading the file.");
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      setUploadingFileName(null);
      setUploadSpeed(null);
      setUploadedBytes(0);
      setUploadingFileSize(0);
      startTimeRef.current = null;
      cancelUploadRef.current = null;
      currentJobIdRef.current = null;
    }
  };

  const handleCancelUpload = async () => {
    if (cancelUploadRef.current) {
      cancelUploadRef.current();
    }
    const jobId = currentJobIdRef.current;
    if (jobId) {
      fetch("/api/files/upload/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      }).catch((e) => console.error("Failed to propagate cancel signal to queue", e));
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

  // Move file to Trash (Soft Delete on backend)
  const handleMoveToTrash = async (file: DBFile) => {
    try {
      const res = await fetch(`/api/files/${file.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        showToast("info", `${file.fileName} moved to trash.`);
        setFiles((prev) =>
          prev.map((f) => (f.id === file.id ? { ...f, isDeleted: true } : f))
        );
      } else {
        showToast("error", json.message || "Failed to move file to trash.");
      }
    } catch {
      showToast("error", "An error occurred while moving the file to trash.");
    }
  };

  // Restore file from Trash (PATCH isDeleted to false)
  const handleRestoreFromTrash = async (file: DBFile) => {
    try {
      const res = await fetch(`/api/files/${file.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDeleted: false }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("success", `${file.fileName} restored from trash.`);
        setFiles((prev) =>
          prev.map((f) => (f.id === file.id ? { ...f, isDeleted: false } : f))
        );
      } else {
        showToast("error", json.message || "Failed to restore file.");
      }
    } catch {
      showToast("error", "An error occurred while restoring the file.");
    }
  };

  // Permanent Delete from Telegram & DB
  const handlePermanentDelete = async (fileId: string, fileName: string) => {
    setDeletingIds((prev) => ({ ...prev, [fileId]: true }));
    try {
      const res = await fetch(`/api/files/${fileId}?permanent=true`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (json.success) {
        showToast("success", `${fileName} permanently deleted.`);
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

      // Save to shared list
      if (!sharedIds.includes(fileId)) {
        const nextShared = [...sharedIds, fileId];
        setSharedIds(nextShared);
        localStorage.setItem("shared_ids", JSON.stringify(nextShared));
      }

      showToast("success", "Shareable download link copied to clipboard!");
    } catch (err) {
      showToast("error", "Failed to copy share link.");
    }
  };

  // Toggle Favorite Star
  const handleToggleFavorite = (fileId: string) => {
    let nextFavorites: string[] = [];
    if (favorites.includes(fileId)) {
      nextFavorites = favorites.filter((id) => id !== fileId);
      showToast("info", "Removed from favorites.");
    } else {
      nextFavorites = [...favorites, fileId];
      showToast("success", "Added to favorites.");
    }
    setFavorites(nextFavorites);
    localStorage.setItem("favorites", JSON.stringify(nextFavorites));
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

  // Get dynamic file icon styles
  const getFileStyle = (mime: string, name: string) => {
    const category = classifyFile(mime, name);
    switch (category) {
      case "image":
        return { emoji: "🖼️", bg: "#f3e8ff", color: "#a855f7" };
      case "media":
        return { emoji: "🎵", bg: "#dbeafe", color: "#3b82f6" };
      case "document":
        return name.toLowerCase().endsWith(".pdf")
          ? { emoji: "📕", bg: "#fee2e2", color: "#ef4444" }
          : { emoji: "📄", bg: "#dbeafe", color: "#2563eb" };
      case "archive":
        return { emoji: "📦", bg: "#fef3c7", color: "#d97706" };
      default:
        return { emoji: "📎", bg: "#f1f5f9", color: "#64748b" };
    }
  };

  useEffect(() => {
    if (user && user.storageChannelId) {
      fetchFiles();
    }
  }, [user]);

  if (!user) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <LoadingSpinner size="lg" label="Loading profile..." />
      </div>
    );
  }

  // Active files (excludes files marked as isDeleted)
  const activeFiles = files.filter((f) => !f.isDeleted);

  // Metrics calculation
  const totalStorage = activeFiles.reduce((acc, f) => acc + Number(f.fileSize), 0);
  const totalFilesCount = activeFiles.length;
  const imageFiles = activeFiles.filter(f => classifyFile(f.mimeType, f.fileName) === "image");
  const documentFiles = activeFiles.filter(f => classifyFile(f.mimeType, f.fileName) === "document");
  const mediaFiles = activeFiles.filter(f => classifyFile(f.mimeType, f.fileName) === "media");
  const archiveFiles = activeFiles.filter(f => classifyFile(f.mimeType, f.fileName) === "archive");
  const otherFiles = activeFiles.filter(
    (f) =>
      classifyFile(f.mimeType, f.fileName) !== "image" &&
      classifyFile(f.mimeType, f.fileName) !== "document" &&
      classifyFile(f.mimeType, f.fileName) !== "media" &&
      classifyFile(f.mimeType, f.fileName) !== "archive"
  );

  const imagesCount = imageFiles.length;
  const documentsCount = documentFiles.length;
  const mediaCount = mediaFiles.length;
  const archivesCount = archiveFiles.length;
  const othersCount = otherFiles.length;

  const imagesPercent = totalFilesCount > 0 ? Math.round((imagesCount / totalFilesCount) * 100) : 0;
  const documentsPercent = totalFilesCount > 0 ? Math.round((documentsCount / totalFilesCount) * 100) : 0;

  // Donut breakdown calculations
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

  // Fallback chain for user display name
  const userName = user.displayName || user.username || user.phoneNumber || "Aditya";

  // Filtered files list selector by tab
  let visibleFiles: DBFile[] = [];
  if (tab === "dashboard") {
    visibleFiles = activeFiles.slice(0, 5); // dashboard shows only 5 recent
  } else if (tab === "my-files" || tab === "recent") {
    visibleFiles = activeFiles; // show all active
  } else if (tab === "favorites") {
    visibleFiles = activeFiles.filter((f) => favorites.includes(f.id));
  } else if (tab === "shared") {
    visibleFiles = activeFiles.filter((f) => sharedIds.includes(f.id));
  } else if (tab === "trash") {
    visibleFiles = files.filter((f) => f.isDeleted);
  } else if (tab === "folders") {
    if (selectedFolderCategory === "images") visibleFiles = imageFiles;
    else if (selectedFolderCategory === "documents") visibleFiles = documentFiles;
    else if (selectedFolderCategory === "media") visibleFiles = mediaFiles;
    else if (selectedFolderCategory === "archives") visibleFiles = archiveFiles;
    else if (selectedFolderCategory === "others") visibleFiles = otherFiles;
  }

  // Filter visible files by search bar
  const finalFilteredFiles = visibleFiles.filter((f) =>
    f.fileName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem", width: "100%" }}>
      {/* Top Header Bar */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1.5rem", width: "100%" }}>
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
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
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
                textTransform: "uppercase",
              }}
            >
              {userName.slice(0, 1)}
            </div>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>▼</span>
          </div>
        </div>
      </header>

      {/* Welcome Banner */}
      <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)" }}>
          Welcome back, {userName}! 👋
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
          {tab === "dashboard" && "Here's what's happening with your files today."}
          {tab === "my-files" && "Access and manage all your uploaded cloud files."}
          {tab === "folders" && "Organize and browse files by categories."}
          {tab === "recent" && "Review your recently added files."}
          {tab === "favorites" && "Your bookmarked and favorited important items."}
          {tab === "shared" && "Public shared links you created for download."}
          {tab === "trash" && "Recover or permanently delete trashed items."}
        </p>
      </div>

      {/* Conditional Rendering Based on Tabs */}

      {tab === "dashboard" && (
        <>
          {/* Metrics Row (4 Cards) */}
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem", width: "100%" }}>
            {/* Total Storage */}
            <div className="glass-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(99, 102, 241, 0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", color: "#6366f1" }}>💾</div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Total Storage</span>
                  <span style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--text-primary)" }}>{formatBytes(totalStorage)}</span>
                </div>
              </div>
              <div>
                <div style={{ width: "100%", height: "4px", background: "var(--border-default)", borderRadius: "2px", overflow: "hidden", marginTop: "0.5rem" }}>
                  <div style={{ width: `${totalUsedPercent}%`, height: "100%", background: "#6366f1" }} />
                </div>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.35rem", display: "block" }}>of 100 GB Used</span>
              </div>
            </div>

            {/* Total Files */}
            <div className="glass-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(59, 130, 246, 0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", color: "#3b82f6" }}>📁</div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Total Files</span>
                  <span style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--text-primary)" }}>{totalFilesCount}</span>
                </div>
              </div>
              <div>
                <div style={{ width: "100%", height: "4px", background: "var(--border-default)", borderRadius: "2px", overflow: "hidden", marginTop: "0.5rem" }}>
                  <div style={{ width: "100%", height: "100%", background: "#3b82f6" }} />
                </div>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.35rem", display: "block" }}>Across all folders</span>
              </div>
            </div>

            {/* Images */}
            <div className="glass-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(16, 185, 129, 0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", color: "#10b981" }}>🖼️</div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Images</span>
                  <span style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--text-primary)" }}>{imagesCount}</span>
                </div>
              </div>
              <div>
                <div style={{ width: "100%", height: "4px", background: "var(--border-default)", borderRadius: "2px", overflow: "hidden", marginTop: "0.5rem" }}>
                  <div style={{ width: `${imagesPercent}%`, height: "100%", background: "#10b981" }} />
                </div>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.35rem", display: "block" }}>{imagesPercent}% of your files</span>
              </div>
            </div>

            {/* Documents */}
            <div className="glass-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(245, 158, 11, 0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", color: "#f59e0b" }}>📄</div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Documents</span>
                  <span style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--text-primary)" }}>{documentsCount}</span>
                </div>
              </div>
              <div>
                <div style={{ width: "100%", height: "4px", background: "var(--border-default)", borderRadius: "2px", overflow: "hidden", marginTop: "0.5rem" }}>
                  <div style={{ width: `${documentsPercent}%`, height: "100%", background: "#f59e0b" }} />
                </div>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.35rem", display: "block" }}>{documentsPercent}% of your files</span>
              </div>
            </div>
          </section>

          {/* Quick Actions & Drag Drop Section */}
          <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", width: "100%" }}>
            {/* Quick Actions */}
            <div className="glass-card animate-slide-up" style={{ padding: "1.5rem", animationDelay: "0.1s" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "1rem" }}>Quick Actions</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: "none" }} disabled={isUploading} />
                <button
                  onClick={triggerFileInput}
                  className="glass-card card-hover"
                  disabled={isUploading}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "1rem", cursor: "pointer", background: "rgba(99, 102, 241, 0.04)", gap: "0.5rem", border: "1px solid rgba(99, 102, 241, 0.1)" }}
                >
                  <span style={{ fontSize: "1.5rem" }}>📤</span>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#6366f1" }}>Upload File</span>
                </button>
                <button
                  onClick={() => alert("Creation of folders is coming soon!")}
                  className="glass-card card-hover"
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "1rem", cursor: "pointer", background: "rgba(59, 130, 246, 0.04)", gap: "0.5rem", border: "1px solid rgba(59, 130, 246, 0.1)" }}
                >
                  <span style={{ fontSize: "1.5rem" }}>📁</span>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#3b82f6" }}>New Folder</span>
                </button>
                <button
                  onClick={() => showToast("info", "Click the share icon (🔗) on any file to create a public link.")}
                  className="glass-card card-hover"
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "1rem", cursor: "pointer", background: "rgba(16, 185, 129, 0.04)", gap: "0.5rem", border: "1px solid rgba(16, 185, 129, 0.1)" }}
                >
                  <span style={{ fontSize: "1.5rem" }}>🔗</span>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#10b981" }}>Share File</span>
                </button>
              </div>
            </div>

            {/* Drag & Drop */}
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
                border: isDragActive ? "2px dashed var(--color-primary)" : "2px dashed #a855f7",
                background: isDragActive ? "rgba(99, 102, 241, 0.04)" : "rgba(168, 85, 247, 0.02)",
                cursor: "pointer",
                transition: "all 0.2s ease",
                animationDelay: "0.15s",
              }}
            >
              {isUploading ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
                  <LoadingSpinner size="md" label="Uploading file to Telegram Cloud..." />
                  {uploadProgress !== null && (
                    <div style={{ width: "260px", marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.35rem", alignItems: "center" }}>
                      <div style={{ width: "100%", height: "6px", background: "var(--border-default)", borderRadius: "3px", overflow: "hidden" }}>
                        <div
                          style={{
                            width: `${uploadProgress}%`,
                            height: "100%",
                            background: "linear-gradient(90deg, #6366f1, #a855f7)",
                            borderRadius: "3px",
                            transition: "width 0.1s ease",
                          }}
                        />
                      </div>
                      <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", textAlign: "center" }}>
                        {uploadProgress}% Uploaded ({formatBytes(uploadedBytes)} of {formatBytes(uploadingFileSize)})
                        {uploadSpeed && <span style={{ display: "block", color: "var(--color-primary)", marginTop: "0.15rem" }}>⚡ {uploadSpeed}</span>}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "2rem", color: "#a855f7" }}>📤</span>
                  <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>Drag & drop files here to upload</p>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    or click to <span style={{ color: "#a855f7", fontWeight: 600 }}>browse</span> files
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Bottom Row split */}
          <section style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem", width: "100%" }}>
            {/* Recent Files Table */}
            <div className="glass-card animate-slide-up" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", animationDelay: "0.2s" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>Recent Files</h3>
                <button
                  onClick={() => (window.location.search = "?tab=my-files")}
                  style={{ background: "none", border: "none", color: "#4f46e5", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}
                >
                  View all
                </button>
              </div>

              {/* Table Wrapper */}
              <div style={{ overflowX: "auto" }}>
                {renderFilesTable(finalFilteredFiles)}
              </div>
            </div>

            {/* Storage breakdown & Recent Activity */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {/* Storage Donut Card */}
              <div className="glass-card" style={{ padding: "1.5rem" }}>
                <h3 style={{ fontSize: "1.0rem", fontWeight: 600, marginBottom: "1rem" }}>Storage Overview</h3>
                <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
                  <div
                    style={{
                      width: "100px",
                      height: "100px",
                      borderRadius: "50%",
                      background: donutGradient,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ width: "66px", height: "66px", borderRadius: "50%", background: "var(--bg-card)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: "0.95rem", fontWeight: 800 }}>{totalUsedPercent}%</span>
                      <span style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 600 }}>Used</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                      <span style={{ color: "var(--text-secondary)" }}>🖼️ Images</span>
                      <span style={{ fontWeight: 600 }}>{formatBytes(imagesSize)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                      <span style={{ color: "var(--text-secondary)" }}>📄 Docs</span>
                      <span style={{ fontWeight: 600 }}>{formatBytes(documentsSize)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                      <span style={{ color: "var(--text-secondary)" }}>🎵 Videos</span>
                      <span style={{ fontWeight: 600 }}>{formatBytes(mediaSize)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                      <span style={{ color: "var(--text-secondary)" }}>📁 Others</span>
                      <span style={{ fontWeight: 600 }}>{formatBytes(otherSize)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="glass-card" style={{ padding: "1.5rem" }}>
                <h3 style={{ fontSize: "1.0rem", fontWeight: 600, marginBottom: "1rem" }}>Recent Activity</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                  {activeFiles.slice(0, 3).map((f) => (
                    <div key={f.id} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <span style={{ fontSize: "1rem" }}>📤</span>
                      <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {f.fileName}
                        </span>
                        <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                          {getRelativeTime(f.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {activeFiles.length === 0 && (
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center" }}>No activity recorded yet</span>
                  )}
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* My Files Tab */}
      {tab === "my-files" && (
        <div className="glass-card animate-slide-up" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>All Files ({finalFilteredFiles.length})</h3>
            <button
              onClick={triggerFileInput}
              className="btn btn-primary"
              style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
            >
              ➕ Upload File
            </button>
          </div>
          <div style={{ overflowX: "auto" }}>{renderFilesTable(finalFilteredFiles)}</div>
        </div>
      )}

      {/* Folders Tab */}
      {tab === "folders" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {selectedFolderCategory ? (
            <div className="glass-card animate-slide-up" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
                <button
                  onClick={() => setSelectedFolderCategory(null)}
                  style={{ background: "none", border: "none", color: "#6366f1", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem" }}
                >
                  📁 Folders
                </button>
                <span style={{ color: "var(--text-muted)" }}>&gt;</span>
                <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{selectedFolderCategory}</span>
              </div>
              <div style={{ overflowX: "auto" }}>{renderFilesTable(finalFilteredFiles)}</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.25rem", width: "100%" }}>
              {/* Images Folder */}
              <div
                onClick={() => setSelectedFolderCategory("images")}
                className="glass-card card-hover"
                style={{ padding: "1.5rem", cursor: "pointer", display: "flex", flexDirection: "column", gap: "0.5rem" }}
              >
                <span style={{ fontSize: "2.5rem" }}>🖼️</span>
                <h4 style={{ fontWeight: 600, fontSize: "0.95rem" }}>Images</h4>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{imagesCount} files</p>
              </div>

              {/* Documents Folder */}
              <div
                onClick={() => setSelectedFolderCategory("documents")}
                className="glass-card card-hover"
                style={{ padding: "1.5rem", cursor: "pointer", display: "flex", flexDirection: "column", gap: "0.5rem" }}
              >
                <span style={{ fontSize: "2.5rem" }}>📄</span>
                <h4 style={{ fontWeight: 600, fontSize: "0.95rem" }}>Documents</h4>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{documentsCount} files</p>
              </div>

              {/* Media Folder */}
              <div
                onClick={() => setSelectedFolderCategory("media")}
                className="glass-card card-hover"
                style={{ padding: "1.5rem", cursor: "pointer", display: "flex", flexDirection: "column", gap: "0.5rem" }}
              >
                <span style={{ fontSize: "2.5rem" }}>🎵</span>
                <h4 style={{ fontWeight: 600, fontSize: "0.95rem" }}>Media Files</h4>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{mediaCount} files</p>
              </div>

              {/* Archives Folder */}
              <div
                onClick={() => setSelectedFolderCategory("archives")}
                className="glass-card card-hover"
                style={{ padding: "1.5rem", cursor: "pointer", display: "flex", flexDirection: "column", gap: "0.5rem" }}
              >
                <span style={{ fontSize: "2.5rem" }}>📦</span>
                <h4 style={{ fontWeight: 600, fontSize: "0.95rem" }}>Archives</h4>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{archivesCount} files</p>
              </div>

              {/* Others Folder */}
              <div
                onClick={() => setSelectedFolderCategory("others")}
                className="glass-card card-hover"
                style={{ padding: "1.5rem", cursor: "pointer", display: "flex", flexDirection: "column", gap: "0.5rem" }}
              >
                <span style={{ fontSize: "2.5rem" }}>📎</span>
                <h4 style={{ fontWeight: 600, fontSize: "0.95rem" }}>Others</h4>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{othersCount} files</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Tab */}
      {tab === "recent" && (
        <div className="glass-card animate-slide-up" style={{ padding: "1.5rem" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1.25rem" }}>Recently Added Files</h3>
          <div style={{ overflowX: "auto" }}>{renderFilesTable(finalFilteredFiles)}</div>
        </div>
      )}

      {/* Favorites Tab */}
      {tab === "favorites" && (
        <div className="glass-card animate-slide-up" style={{ padding: "1.5rem" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1.25rem" }}>Favorites ({finalFilteredFiles.length})</h3>
          <div style={{ overflowX: "auto" }}>{renderFilesTable(finalFilteredFiles)}</div>
        </div>
      )}

      {/* Shared Tab */}
      {tab === "shared" && (
        <div className="glass-card animate-slide-up" style={{ padding: "1.5rem" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1.25rem" }}>Shared Public Links ({finalFilteredFiles.length})</h3>
          <div style={{ overflowX: "auto" }}>{renderFilesTable(finalFilteredFiles)}</div>
        </div>
      )}

      {/* Trash Tab */}
      {tab === "trash" && (
        <div className="glass-card animate-slide-up" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Trash Bin ({finalFilteredFiles.length})</h3>
            {finalFilteredFiles.length > 0 && (
              <button
                onClick={async () => {
                  if (confirm("Are you sure you want to permanently delete all items in the Trash? This cannot be undone.")) {
                    const deletePromises = finalFilteredFiles.map((file) =>
                      fetch(`/api/files/${file.id}?permanent=true`, { method: "DELETE" })
                    );
                    await Promise.all(deletePromises);
                    showToast("success", "Trash cleared successfully.");
                    fetchFiles();
                  }
                }}
                className="btn btn-secondary"
                style={{ padding: "0.5rem 1rem", color: "var(--color-error)", borderColor: "var(--color-error)" }}
              >
                🗑️ Clear Trash
              </button>
            )}
          </div>
          <div style={{ overflowX: "auto" }}>{renderTrashTable(finalFilteredFiles)}</div>
        </div>
      )}

      {/* Upload Progress Capsule in Bottom-Right Corner */}
      {uploadProgress !== null && uploadingFileName !== null && (
        <div
          className="glass-card animate-slide-up"
          style={{
            position: "fixed",
            bottom: "2rem",
            right: "2rem",
            width: "320px",
            padding: "1rem 1.25rem",
            zIndex: 10000,
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            background: "var(--bg-card)",
            borderColor: "var(--color-primary)",
            boxShadow: "0 10px 30px rgba(99, 102, 241, 0.15)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "var(--text-primary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "180px",
              }}
              title={uploadingFileName}
            >
              Uploading: {uploadingFileName}
            </span>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--color-primary)" }}>
              {uploadProgress}%
            </span>
          </div>

          <div style={{ width: "100%", height: "6px", background: "var(--border-default)", borderRadius: "3px", overflow: "hidden" }}>
            <div
              style={{
                width: `${uploadProgress}%`,
                height: "100%",
                background: "linear-gradient(90deg, #6366f1, #06b6d4)",
                borderRadius: "3px",
                transition: "width 0.1s ease",
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>
            <span>
              {formatBytes(uploadedBytes)} of {formatBytes(uploadingFileSize)}
            </span>
            {uploadSpeed && (
              <span style={{ fontWeight: 600, color: "var(--color-primary)" }}>
                ⚡ {uploadSpeed}
              </span>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={handleCancelUpload}
              className="btn"
              style={{
                padding: "0.25rem 0.75rem",
                fontSize: "0.75rem",
                background: "rgba(239, 68, 68, 0.08)",
                color: "var(--color-error)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                borderRadius: "var(--radius-sm)",
                fontWeight: 600,
              }}
            >
              ✕ Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // Helper renderer for standard files table
  function renderFilesTable(fileList: DBFile[]) {
    if (filesLoading && files.length === 0) {
      return (
        <div style={{ padding: "3rem 0", display: "flex", justifyContent: "center" }}>
          <LoadingSpinner size="md" label="Loading files list..." />
        </div>
      );
    }

    if (fileList.length === 0) {
      return (
        <div style={{ padding: "3rem 0", textAlign: "center" }}>
          <span style={{ fontSize: "2rem" }}>📭</span>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.5rem" }}>
            No files available in this section.
          </p>
        </div>
      );
    }

    return (
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
          {fileList.map((file) => {
            const style = getFileStyle(file.mimeType, file.fileName);
            const isDeleting = deletingIds[file.id];
            const isDownloading = downloadingIds[file.id];
            const isStarred = favorites.includes(file.id);

            return (
              <tr key={file.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                {/* Name & Icon */}
                <td style={{ padding: "0.75rem 0.5rem", maxWidth: "240px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <button
                      onClick={() => handleToggleFavorite(file.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.95rem", padding: 0 }}
                      title={isStarred ? "Remove from Favorites" : "Add to Favorites"}
                    >
                      {isStarred ? "⭐" : "☆"}
                    </button>
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

                {/* Modified */}
                <td style={{ padding: "0.75rem 0.5rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  {getRelativeTime(file.createdAt)}
                </td>

                {/* Actions */}
                <td style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>
                  <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                    <button
                      disabled={isDownloading}
                      onClick={() => handleShare(file.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.95rem" }}
                      title="Copy Share Link"
                    >
                      🔗
                    </button>
                    <button
                      disabled={isDownloading}
                      onClick={() => handleDownload(file.id, file.fileName)}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.95rem" }}
                      title="Download File"
                    >
                      {isDownloading ? "⏳" : "⬇️"}
                    </button>
                    <button
                      disabled={isDeleting}
                      onClick={() => handleMoveToTrash(file)}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.95rem" }}
                      title="Move to Trash"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

  // Helper renderer for trash bin list
  function renderTrashTable(fileList: DBFile[]) {
    if (fileList.length === 0) {
      return (
        <div style={{ padding: "3rem 0", textAlign: "center" }}>
          <span style={{ fontSize: "2rem" }}>🗑️</span>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.5rem" }}>
            Trash is empty.
          </p>
        </div>
      );
    }

    return (
      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border-default)" }}>
            <th style={{ padding: "0.75rem 0.5rem", fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600 }}>Name</th>
            <th style={{ padding: "0.75rem 0.5rem", fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600 }}>Size</th>
            <th style={{ padding: "0.75rem 0.5rem", fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600, textAlign: "right" }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {fileList.map((file) => {
            const style = getFileStyle(file.mimeType, file.fileName);
            const isDeleting = deletingIds[file.id];

            return (
              <tr key={file.id} style={{ borderBottom: "1px solid var(--border-subtle)", opacity: isDeleting ? 0.5 : 1 }}>
                {/* Name */}
                <td style={{ padding: "0.75rem 0.5rem", maxWidth: "240px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{ fontSize: "1.1rem" }}>{style.emoji}</div>
                    <span style={{ fontWeight: 500, fontSize: "0.85rem", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {file.fileName}
                    </span>
                  </div>
                </td>

                {/* Size */}
                <td style={{ padding: "0.75rem 0.5rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  {formatBytes(file.fileSize)}
                </td>

                {/* Actions */}
                <td style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>
                  <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                    <button
                      disabled={isDeleting}
                      onClick={() => handleRestoreFromTrash(file)}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.95rem" }}
                      title="Restore File"
                    >
                      ↩️
                    </button>
                    <button
                      disabled={isDeleting}
                      onClick={() => handlePermanentDelete(file.id, file.fileName)}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.95rem" }}
                      title="Delete Permanently"
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
    );
  }
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
          <LoadingSpinner size="lg" label="Loading CloudBridge Dashboard..." />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
