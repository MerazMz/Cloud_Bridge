"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { LoadingSpinner } from "../ui/loading-spinner";
import { useToast } from "@/components/ui/toast";

import { DBFile } from "@/types/file.types";

interface FileExplorerProps {
  files: DBFile[];
  onUpload: (file: File) => Promise<void>;
  onDownload: (fileId: string, fileName: string) => Promise<void>;
  onDelete: (fileId: string) => Promise<void>;
  isUploading: boolean;
}

type CategoryType = "all" | "image" | "document" | "media" | "archive" | "other";
type ViewMode = "list" | "grid";
type SortOption = "date-desc" | "date-asc" | "size-desc" | "size-asc" | "name-asc" | "name-desc";

export function FileExplorer({
  files,
  onUpload,
  onDownload,
  onDelete,
  isUploading,
}: FileExplorerProps) {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryType>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [sortBy, setSortBy] = useState<SortOption>("date-desc");
  const [isDragActive, setIsDragActive] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({});
  const [downloadingIds, setDownloadingIds] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File size formatting helper
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  // Classify file category
  const classifyFile = (mime: string, name: string): CategoryType => {
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

  // Get dynamic file icon based on category and mimeType
  const getFileIcon = (mime: string, name: string): string => {
    const category = classifyFile(mime, name);
    switch (category) {
      case "image":
        return "🖼️";
      case "media":
        return mime.toLowerCase().startsWith("video/") ? "🎥" : "🎵";
      case "document":
        return mime.toLowerCase().includes("pdf") ? "📕" : "📄";
      case "archive":
        return "📦";
      default:
        return "📁";
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
      await onUpload(file);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await onUpload(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Action handlers
  const handleDownload = async (fileId: string, fileName: string) => {
    setDownloadingIds((prev) => ({ ...prev, [fileId]: true }));
    try {
      await onDownload(fileId, fileName);
    } finally {
      setDownloadingIds((prev) => ({ ...prev, [fileId]: false }));
    }
  };

  const handleDelete = async (fileId: string) => {
    setDeletingIds((prev) => ({ ...prev, [fileId]: true }));
    try {
      await onDelete(fileId);
    } finally {
      setDeletingIds((prev) => ({ ...prev, [fileId]: false }));
    }
  };

  const handleShare = async (fileId: string) => {
    try {
      const sharedUrl = `${window.location.origin}/api/files/shared/${fileId}`;
      await navigator.clipboard.writeText(sharedUrl);
      showToast("success", "Shareable link copied to clipboard!");
    } catch (err) {
      showToast("error", "Failed to copy share link.");
    }
  };

  // Filtered files based on Search and Category
  const filteredFiles = files
    .filter((file) => {
      const matchesSearch = file.fileName.toLowerCase().includes(searchTerm.toLowerCase());
      if (activeCategory === "all") return matchesSearch;
      const fileCategory = classifyFile(file.mimeType, file.fileName);
      return matchesSearch && fileCategory === activeCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "date-asc":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "size-desc":
          return b.fileSize - a.fileSize;
        case "size-asc":
          return a.fileSize - b.fileSize;
        case "name-asc":
          return a.fileName.localeCompare(b.fileName, undefined, { sensitivity: "base" });
        case "name-desc":
          return b.fileName.localeCompare(a.fileName, undefined, { sensitivity: "base" });
        default:
          return 0;
      }
    });

  // Storage Stats
  const totalStorage = files.reduce((acc, file) => acc + file.fileSize, 0);

  // Group files count by category
  const categoriesCount = files.reduce(
    (acc, file) => {
      const cat = classifyFile(file.mimeType, file.fileName);
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    },
    { all: files.length, image: 0, document: 0, media: 0, archive: 0, other: 0 } as Record<
      CategoryType,
      number
    >
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Stats and Search Summary Header */}
      <div
        className="glass-card animate-slide-up"
        style={{
          padding: "1.5rem",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1.5rem",
          animationDelay: "0.2s",
          opacity: 0,
          animationFillMode: "forwards",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Total Files
          </span>
          <span style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-primary)" }}>
            {files.length}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Storage Used
          </span>
          <span style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-primary)" }}>
            {formatBytes(totalStorage)}
          </span>
        </div>
      </div>

      {/* Upload Area */}
      <div
        className="glass-card animate-slide-up"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        style={{
          padding: "2.5rem 2rem",
          borderRadius: "var(--radius-xl)",
          border: isDragActive
            ? "2px dashed var(--color-primary)"
            : "2px dashed var(--border-default)",
          backgroundColor: isDragActive ? "rgba(99, 102, 241, 0.05)" : "var(--glass-bg)",
          textAlign: "center",
          cursor: "pointer",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          position: "relative",
          animationDelay: "0.25s",
          opacity: 0,
          animationFillMode: "forwards",
        }}
        onClick={triggerFileInput}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: "none" }}
          disabled={isUploading}
        />

        {isUploading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
            <LoadingSpinner size="lg" label="Uploading file securely to your private Telegram..." />
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "2.75rem", transition: "transform 0.2s", transform: isDragActive ? "scale(1.15)" : "scale(1)" }}>
              📤
            </span>
            <div>
              <p style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "1.05rem" }}>
                {isDragActive ? "Drop your file here!" : "Drag & Drop your files here"}
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
                or click to browse files
              </p>
            </div>
            <span
              style={{
                fontSize: "0.75rem",
                color: "var(--text-secondary)",
                background: "rgba(255, 255, 255, 0.04)",
                padding: "0.3rem 0.6rem",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              Files are sent as documents to preserve raw quality
            </span>
          </div>
        )}
      </div>

      {/* Control Bar: Search, Category Filters, Sort, View Toggle */}
      <div
        className="glass-card animate-slide-up"
        style={{
          padding: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          animationDelay: "0.3s",
          opacity: 0,
          animationFillMode: "forwards",
        }}
      >
        {/* Search, Sort, View Toggle row */}
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
          {/* Search Box */}
          <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
            <span style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.9rem" }}>
              🔍
            </span>
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
              style={{
                paddingLeft: "2.25rem",
                fontSize: "0.9rem",
                height: "40px",
                margin: 0,
              }}
            />
          </div>

          {/* Sort Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
              Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="input-field"
              style={{
                height: "40px",
                padding: "0 2rem 0 0.75rem",
                fontSize: "0.85rem",
                margin: 0,
                width: "160px",
                cursor: "pointer",
                backgroundPosition: "right 0.5rem center",
              }}
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="size-desc">Largest Size</option>
              <option value="size-asc">Smallest Size</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
            </select>
          </div>

          {/* View Mode Switcher */}
          <div
            style={{
              display: "flex",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              padding: "2px",
            }}
          >
            <button
              onClick={() => setViewMode("list")}
              style={{
                padding: "0.5rem",
                background: viewMode === "list" ? "rgba(99, 102, 241, 0.15)" : "transparent",
                border: "none",
                borderRadius: "var(--radius-xs)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: viewMode === "list" ? "var(--color-primary)" : "var(--text-muted)",
                fontSize: "0.9rem",
                width: "36px",
                height: "32px",
                transition: "all 0.2s ease",
              }}
              title="List View"
            >
              📄
            </button>
            <button
              onClick={() => setViewMode("grid")}
              style={{
                padding: "0.5rem",
                background: viewMode === "grid" ? "rgba(99, 102, 241, 0.15)" : "transparent",
                border: "none",
                borderRadius: "var(--radius-xs)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: viewMode === "grid" ? "var(--color-primary)" : "var(--text-muted)",
                fontSize: "0.9rem",
                width: "36px",
                height: "32px",
                transition: "all 0.2s ease",
              }}
              title="Grid View"
            >
              ⏹️
            </button>
          </div>
        </div>

        {/* Categories filters scrollable pills */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            overflowX: "auto",
            paddingBottom: "4px",
            scrollbarWidth: "none",
          }}
        >
          {(
            [
              { id: "all", label: "All Files", emoji: "📁" },
              { id: "image", label: "Images", emoji: "🖼️" },
              { id: "document", label: "Documents", emoji: "📄" },
              { id: "media", label: "Media", emoji: "🎵" },
              { id: "archive", label: "Archives", emoji: "📦" },
              { id: "other", label: "Others", emoji: "📎" },
            ] as const
          ).map((cat) => {
            const count = categoriesCount[cat.id];
            const isSelected = activeCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.4rem 0.9rem",
                  borderRadius: "20px",
                  fontSize: "0.8rem",
                  fontWeight: isSelected ? 600 : 500,
                  whiteSpace: "nowrap",
                  background: isSelected
                    ? "linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%)"
                    : "rgba(255, 255, 255, 0.03)",
                  border: isSelected
                    ? "1px solid transparent"
                    : "1px solid var(--border-subtle)",
                  color: isSelected ? "#ffffff" : "var(--text-secondary)",
                  cursor: "pointer",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
                <span
                  style={{
                    fontSize: "0.7rem",
                    padding: "0.1rem 0.4rem",
                    borderRadius: "10px",
                    background: isSelected ? "rgba(255, 255, 255, 0.25)" : "rgba(255, 255, 255, 0.05)",
                    color: isSelected ? "#ffffff" : "var(--text-muted)",
                    marginLeft: "0.2rem",
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Files List / Grid Container */}
      <div
        className="animate-slide-up"
        style={{
          animationDelay: "0.35s",
          opacity: 0,
          animationFillMode: "forwards",
        }}
      >
        {filteredFiles.length > 0 ? (
          viewMode === "list" ? (
            /* LIST VIEW */
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {filteredFiles.map((file) => {
                const isDeleting = deletingIds[file.id];
                const isDownloading = downloadingIds[file.id];

                return (
                  <div
                    key={file.id}
                    className="glass-card"
                    style={{
                      padding: "1rem 1.25rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "1rem",
                      transition: "transform 0.2s ease, border-color 0.2s ease",
                      border: isDeleting
                        ? "1px solid var(--color-error)"
                        : "1px solid var(--glass-border)",
                      opacity: isDeleting ? 0.6 : 1,
                    }}
                  >
                    {/* File Icon & Info */}
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: "44px",
                          height: "44px",
                          borderRadius: "var(--radius-md)",
                          background: "rgba(255, 255, 255, 0.03)",
                          border: "1px solid var(--border-subtle)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1.4rem",
                          flexShrink: 0,
                        }}
                      >
                        {getFileIcon(file.mimeType, file.fileName)}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p
                          title={file.fileName}
                          style={{
                            fontWeight: 600,
                            color: "var(--text-primary)",
                            fontSize: "0.95rem",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {file.fileName}
                        </p>
                        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginTop: "0.25rem" }}>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                            {formatBytes(file.fileSize)}
                          </span>
                          <span
                            style={{
                              width: "3px",
                              height: "3px",
                              borderRadius: "50%",
                              background: "var(--text-muted)",
                            }}
                          />
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            {new Date(file.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* File Actions */}
                    <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                      <button
                        disabled={isDeleting || isDownloading}
                        className="btn btn-secondary"
                        style={{
                          padding: 0,
                          width: "36px",
                          height: "36px",
                          borderRadius: "var(--radius-sm)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        onClick={() => handleShare(file.id)}
                        title="Copy Share Link"
                      >
                        🔗
                      </button>
                      <button
                        disabled={isDeleting || isDownloading}
                        className="btn btn-secondary"
                        style={{
                          padding: 0,
                          width: "36px",
                          height: "36px",
                          borderRadius: "var(--radius-sm)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        onClick={() => handleDownload(file.id, file.fileName)}
                        title="Download File"
                      >
                        {isDownloading ? <LoadingSpinner size="sm" /> : "⬇️"}
                      </button>
                      <button
                        disabled={isDeleting || isDownloading}
                        className="btn btn-secondary"
                        style={{
                          padding: 0,
                          width: "36px",
                          height: "36px",
                          borderRadius: "var(--radius-sm)",
                          borderColor: "rgba(239, 68, 68, 0.2)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        onClick={() => handleDelete(file.id)}
                        title="Delete File"
                      >
                        {isDeleting ? <LoadingSpinner size="sm" /> : "🗑️"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* GRID VIEW */
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: "1rem",
              }}
            >
              {filteredFiles.map((file) => {
                const isDeleting = deletingIds[file.id];
                const isDownloading = downloadingIds[file.id];

                return (
                  <div
                    key={file.id}
                    className="glass-card card-hover"
                    style={{
                      padding: "1.25rem",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      textAlign: "center",
                      border: isDeleting
                        ? "1px solid var(--color-error)"
                        : "1px solid var(--glass-border)",
                      opacity: isDeleting ? 0.6 : 1,
                      position: "relative",
                      transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    }}
                  >
                    {/* Big File Icon */}
                    <div
                      style={{
                        width: "60px",
                        height: "60px",
                        borderRadius: "var(--radius-lg)",
                        background: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid var(--border-subtle)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "2.25rem",
                        marginBottom: "0.75rem",
                      }}
                    >
                      {getFileIcon(file.mimeType, file.fileName)}
                    </div>

                    {/* File Name */}
                    <p
                      title={file.fileName}
                      style={{
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        fontSize: "0.85rem",
                        width: "100%",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        marginBottom: "0.25rem",
                      }}
                    >
                      {file.fileName}
                    </p>

                    {/* Size and Date */}
                    <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: "0.15rem" }}>
                      {formatBytes(file.fileSize)}
                    </span>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                      {new Date(file.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>

                    {/* Grid Action Buttons */}
                    <div style={{ display: "flex", gap: "0.4rem", marginTop: "auto", width: "100%" }}>
                      <button
                        disabled={isDeleting || isDownloading}
                        className="btn btn-secondary"
                        style={{
                          flex: 1,
                          padding: 0,
                          height: "32px",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "0.85rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        onClick={() => handleShare(file.id)}
                        title="Copy Share Link"
                      >
                        🔗
                      </button>
                      <button
                        disabled={isDeleting || isDownloading}
                        className="btn btn-secondary"
                        style={{
                          flex: 1,
                          padding: 0,
                          height: "32px",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "0.85rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        onClick={() => handleDownload(file.id, file.fileName)}
                        title="Download File"
                      >
                        {isDownloading ? <LoadingSpinner size="sm" /> : "⬇️"}
                      </button>
                      <button
                        disabled={isDeleting || isDownloading}
                        className="btn btn-secondary"
                        style={{
                          flex: 1,
                          padding: 0,
                          height: "32px",
                          borderRadius: "var(--radius-sm)",
                          borderColor: "rgba(239, 68, 68, 0.2)",
                          fontSize: "0.85rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        onClick={() => handleDelete(file.id)}
                        title="Delete File"
                      >
                        {isDeleting ? <LoadingSpinner size="sm" /> : "🗑️"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* EMPTY STATE */
          <div
            className="glass-card"
            style={{
              padding: "4rem 1.5rem",
              textAlign: "center",
              border: "1px dashed var(--border-default)",
            }}
          >
            <span style={{ fontSize: "2.5rem" }}>📭</span>
            <p style={{ color: "var(--text-secondary)", fontSize: "1rem", marginTop: "0.75rem", fontWeight: 500 }}>
              {searchTerm || activeCategory !== "all"
                ? "No files match your filters"
                : "Your storage is empty"}
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "0.25rem" }}>
              {searchTerm || activeCategory !== "all"
                ? "Try changing your search term or selecting another category"
                : "Drag and drop some files above to start saving securely on Telegram!"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
