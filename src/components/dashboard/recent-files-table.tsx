"use client";

import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { DBFile } from "@/types/file.types";
import { VideoThumbnail } from "./video-thumbnail";

interface RecentFilesTableProps {
  fileList: DBFile[];
  filesLoading: boolean;
  deletingIds: Record<string, boolean>;
  downloadingIds: Record<string, boolean>;
  favorites: string[];
  handleToggleFavorite: (id: string) => void;
  handleShare: (id: string) => void;
  handleRevokeShare: (id: string) => void;
  handleDownload: (id: string, name: string) => void;
  handleMoveToTrash: (file: DBFile) => void;
  getFileStyle: (mime: string, name: string) => { bg: string; color: string };
  classifyFile: (mime: string, name: string) => string;
  renderFileIcon: (category: string, fileName?: string, mimeType?: string) => React.ReactNode;
  formatBytes: (bytes: number) => string;
  getRelativeTime: (date: string) => string;
  activeMenuFileId: string | null;
  setActiveMenuFileId: (id: string | null) => void;
  darkMode?: boolean;
  onFileClick?: (file: DBFile) => void;
  onRenameClick?: (file: DBFile) => void;
  isMultiSelectMode?: boolean;
  selectedActiveIds?: Record<string, boolean>;
  handleToggleSelectActive?: (id: string) => void;
  handleToggleSelectAllActive?: (fileList: DBFile[]) => void;
  onSelectClick?: (file: DBFile) => void;

  // Drag & Drop Props
  tab?: string;
  onDragStart?: (e: React.DragEvent, item: DBFile) => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent, item: DBFile) => void;
  onDragLeave?: () => void;
  onDrop?: (e: React.DragEvent, item: DBFile) => void;
  draggedItem?: DBFile | null;
  dragOverItem?: DBFile | null;
}

