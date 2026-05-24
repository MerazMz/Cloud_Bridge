"use client";

import React from "react";
import { DBFile } from "@/types/file.types";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { VideoThumbnail } from "@/components/dashboard/video-thumbnail";

// 1. Exportable Helper: Classify file category
export const classifyFile = (mime: string, name: string): "image" | "document" | "media" | "archive" | "other" => {
  let mimeLower = mime?.toLowerCase() || "";
  const nameLower = name?.toLowerCase() || "";

  if (mimeLower === "application/octet-stream" || !mimeLower) {
    const ext = nameLower.split(".").pop();
    if (ext === "png" || ext === "jpg" || ext === "jpeg" || ext === "gif" || ext === "webp" || ext === "svg") {
      mimeLower = "image/" + (ext === "jpg" ? "jpeg" : ext === "svg" ? "svg+xml" : ext);
    } else if (ext === "mp4" || ext === "webm" || ext === "ogg" || ext === "mov") {
      mimeLower = "video/" + ext;
    } else if (ext === "mp3" || ext === "wav" || ext === "ogg") {
      mimeLower = "audio/" + ext;
    } else if (ext === "pdf") {
      mimeLower = "application/pdf";
    } else if (ext === "zip" || ext === "tar" || ext === "rar" || ext === "7z") {
      mimeLower = "application/zip";
    }
  }

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

// 2. Exportable Helper: Get dynamic file styles
export const getFileStyle = (mime: string, name: string) => {
  if (mime?.toLowerCase() === "folder") {
    return { bg: "rgba(251, 191, 36, 0.12)", color: "#FBBF24" };
  }
  const category = classifyFile(mime, name);
  switch (category) {
    case "image":
      return { bg: "rgba(16, 185, 129, 0.06)", color: "#10B981" };
    case "media":
      return { bg: "rgba(99, 102, 241, 0.06)", color: "#6366F1" };
    case "document":
      return { bg: "rgba(239, 68, 68, 0.06)", color: "#EF4444" };
    case "archive":
      return { bg: "rgba(245, 158, 11, 0.06)", color: "#F59E0B" };
    default:
      return { bg: "rgba(100, 116, 139, 0.06)", color: "#64748B" };
  }
};

// 3. Exportable Helper: Render premium vectors and images
export const renderFileIcon = (category: string, fileName?: string, mimeType?: string) => {
  const nameLower = fileName?.toLowerCase() || "";
  const mimeLower = mimeType?.toLowerCase() || "";

  if (mimeLower === "folder") {
    return (
      <svg style={{ width: "1.05rem", height: "1.05rem", color: "#FBBF24" }} viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 5h-8.586L9.414 3.004A2 2 0 008 2.418H4c-1.103 0-2 .897-2 2v14c0 1.103.897 2 2 2h16c1.103 0 2-.897 2-2V7c0-1.103-.897-2-2-2z" />
      </svg>
    );
  }

  if (nameLower.endsWith(".pdf") || mimeLower.includes("pdf")) {
    return (
      <img
        src="/pdf.png"
        alt="PDF"
        style={{ width: "1.2rem", height: "1.2rem", objectFit: "contain", display: "block" }}
      />
    );
  }

  if (
    nameLower.endsWith(".doc") ||
    nameLower.endsWith(".docx") ||
    nameLower.endsWith(".docs") ||
    mimeLower.includes("word") ||
    mimeLower.includes("officedocument.wordprocessingml")
  ) {
    return (
      <img
        src="/docs.png"
        alt="Word File"
        style={{ width: "1.3rem", height: "1.3rem", objectFit: "contain", display: "block" }}
      />
    );
  }

  if (nameLower.endsWith(".md") || mimeLower.includes("markdown")) {
    return (
      <img
        src="/md.png"
        alt="Markdown File"
        style={{ width: "1.3rem", height: "1.3rem", objectFit: "contain", display: "block" }}
      />
    );
  }

  if (
    nameLower.endsWith(".xls") ||
    nameLower.endsWith(".xlsx") ||
    nameLower.endsWith(".csv") ||
    mimeLower.includes("excel") ||
    mimeLower.includes("spreadsheetml") ||
    mimeLower.includes("csv")
  ) {
    return (
      <img
        src="/xls.png"
        alt="Excel File"
        style={{ width: "1.3rem", height: "1.3rem", objectFit: "contain", display: "block" }}
      />
    );
  }

  if (
    nameLower.endsWith(".zip") ||
    nameLower.endsWith(".tar") ||
    nameLower.endsWith(".rar") ||
    nameLower.endsWith(".7z") ||
    mimeLower.includes("zip") ||
    mimeLower.includes("compressed") ||
    category === "archive"
  ) {
    return (
      <img
        src="/zip.png"
        alt="ZIP"
        style={{ width: "1.25rem", height: "1.25rem", objectFit: "contain", display: "block" }}
      />
    );
  }

  if (
    nameLower.endsWith(".mp3") ||
    nameLower.endsWith(".wav") ||
    nameLower.endsWith(".ogg") ||
    nameLower.endsWith(".m4a") ||
    nameLower.endsWith(".aac") ||
    nameLower.endsWith(".flac") ||
    mimeLower.startsWith("audio/")
  ) {
    return (
      <img
        src="/audio.png"
        alt="Audio"
        style={{ width: "1.25rem", height: "1.25rem", objectFit: "contain", display: "block" }}
      />
    );
  }

  switch (category) {
    case "image":
      return (
        <svg style={{ width: "1.05rem", height: "1.05rem", color: "#10B981" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
      );
    case "media":
      return (
        <svg style={{ width: "1.05rem", height: "1.05rem", color: "#6366F1" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="23 7 16 12 23 17 23 7"/>
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
        </svg>
      );
    case "document":
      return (
        <svg style={{ width: "1.05rem", height: "1.05rem", color: "#EF4444" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      );
    case "archive":
      return (
        <svg style={{ width: "1.05rem", height: "1.05rem", color: "#F59E0B" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <path d="M12 12v6"/>
          <path d="M10 14h4"/>
          <path d="M10 16h4"/>
        </svg>
      );
    default:
      return (
        <svg style={{ width: "1.05rem", height: "1.05rem", color: "#64748B" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
        </svg>
      );
  }
};

export const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

interface FilesGridListProps {
  files: DBFile[];
  darkMode: boolean;
  viewMode: "grid" | "list";
  gridSize: number;
  favorites: string[];
  selectedActiveIds: Record<string, boolean>;
  isMultiSelectMode: boolean;
  activeMenuFileId: string | null;
  setActiveMenuFileId: (id: string | null) => void;
  hoveredFileId: string | null;
  setHoveredFileId: (id: string | null) => void;
  draggedItem: any;
  dragOverItem: any;
  mergingSourceId: string | null;
  mergingTargetId: string | null;
  isTrash?: boolean;
  filesLoading?: boolean;
  semanticSearchLoading?: boolean;
  searchTerm?: string;

  // Interaction handlers
  handleToggleSelectActive: (id: string) => void;
  setActiveDocumentViewerFileId: (id: string | null) => void;
  handleDragStart: (e: any, file: any) => void;
  handleDragEnd: () => void;
  handleDragOver: (e: any, file: any) => void;
  handleDragLeave: () => void;
  handleItemDrop: (e: any, file: any) => void;
  handleToggleFavorite: (id: string) => void;
  handleInitiateRename: (file: any) => void;
  handleOpenShareModal: (file: any) => void;
  handleMoveToTrash: (file: any) => void;
  handleDeleteFile: (id: string) => void;
  handleRestoreFile: (id: string) => void;
  handleRevokeShare: (id: string) => void;
  setIsMultiSelectMode: (b: boolean) => void;
  setSelectedActiveIds: (ids: Record<string, boolean>) => void;
  setSelectedDetailsFile: (file: any) => void;
  handleDownload: (id: string, name: string) => void;
}

export const FilesGridList = ({
  files,
  darkMode,
  viewMode,
  gridSize,
  favorites,
  selectedActiveIds,
  isMultiSelectMode,
  activeMenuFileId,
  setActiveMenuFileId,
  hoveredFileId,
  setHoveredFileId,
  draggedItem,
  dragOverItem,
  mergingSourceId,
  mergingTargetId,
  isTrash = false,
  filesLoading = false,
  semanticSearchLoading = false,
  searchTerm = "",
  handleToggleSelectActive,
  setActiveDocumentViewerFileId,
  handleDragStart,
  handleDragEnd,
  handleDragOver,
  handleDragLeave,
  handleItemDrop,
  handleToggleFavorite,
  handleInitiateRename,
  handleOpenShareModal,
  handleMoveToTrash,
  handleDeleteFile,
  handleRestoreFile,
  handleRevokeShare,
  setIsMultiSelectMode,
  setSelectedActiveIds,
  setSelectedDetailsFile,
  handleDownload,
}: FilesGridListProps) => {
  
  if ((filesLoading || semanticSearchLoading) && files.length === 0) {
    return (
      <div style={{ padding: "3rem 0", display: "flex", justifyContent: "center", width: "100%" }}>
        <LoadingSpinner size="md" label="Searching files semantically..." />
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div style={{ padding: "3rem 0", textAlign: "center", width: "100%" }}>
        <span style={{ fontSize: "2rem" }}>📭</span>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.5rem" }}>
          {searchTerm ? "No files matching your search were found." : "No files available in this section."}
        </p>
      </div>
    );
  }

  if (viewMode === "grid") {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(auto-fill, minmax(${gridSize}px, 1fr))`,
          gap: "1.2rem",
          padding: "0.25rem 0",
        }}
      >
        {files.map((file) => {
          const isStarred = favorites.includes(file.id);
          const fileStyle = getFileStyle(file.mimeType, file.fileName);

          const isImage =
            file.mimeType?.startsWith("image/") ||
            ((file.mimeType === "application/octet-stream" || !file.mimeType) &&
              /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(file.fileName));

          const isVideo =
            file.mimeType?.startsWith("video/") ||
            ((file.mimeType === "application/octet-stream" || !file.mimeType) &&
              /\.(mp4|webm|ogg|mov)$/i.test(file.fileName));

          return (
            <div
              key={file.id}
              draggable={!isTrash && !isMultiSelectMode}
              onDragStart={(e) => handleDragStart(e, file)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, file)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleItemDrop(e, file)}
              style={{
                background: (isMultiSelectMode && selectedActiveIds[file.id])
                  ? (darkMode ? "rgba(245, 158, 11, 0.12)" : "rgba(245, 158, 11, 0.06)")
                  : "transparent",
                backdropFilter: "none",
                border: (isMultiSelectMode && selectedActiveIds[file.id])
                  ? "1px solid #F59E0B"
                  : "none",
                borderRadius: "14px",
                padding: "0.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                position: "relative",
                transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                cursor: "pointer",
                width: "100%",
                zIndex: activeMenuFileId === file.id ? 50 : 1,
                boxShadow: "none",
              }}
              className={`folder-card-hover ${
                !isTrash && !isMultiSelectMode ? "dnd-draggable" : ""
              } ${draggedItem?.id === file.id ? "dnd-dragged" : ""} ${
                dragOverItem?.id === file.id ? "dnd-dragover" : ""
              } ${
                mergingSourceId === file.id ? "merge-animating" : ""
              } ${
                mergingTargetId === file.id ? "pulse-glow-animating" : ""
              }`}
              onMouseEnter={() => setHoveredFileId(file.id)}
              onMouseLeave={() => setHoveredFileId(null)}
              onClick={(e) => {
                if (isMultiSelectMode) {
                  e.stopPropagation();
                  handleToggleSelectActive(file.id);
                } else {
                  setActiveDocumentViewerFileId(file.id);
                }
              }}
            >
              {/* Image/Video Preview or Icon slot */}
              <div
                style={{
                  width: "100%",
                  height: `${gridSize * 0.72}px`,
                  borderRadius: "14px",
                  background: isVideo ? "#000" : "transparent",
                  border: "none",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  flexShrink: 0,
                }}
              >
                {isImage ? (
                  <img
                    src={`/api/files/${file.id}`}
                    alt={file.fileName}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      transition: "transform 0.3s ease",
                    }}
                    loading="lazy"
                  />
                ) : isVideo ? (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <VideoThumbnail fileId={file.id} />
                  </div>
                ) : (
                  <div
                    style={{
                      color: fileStyle.color || "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transform: "scale(2.4)",
                      transition: "transform 0.2s ease",
                    }}
                  >
                    {renderFileIcon(classifyFile(file.mimeType, file.fileName), file.fileName, file.mimeType)}
                  </div>
                )}

                {isMultiSelectMode ? (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleSelectActive(file.id);
                    }}
                    style={{
                      position: "absolute",
                      top: "0.4rem",
                      left: "0.4rem",
                      background: selectedActiveIds[file.id]
                        ? "#F59E0B"
                        : (darkMode ? "rgba(15, 23, 42, 0.6)" : "rgba(255, 255, 255, 0.75)"),
                      border: selectedActiveIds[file.id]
                        ? "1px solid #F59E0B"
                        : (darkMode ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid rgba(0, 0, 0, 0.12)"),
                      borderRadius: "4px",
                      width: "18px",
                      height: "18px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 10,
                      backdropFilter: "blur(4px)",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {selectedActiveIds[file.id] && (
                      <svg style={{ width: "0.65rem", height: "0.65rem", color: "#fff" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </div>
                ) : (
                  !isTrash && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(file.id);
                      }}
                      style={{
                        position: "absolute",
                        top: "0.4rem",
                        left: "0.4rem",
                        background: isStarred ? "rgba(245, 158, 11, 0.2)" : (darkMode ? "rgba(15, 23, 42, 0.45)" : "rgba(255, 255, 255, 0.6)"),
                        border: "1px solid " + (isStarred ? "#FFA800" : (darkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)")),
                        borderRadius: "50%",
                        width: "24px",
                        height: "24px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 10,
                        backdropFilter: "blur(4px)",
                        opacity: (hoveredFileId === file.id || isStarred) ? 1 : 0,
                        transform: (hoveredFileId === file.id || isStarred) ? "scale(1)" : "scale(0.85)",
                        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      }}
                      title={isStarred ? "Remove Star" : "Add Star"}
                    >
                      <svg style={{ width: "0.75rem", height: "0.75rem", color: isStarred ? "#FBBF24" : (darkMode ? "#94a3b8" : "#64748b") }} fill={isStarred ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                    </div>
                  )
                )}

                {/* Floating More Options context button */}
                {!isMultiSelectMode && (
                  <div
                    style={{ position: "absolute", top: "0.4rem", right: "0.4rem", zIndex: 30 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuFileId(activeMenuFileId === file.id ? null : file.id);
                    }}
                  >
                    <button
                      style={{
                        background: darkMode ? "rgba(15, 23, 42, 0.75)" : "rgba(255, 255, 255, 0.85)",
                        border: darkMode ? "none" : "1px solid rgba(0, 0, 0, 0.08)",
                        color: darkMode ? "#fff" : "#0f172a",
                        cursor: "pointer",
                        padding: "0.3rem",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backdropFilter: "blur(4px)",
                        opacity: (hoveredFileId === file.id || activeMenuFileId === file.id) ? 1 : 0,
                        transform: (hoveredFileId === file.id || activeMenuFileId === file.id) ? "scale(1)" : "scale(0.85)",
                        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      }}
                    >
                      <svg style={{ width: "0.85rem", height: "0.85rem" }} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 10.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm0-6a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm0 12a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Float dropdown outside Preview Container to completely prevent z-index clipping */}
              {activeMenuFileId === file.id && (
                <div
                  style={{
                    position: "absolute",
                    right: "0.4rem",
                    top: "2.3rem",
                    background: darkMode ? "#1e293b" : "#ffffff",
                    border: darkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)",
                    borderRadius: "8px",
                    padding: "0.3rem",
                    zIndex: 100,
                    boxShadow: darkMode ? "0 10px 15px -3px rgba(0, 0, 0, 0.3)" : "0 10px 15px -3px rgba(15, 23, 42, 0.08)",
                    minWidth: "120px",
                  }}
                >
                  {isTrash ? (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestoreFile(file.id);
                          setActiveMenuFileId(null);
                        }}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          background: "none",
                          border: "none",
                          color: darkMode ? "#ffffff" : "#0f172a",
                          fontSize: "0.74rem",
                          fontWeight: 700,
                          padding: "0.4rem 0.6rem",
                          borderRadius: "6px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          marginBottom: "0.25rem",
                        }}
                        className="dropdown-item-hover"
                      >
                        <svg style={{ width: "0.95rem", height: "0.95rem", color: "#10B981" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="23 4 23 10 17 10"/>
                          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                        </svg>
                        <span>Restore</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFile(file.id);
                          setActiveMenuFileId(null);
                        }}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          background: "none",
                          border: "none",
                          color: "#EF4444",
                          fontSize: "0.74rem",
                          fontWeight: 700,
                          padding: "0.4rem 0.6rem",
                          borderRadius: "6px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                        className="dropdown-item-hover"
                      >
                        <svg style={{ width: "0.95rem", height: "0.95rem", color: "#ef4444" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          <line x1="10" y1="11" x2="10" y2="17"/>
                          <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                        <span>Delete Forever</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMultiSelectMode(true);
                          setSelectedActiveIds({ [file.id]: true });
                          setActiveMenuFileId(null);
                        }}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          background: "none",
                          border: "none",
                          color: darkMode ? "#ffffff" : "#0f172a",
                          fontSize: "0.74rem",
                          fontWeight: 700,
                          padding: "0.4rem 0.6rem",
                          borderRadius: "6px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          marginBottom: "0.25rem",
                        }}
                        className="dropdown-item-hover"
                      >
                        <svg style={{ width: "0.8rem", height: "0.8rem", color: darkMode ? "#cbd5e1" : "#475569" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                          <polyline points="9 11 12 14 22 4"/>
                        </svg>
                        <span>Select</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDetailsFile(file);
                          setActiveMenuFileId(null);
                        }}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          background: "none",
                          border: "none",
                          color: darkMode ? "#ffffff" : "#0f172a",
                          fontSize: "0.74rem",
                          fontWeight: 700,
                          padding: "0.4rem 0.6rem",
                          borderRadius: "6px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          marginBottom: "0.25rem",
                        }}
                        className="dropdown-item-hover"
                      >
                        <svg style={{ width: "0.95rem", height: "0.95rem", color: darkMode ? "#cbd5e1" : "#475569" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="12" y1="16" x2="12" y2="12"/>
                          <line x1="12" y1="8" x2="12.01" y2="8"/>
                        </svg>
                        <span>Details</span>
                      </button>

                      {file.isShared ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRevokeShare(file.id);
                            setActiveMenuFileId(null);
                          }}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            background: "none",
                            border: "none",
                            color: "#ef4444",
                            fontSize: "0.74rem",
                            fontWeight: 700,
                            padding: "0.4rem 0.6rem",
                            borderRadius: "6px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            marginBottom: "0.25rem",
                          }}
                          className="dropdown-item-hover"
                        >
                          <svg style={{ width: "0.95rem", height: "0.95rem", color: "#ef4444" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                          </svg>
                          <span>Revoke Access</span>
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenShareModal(file);
                            setActiveMenuFileId(null);
                          }}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            background: "none",
                            border: "none",
                            color: darkMode ? "#ffffff" : "#0f172a",
                            fontSize: "0.74rem",
                            fontWeight: 700,
                            padding: "0.4rem 0.6rem",
                            borderRadius: "6px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            marginBottom: "0.25rem",
                          }}
                          className="dropdown-item-hover"
                        >
                          <svg style={{ width: "0.95rem", height: "0.95rem", color: darkMode ? "#cbd5e1" : "#475569" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                          </svg>
                          <span>Share Link</span>
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(file.id, file.fileName);
                          setActiveMenuFileId(null);
                        }}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          background: "none",
                          border: "none",
                          color: darkMode ? "#ffffff" : "#0f172a",
                          fontSize: "0.74rem",
                          fontWeight: 700,
                          padding: "0.4rem 0.6rem",
                          borderRadius: "6px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          marginBottom: "0.25rem",
                        }}
                        className="dropdown-item-hover"
                      >
                        <svg style={{ width: "0.95rem", height: "0.95rem", color: darkMode ? "#cbd5e1" : "#475569" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 3v12"/>
                        </svg>
                        <span>Download</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInitiateRename(file);
                          setActiveMenuFileId(null);
                        }}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          background: "none",
                          border: "none",
                          color: darkMode ? "#ffffff" : "#0f172a",
                          fontSize: "0.74rem",
                          fontWeight: 700,
                          padding: "0.4rem 0.6rem",
                          borderRadius: "6px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          marginBottom: "0.25rem",
                        }}
                        className="dropdown-item-hover"
                      >
                        <svg style={{ width: "0.95rem", height: "0.95rem", color: darkMode ? "#cbd5e1" : "#475569" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z" />
                        </svg>
                        <span>Rename</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveToTrash(file);
                          setActiveMenuFileId(null);
                        }}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          background: "none",
                          border: "none",
                          color: "#EF4444",
                          fontSize: "0.74rem",
                          fontWeight: 700,
                          padding: "0.4rem 0.6rem",
                          borderRadius: "6px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                        className="dropdown-item-hover"
                      >
                        <svg style={{ width: "0.95rem", height: "0.95rem", color: "#EF4444" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                        <span>Delete</span>
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Title & Metadata Details */}
              <div style={{ display: "flex", flexDirection: "column", padding: "0.25rem 0.35rem 0.35rem 0.35rem" }}>
                <span
                  title={file.fileName}
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {file.fileName}
                </span>
                <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 500, marginTop: "0.1rem" }}>
                  {formatBytes(file.fileSize)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // --- LIST VIEW ---
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
      {files.map((file) => {
        const isStarred = favorites.includes(file.id);
        const fileStyle = getFileStyle(file.mimeType, file.fileName);

        return (
          <div
            key={file.id}
            draggable={!isTrash && !isMultiSelectMode}
            onDragStart={(e) => handleDragStart(e, file)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, file)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleItemDrop(e, file)}
            onClick={(e) => {
              if (isMultiSelectMode) {
                e.stopPropagation();
                handleToggleSelectActive(file.id);
              } else {
                setActiveDocumentViewerFileId(file.id);
              }
            }}
            style={{
              padding: "0.55rem 0.85rem",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.85rem",
              transition: "all 0.2s ease",
              cursor: "pointer",
              background: (isMultiSelectMode && selectedActiveIds[file.id])
                ? (darkMode ? "rgba(245, 158, 11, 0.12)" : "rgba(245, 158, 11, 0.06)")
                : "transparent",
              border: (isMultiSelectMode && selectedActiveIds[file.id])
                ? "1px solid #F59E0B"
                : "1px solid transparent",
            }}
            className={`dropdown-item-hover ${
              !isTrash && !isMultiSelectMode ? "dnd-draggable" : ""
            } ${draggedItem?.id === file.id ? "dnd-dragged" : ""} ${
              dragOverItem?.id === file.id ? "dnd-dragover" : ""
            } ${
              mergingSourceId === file.id ? "merge-animating" : ""
            } ${
              mergingTargetId === file.id ? "pulse-glow-animating" : ""
            }`}
            onMouseEnter={() => setHoveredFileId(file.id)}
            onMouseLeave={() => setHoveredFileId(null)}
          >
            {/* Left slot: Checkbox/Icon & Details */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0, flex: 1 }}>
              {isMultiSelectMode ? (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleSelectActive(file.id);
                  }}
                  style={{
                    background: selectedActiveIds[file.id]
                      ? "#F59E0B"
                      : (darkMode ? "rgba(255, 255, 255, 0.03)" : "rgba(15, 23, 42, 0.04)"),
                    border: selectedActiveIds[file.id]
                      ? "1px solid #F59E0B"
                      : (darkMode ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid rgba(0, 0, 0, 0.12)"),
                    borderRadius: "4px",
                    width: "16px",
                    height: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "all 0.15s ease",
                  }}
                >
                  {selectedActiveIds[file.id] && (
                    <svg style={{ width: "0.6rem", height: "0.6rem", color: "#fff" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </div>
              ) : (
                !isTrash && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(file.id);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: isStarred ? "#FBBF24" : (darkMode ? "#475569" : "#94a3b8"),
                      transition: "all 0.2s ease",
                      flexShrink: 0,
                    }}
                    title={isStarred ? "Remove Star" : "Add Star"}
                  >
                    <svg style={{ width: "0.85rem", height: "0.85rem" }} fill={isStarred ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                  </button>
                )
              )}

              {/* Vector Icon */}
              <div
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "8px",
                  background: fileStyle.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.95rem",
                  flexShrink: 0,
                }}
              >
                {renderFileIcon(classifyFile(file.mimeType, file.fileName), file.fileName, file.mimeType)}
              </div>

              {/* File Title and Date details */}
              <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                <span
                  title={file.fileName}
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {file.fileName}
                </span>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.05rem" }}>
                  <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 500 }}>
                    {formatBytes(file.fileSize)}
                  </span>
                  <span style={{ width: "2.5px", height: "2.5px", borderRadius: "50%", background: "var(--text-muted)", opacity: 0.4 }} />
                  <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 500 }}>
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

            {/* Right slot: Quick Action options button */}
            {!isMultiSelectMode && (
              <div
                style={{ position: "relative" }}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenuFileId(activeMenuFileId === file.id ? null : file.id);
                }}
              >
                <button
                  style={{
                    background: "none",
                    border: "none",
                    color: darkMode ? "#cbd5e1" : "#475569",
                    cursor: "pointer",
                    padding: "0.25rem",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s ease",
                  }}
                  className="dropdown-item-hover"
                >
                  <svg style={{ width: "0.85rem", height: "0.85rem" }} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 10.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm0-6a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm0 12a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z" />
                  </svg>
                </button>

                {activeMenuFileId === file.id && (
                  <div
                    style={{
                      position: "absolute",
                      right: "0px",
                      top: "1.75rem",
                      background: darkMode ? "#1e293b" : "#ffffff",
                      border: darkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)",
                      borderRadius: "8px",
                      padding: "0.3rem",
                      zIndex: 100,
                      boxShadow: darkMode ? "0 10px 15px -3px rgba(0, 0, 0, 0.3)" : "0 10px 15px -3px rgba(15, 23, 42, 0.08)",
                      minWidth: "120px",
                    }}
                  >
                    {isTrash ? (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestoreFile(file.id);
                            setActiveMenuFileId(null);
                          }}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            background: "none",
                            border: "none",
                            color: darkMode ? "#ffffff" : "#0f172a",
                            fontSize: "0.74rem",
                            fontWeight: 700,
                            padding: "0.4rem 0.6rem",
                            borderRadius: "6px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            marginBottom: "0.25rem",
                          }}
                          className="dropdown-item-hover"
                        >
                          <svg style={{ width: "0.95rem", height: "0.95rem", color: "#10B981" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="23 4 23 10 17 10"/>
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                          </svg>
                          <span>Restore</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFile(file.id);
                            setActiveMenuFileId(null);
                          }}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            background: "none",
                            border: "none",
                            color: "#EF4444",
                            fontSize: "0.74rem",
                            fontWeight: 700,
                            padding: "0.4rem 0.6rem",
                            borderRadius: "6px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                          className="dropdown-item-hover"
                        >
                          <svg style={{ width: "0.95rem", height: "0.95rem", color: "#ef4444" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            <line x1="10" y1="11" x2="10" y2="17"/>
                            <line x1="14" y1="11" x2="14" y2="17"/>
                          </svg>
                          <span>Delete Forever</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsMultiSelectMode(true);
                            setSelectedActiveIds({ [file.id]: true });
                            setActiveMenuFileId(null);
                          }}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            background: "none",
                            border: "none",
                            color: darkMode ? "#ffffff" : "#0f172a",
                            fontSize: "0.74rem",
                            fontWeight: 700,
                            padding: "0.4rem 0.6rem",
                            borderRadius: "6px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            marginBottom: "0.25rem",
                          }}
                          className="dropdown-item-hover"
                        >
                          <svg style={{ width: "0.8rem", height: "0.8rem", color: darkMode ? "#cbd5e1" : "#475569" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <polyline points="9 11 12 14 22 4"/>
                          </svg>
                          <span>Select</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDetailsFile(file);
                            setActiveMenuFileId(null);
                          }}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            background: "none",
                            border: "none",
                            color: darkMode ? "#ffffff" : "#0f172a",
                            fontSize: "0.74rem",
                            fontWeight: 700,
                            padding: "0.4rem 0.6rem",
                            borderRadius: "6px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            marginBottom: "0.25rem",
                          }}
                          className="dropdown-item-hover"
                        >
                          <svg style={{ width: "0.95rem", height: "0.95rem", color: darkMode ? "#cbd5e1" : "#475569" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="16" x2="12" y2="12"/>
                            <line x1="12" y1="8" x2="12.01" y2="8"/>
                          </svg>
                          <span>Details</span>
                        </button>

                        {file.isShared ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRevokeShare(file.id);
                              setActiveMenuFileId(null);
                            }}
                            style={{
                              width: "100%",
                              textAlign: "left",
                              background: "none",
                              border: "none",
                              color: "#ef4444",
                              fontSize: "0.74rem",
                              fontWeight: 700,
                              padding: "0.4rem 0.6rem",
                              borderRadius: "6px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              marginBottom: "0.25rem",
                            }}
                            className="dropdown-item-hover"
                          >
                            <svg style={{ width: "0.95rem", height: "0.95rem", color: "#ef4444" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                            <span>Revoke Access</span>
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenShareModal(file);
                              setActiveMenuFileId(null);
                            }}
                            style={{
                              width: "100%",
                              textAlign: "left",
                              background: "none",
                              border: "none",
                              color: darkMode ? "#ffffff" : "#0f172a",
                              fontSize: "0.74rem",
                              fontWeight: 700,
                              padding: "0.4rem 0.6rem",
                              borderRadius: "6px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              marginBottom: "0.25rem",
                            }}
                            className="dropdown-item-hover"
                          >
                            <svg style={{ width: "0.95rem", height: "0.95rem", color: darkMode ? "#cbd5e1" : "#475569" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                            </svg>
                            <span>Share Link</span>
                          </button>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(file.id, file.fileName);
                            setActiveMenuFileId(null);
                          }}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            background: "none",
                            border: "none",
                            color: darkMode ? "#ffffff" : "#0f172a",
                            fontSize: "0.74rem",
                            fontWeight: 700,
                            padding: "0.4rem 0.6rem",
                            borderRadius: "6px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            marginBottom: "0.25rem",
                          }}
                          className="dropdown-item-hover"
                        >
                          <svg style={{ width: "0.95rem", height: "0.95rem", color: darkMode ? "#cbd5e1" : "#475569" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 3v12"/>
                          </svg>
                          <span>Download</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInitiateRename(file);
                            setActiveMenuFileId(null);
                          }}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            background: "none",
                            border: "none",
                            color: darkMode ? "#ffffff" : "#0f172a",
                            fontSize: "0.74rem",
                            fontWeight: 700,
                            padding: "0.4rem 0.6rem",
                            borderRadius: "6px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            marginBottom: "0.25rem",
                          }}
                          className="dropdown-item-hover"
                        >
                          <svg style={{ width: "0.95rem", height: "0.95rem", color: darkMode ? "#cbd5e1" : "#475569" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z" />
                          </svg>
                          <span>Rename</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveToTrash(file);
                            setActiveMenuFileId(null);
                          }}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            background: "none",
                            border: "none",
                            color: "#EF4444",
                            fontSize: "0.74rem",
                            fontWeight: 700,
                            padding: "0.4rem 0.6rem",
                            borderRadius: "6px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                          className="dropdown-item-hover"
                        >
                          <svg style={{ width: "0.95rem", height: "0.95rem", color: "#EF4444" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                          <span>Delete</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