export function RecentFilesTable({
  fileList,
  filesLoading,
  deletingIds,
  downloadingIds,
  favorites,
  handleToggleFavorite,
  handleShare,
  handleRevokeShare,
  handleDownload,
  handleMoveToTrash,
  getFileStyle,
  classifyFile,
  renderFileIcon,
  formatBytes,
  getRelativeTime,
  activeMenuFileId,
  setActiveMenuFileId,
  darkMode = false,
  onFileClick,
  onRenameClick,
  isMultiSelectMode = false,
  selectedActiveIds = {},
  handleToggleSelectActive,
  handleToggleSelectAllActive,
  onSelectClick,
  tab = "dashboard",
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  draggedItem = null,
  dragOverItem = null,
}: RecentFilesTableProps) {
  if (filesLoading && fileList.length === 0) {
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
        <p style={{ color: darkMode ? "#94a3b8" : "#64748b", fontSize: "0.85rem", marginTop: "0.5rem" }}>
          No files available in this section.
        </p>
      </div>
    );
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
      <thead>
        <tr style={{ borderBottom: darkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)" }}>
          {isMultiSelectMode && (
            <th style={{ padding: "0.85rem 0.5rem", width: "40px" }}>
              <input
                type="checkbox"
                checked={fileList.length > 0 && fileList.every((f) => selectedActiveIds[f.id])}
                onChange={() => handleToggleSelectAllActive?.(fileList)}
                style={{
                  width: "16px",
                  height: "16px",
                  accentColor: "#F59E0B",
                  cursor: "pointer",
                }}
              />
            </th>
          )}
          <th style={{ padding: "0.85rem 0.5rem", fontSize: "0.78rem", color: darkMode ? "#94a3b8" : "#64748b", fontWeight: 600 }}>Name</th>
          <th style={{ padding: "0.85rem 0.5rem", fontSize: "0.78rem", color: darkMode ? "#94a3b8" : "#64748b", fontWeight: 600 }}>Type</th>
          <th style={{ padding: "0.85rem 0.5rem", fontSize: "0.78rem", color: darkMode ? "#94a3b8" : "#64748b", fontWeight: 600 }}>Size</th>
          <th style={{ padding: "0.85rem 0.5rem", fontSize: "0.78rem", color: darkMode ? "#94a3b8" : "#64748b", fontWeight: 600 }}>Modified</th>
          <th style={{ padding: "0.85rem 0.5rem", fontSize: "0.78rem", color: darkMode ? "#94a3b8" : "#64748b", fontWeight: 600, textAlign: "right" }}>Action</th>
        </tr>
      </thead>
      <tbody>
        {fileList.map((file) => {
          const cat = classifyFile(file.mimeType, file.fileName);
          const style = getFileStyle(file.mimeType, file.fileName);
          const isDeleting = deletingIds[file.id];
          const isDownloading = downloadingIds[file.id];
          const isStarred = favorites.includes(file.id);
          const ext = file.fileName.split(".").pop()?.toUpperCase() || "FILE";

          return (
            <tr
              key={file.id}
              draggable={tab === "my-files"}
              onDragStart={(e) => onDragStart?.(e, file)}
              onDragEnd={onDragEnd}
              onDragOver={(e) => onDragOver?.(e, file)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop?.(e, file)}
              onClick={(e) => {
                if (isMultiSelectMode) {
                  e.stopPropagation();
                  handleToggleSelectActive?.(file.id);
                } else {
                  onFileClick?.(file);
                }
              }}
              style={{
                borderBottom: darkMode ? "1px solid rgba(255, 255, 255, 0.06)" : "1px solid rgba(0, 0, 0, 0.05)",
                cursor: "pointer",
                background: (isMultiSelectMode && selectedActiveIds[file.id])
                  ? (darkMode ? "rgba(245, 158, 11, 0.08)" : "rgba(245, 158, 11, 0.04)")
                  : "transparent",
              }}
              className={`folder-card-hover ${
                tab === "my-files" ? "dnd-draggable" : ""
              } ${draggedItem?.id === file.id ? "dnd-dragged" : ""} ${
                dragOverItem?.id === file.id ? "dnd-dragover" : ""
              }`}
            >
              {isMultiSelectMode && (
                <td style={{ padding: "0.85rem 0.5rem", width: "40px" }} onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={!!selectedActiveIds[file.id]}
                    onChange={() => handleToggleSelectActive?.(file.id)}
                    style={{
                      width: "16px",
                      height: "16px",
                      accentColor: "#F59E0B",
                      cursor: "pointer",
                    }}
                  />
                </td>
              )}
              {/* Star, Name & Icon */}
              <td style={{ padding: "0.85rem 0.5rem", maxWidth: "260px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(file.id);
                    }}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
                    title={isStarred ? "Remove from Favorites" : "Add to Favorites"}
                  >
                    {isStarred ? (
                      <svg style={{ width: "1.05rem", height: "1.05rem", color: "#FBBF24" }} viewBox="0 0 24 24" fill="currentColor" stroke="#D97706" strokeWidth="1.5">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                    ) : (
                      <svg style={{ width: "1.05rem", height: "1.05rem", color: darkMode ? "#475569" : "#cbd5e1" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                    )}
                  </button>
                  {(() => {
                    const isImage = 
                      file.mimeType.startsWith("image/") || 
                      ((file.mimeType === "application/octet-stream" || !file.mimeType) && 
                       /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(file.fileName));

                    const isVideo = 
                      file.mimeType.startsWith("video/") || 
                      ((file.mimeType === "application/octet-stream" || !file.mimeType) && 
                       /\.(mp4|webm|ogg|mov)$/i.test(file.fileName));

                    if (isImage) {
                      return (
                        <div
                          style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "6px",
                            overflow: "hidden",
                            border: darkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: darkMode ? "rgba(30, 41, 59, 0.6)" : "#f1f5f9",
                            flexShrink: 0,
                          }}
                        >
                          <img
                            src={`/api/files/${file.id}`}
                            alt={file.fileName}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                            loading="lazy"
                          />
                        </div>
                      );
                    }

                    if (isVideo) {
                      return (
                        <div
                          style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "6px",
                            overflow: "hidden",
                            border: darkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "#000000",
                            flexShrink: 0,
                          }}
                        >
                          <VideoThumbnail fileId={file.id} />
                        </div>
                      );
                    }

                    return (
                      <div
                        style={{
                          width: "30px",
                          height: "30px",
                          borderRadius: "6px",
                          background: style.bg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {renderFileIcon(cat, file.fileName, file.mimeType)}
                      </div>
                    );
                  })()}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem", overflow: "hidden" }}>
                    <span
                      title={file.fileName}
                      style={{
                        fontWeight: 700,
                        fontSize: "0.82rem",
                        color: "var(--text-primary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {file.fileName}
                    </span>
                  </div>
                  <span
                    title={file.fileName}
                    style={{
                      fontWeight: 700,
                      fontSize: "0.82rem",
                      color: darkMode ? "#ffffff" : "#0f172a",
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
              <td style={{ padding: "0.85rem 0.5rem", fontSize: "0.78rem", color: darkMode ? "#cbd5e1" : "#475569", fontWeight: 700 }}>
                {ext}
              </td>

              {/* Size */}
              <td style={{ padding: "0.85rem 0.5rem", fontSize: "0.78rem", color: darkMode ? "#94a3b8" : "#64748b", fontWeight: 500 }}>
                {formatBytes(file.fileSize)}
              </td>

              {/* Modified */}
              <td style={{ padding: "0.85rem 0.5rem", fontSize: "0.78rem", color: darkMode ? "#94a3b8" : "#64748b", fontWeight: 500 }}>
                {getRelativeTime(file.createdAt)}
              </td>

              {/* Actions */}
              <td style={{ padding: "0.85rem 0.5rem", textAlign: "right" }}>
                <div style={{ position: "relative", display: "inline-block", textAlign: "left" }}>
                  {/* 3 Vertical Dots Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuFileId(activeMenuFileId === file.id ? null : file.id);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "0.3rem",
                      borderRadius: "6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.15s ease",
                    }}
                    title="File Actions"
                    className="dropdown-item-hover"
                  >
                    <svg style={{ width: "1.1rem", height: "1.1rem", color: darkMode ? "#94a3b8" : "#64748b" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="1"/>
                      <circle cx="12" cy="5" r="1"/>
                      <circle cx="12" cy="19" r="1"/>
                    </svg>
                  </button>

                  {/* Floating Actions Dropdown Menu */}
                  {activeMenuFileId === file.id && (
                    <div
                      className="glass-card"
                      style={{
                        position: "absolute",
                        top: "100%",
                        right: 0,
                        zIndex: 100,
                        background: darkMode ? "#1e293b" : "#ffffff",
                        border: darkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)",
                        borderRadius: "10px",
                        padding: "0.35rem",
                        minWidth: "140px",
                        boxShadow: darkMode ? "0 10px 15px -3px rgba(0, 0, 0, 0.3)" : "0 10px 15px -3px rgba(15, 23, 42, 0.08)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.2rem",
                        marginTop: "6px",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Select Action */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuFileId(null);
                          onSelectClick?.(file);
                        }}
                        className="dropdown-item-hover"
                        style={{
                          background: "none",
                          border: "none",
                          borderRadius: "6px",
                          padding: "0.45rem 0.65rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.6rem",
                          cursor: "pointer",
                          width: "100%",
                          textAlign: "left",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <svg style={{ width: "0.95rem", height: "0.95rem", color: darkMode ? "#cbd5e1" : "#475569" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                          <polyline points="9 11 12 14 22 4"/>
                        </svg>
                        <span style={{ fontSize: "0.78rem", fontWeight: 600, color: darkMode ? "#ffffff" : "#0f172a" }}>Select</span>
                      </button>

                      {/* Copy Link / Revoke Access Action */}
                      {file.isShared ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuFileId(null);
                            handleRevokeShare(file.id);
                          }}
                          className="dropdown-item-hover"
                          style={{
                            background: "none",
                            border: "none",
                            borderRadius: "6px",
                            padding: "0.45rem 0.65rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.6rem",
                            cursor: "pointer",
                            width: "100%",
                            textAlign: "left",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <svg style={{ width: "0.95rem", height: "0.95rem", color: "#ef4444" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                          </svg>
                          <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#ef4444" }}>Revoke Access</span>
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuFileId(null);
                            handleShare(file.id);
                          }}
                          className="dropdown-item-hover"
                          style={{
                            background: "none",
                            border: "none",
                            borderRadius: "6px",
                            padding: "0.45rem 0.65rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.6rem",
                            cursor: "pointer",
                            width: "100%",
                            textAlign: "left",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <svg style={{ width: "0.95rem", height: "0.95rem", color: darkMode ? "#cbd5e1" : "#475569" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                          </svg>
                          <span style={{ fontSize: "0.78rem", fontWeight: 600, color: darkMode ? "#ffffff" : "#0f172a" }}>Copy Link</span>
                        </button>
                      )}

                      {/* Download Action */}
                      <button
                        disabled={isDownloading}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuFileId(null);
                          handleDownload(file.id, file.fileName);
                        }}
                        className="dropdown-item-hover"
                        style={{
                          background: "none",
                          border: "none",
                          borderRadius: "6px",
                          padding: "0.45rem 0.65rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.6rem",
                          cursor: "pointer",
                          width: "100%",
                          textAlign: "left",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {isDownloading ? (
                          <span style={{ fontSize: "0.75rem" }}>⏳</span>
                        ) : (
                          <svg style={{ width: "0.95rem", height: "0.95rem", color: darkMode ? "#cbd5e1" : "#475569" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 3v12"/>
                          </svg>
                        )}
                        <span style={{ fontSize: "0.78rem", fontWeight: 600, color: darkMode ? "#ffffff" : "#0f172a" }}>
                          {isDownloading ? "Downloading..." : "Download"}
                        </span>
                      </button>

                      {/* Rename Action */}
                      {onRenameClick && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuFileId(null);
                            onRenameClick(file);
                          }}
                          className="dropdown-item-hover"
                          style={{
                            background: "none",
                            border: "none",
                            borderRadius: "6px",
                            padding: "0.45rem 0.65rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.6rem",
                            cursor: "pointer",
                            width: "100%",
                            textAlign: "left",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <svg style={{ width: "0.95rem", height: "0.95rem", color: darkMode ? "#cbd5e1" : "#475569" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z" />
                          </svg>
                          <span style={{ fontSize: "0.78rem", fontWeight: 600, color: darkMode ? "#ffffff" : "#0f172a" }}>Rename</span>
                        </button>
                      )}

                      {/* Delete Action */}
                      <button
                        disabled={isDeleting}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuFileId(null);
                          handleMoveToTrash(file);
                        }}
                        className="dropdown-item-hover-danger"
                        style={{
                          background: "none",
                          border: "none",
                          borderRadius: "6px",
                          padding: "0.45rem 0.65rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.6rem",
                          cursor: "pointer",
                          width: "100%",
                          textAlign: "left",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <svg style={{ width: "0.95rem", height: "0.95rem", color: "#EF4444" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          <line x1="10" y1="11" x2="10" y2="17"/>
                          <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                        <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#EF4444" }}>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
