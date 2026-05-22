"use client";

import { useState, useEffect, useRef } from "react";
import { LoadingSpinner } from "../ui/loading-spinner";
import { useToast } from "@/components/ui/toast";

export interface DBFile {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  isShared?: boolean;
  createdAt: string;
}

interface DocumentViewerProps {
  file: DBFile | null;
  isOpen: boolean;
  onClose: () => void;
  darkMode?: boolean;
  handleDownload: (id: string, name: string) => void;
  handleShare: (id: string) => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  handleRename?: (id: string, newName: string) => Promise<void>;
}

export function DocumentViewer({
  file,
  isOpen,
  onClose,
  darkMode = false,
  handleDownload,
  handleShare,
  hasPrev = false,
  hasNext = false,
  onPrev,
  onNext,
  handleRename,
}: DocumentViewerProps) {
  const { showToast } = useToast();
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [textSearchQuery, setTextSearchQuery] = useState("");
  const [wordWrap, setWordWrap] = useState(true);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renameLoading, setRenameLoading] = useState(false);
  const [imageRotation, setImageRotation] = useState(0);
  const [imageFlipH, setImageFlipH] = useState(false);
  const [imageFlipV, setImageFlipV] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset image view transforms on file change
  useEffect(() => {
    setImageRotation(0);
    setImageFlipH(false);
    setImageFlipV(false);
  }, [file]);

  // Classify file type for custom viewer layout
  const getFileType = (fileName: string, mimeType: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    const mime = (mimeType || "").toLowerCase();

    if (ext === "pdf" || mime === "application/pdf") {
      return "pdf";
    }

    if (
      mime.startsWith("image/") ||
      ["png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "bmp"].includes(ext || "")
    ) {
      return "image";
    }

    if (
      mime.startsWith("video/") ||
      ["mp4", "webm", "ogg", "mov", "mkv", "avi"].includes(ext || "")
    ) {
      return "video";
    }

    if (
      mime.startsWith("audio/") ||
      ["mp3", "wav", "ogg", "m4a", "aac", "flac"].includes(ext || "")
    ) {
      return "audio";
    }

    const textExtensions = [
      "txt", "md", "json", "csv", "xml", "yaml", "yml", "ini", "log", "conf",
      "js", "jsx", "ts", "tsx", "py", "html", "css", "go", "sh", "bat", "sql",
      "cpp", "h", "java", "rs", "php", "rb", "swift", "kt", "scala"
    ];

    if (textExtensions.includes(ext || "") || mime.startsWith("text/")) {
      return "text";
    }

    return "fallback";
  };

  const fileType = file ? getFileType(file.fileName, file.mimeType) : "fallback";

  // Fetch text file content
  useEffect(() => {
    if (!isOpen || !file || fileType !== "text") {
      setTextContent(null);
      return;
    }

    const fetchText = async () => {
      setLoadingText(true);
      setTextContent(null);
      try {
        const response = await fetch(`/api/files/${file.id}`);
        if (!response.ok) {
          throw new Error("Failed to load text document.");
        }
        const text = await response.text();
        setTextContent(text);
      } catch (err) {
        showToast("error", "Error loading file content.");
        setTextContent("Error: Could not load the contents of this file.");
      } finally {
        setLoadingText(false);
      }
    };

    fetchText();
  }, [file, isOpen, fileType]);

  // Handle ESC key to close & Arrow navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      // Blur input fields to let navigation work
      if (document.activeElement?.tagName === "INPUT") {
        if (e.key === "Escape") {
          (document.activeElement as HTMLInputElement).blur();
        }
        return;
      }

      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft" && hasPrev && onPrev) {
        onPrev();
      } else if (e.key === "ArrowRight" && hasNext && onNext) {
        onNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, hasPrev, hasNext, onPrev, onNext]);

  // Synchronize internal fullscreen state on browser changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  if (!isOpen || !file) return null;

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(() => {
        showToast("error", "Could not enter fullscreen mode.");
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  const handlePrint = () => {
    if (fileType === "pdf") {
      const iframe = document.getElementById("pdf-iframe") as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } else {
        window.open(`/api/files/${file.id}`, "_blank");
      }
    } else if (fileType === "text" && textContent) {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>${file.fileName}</title>
              <style>
                body { font-family: monospace; white-space: pre-wrap; padding: 20px; font-size: 14px; }
              </style>
            </head>
            <body>
              <h3>${file.fileName}</h3>
              <hr />
              <div>${textContent.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }
    }
  };

  // Simple lines processor for search highlighting
  const renderTextLines = () => {
    if (!textContent) return null;
    const lines = textContent.split("\n");
    return lines.map((line, idx) => {
      const lineNum = idx + 1;
      const isMatch = textSearchQuery && line.toLowerCase().includes(textSearchQuery.toLowerCase());
      
      return (
        <div
          key={lineNum}
          style={{
            display: "flex",
            background: isMatch ? "rgba(245, 158, 11, 0.25)" : "transparent",
            padding: "0.1rem 0.5rem",
            fontSize: "0.8rem",
            lineHeight: "1.4",
            fontFamily: "Courier New, monospace",
            minHeight: "1.2rem",
          }}
        >
          {/* Line number column */}
          <span
            style={{
              width: "3rem",
              color: darkMode ? "#475569" : "#94a3b8",
              textAlign: "right",
              paddingRight: "1rem",
              userSelect: "none",
              borderRight: darkMode ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.08)",
              marginRight: "1rem",
            }}
          >
            {lineNum}
          </span>
          
          {/* Code text */}
          <span
            style={{
              whiteSpace: wordWrap ? "pre-wrap" : "pre",
              wordBreak: "break-all",
              color: darkMode ? "#cbd5e1" : "#1e293b",
              flex: 1,
            }}
          >
            {line || " "}
          </span>
        </div>
      );
    });
  };

  const handleCopyText = async () => {
    if (!textContent) return;
    try {
      await navigator.clipboard.writeText(textContent);
      showToast("success", "File content copied to clipboard!");
    } catch {
      showToast("error", "Failed to copy file contents.");
    }
  };

  const startRename = () => {
    setRenameValue(file.fileName);
    setIsRenaming(true);
  };

  const submitRename = async () => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === file.fileName) {
      setIsRenaming(false);
      return;
    }
    setRenameLoading(true);
    try {
      if (handleRename) {
        await handleRename(file.id, trimmed);
      }
      setIsRenaming(false);
    } catch {
      // Error handling is managed by parent toast emitter
    } finally {
      setRenameLoading(false);
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(8, 10, 18, 0.93)",
        backdropFilter: "blur(16px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        zIndex: 10000,
        padding: isFullscreen ? "0" : "1.25rem",
        userSelect: "none",
      }}
      onClick={onClose}
    >
      {/* Previous Document Chevron */}
      {hasPrev && onPrev && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          style={{
            position: "absolute",
            left: "1.5rem",
            top: "50%",
            transform: "translateY(-50%)",
            background: "rgba(30, 41, 59, 0.65)",
            backdropFilter: "blur(4px)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            color: "#ffffff",
            padding: "0.85rem",
            borderRadius: "50%",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            transition: "all 0.2s ease",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
          className="dropdown-item-hover"
          title="Previous (←)"
        >
          <svg style={{ width: "1.1rem", height: "1.1rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Next Document Chevron */}
      {hasNext && onNext && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          style={{
            position: "absolute",
            right: "1.5rem",
            top: "50%",
            transform: "translateY(-50%)",
            background: "rgba(30, 41, 59, 0.65)",
            backdropFilter: "blur(4px)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            color: "#ffffff",
            padding: "0.85rem",
            borderRadius: "50%",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            transition: "all 0.2s ease",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
          className="dropdown-item-hover"
          title="Next (→)"
        >
          <svg style={{ width: "1.1rem", height: "1.1rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Top Header & Toolbar Wrapper */}
      <div
        style={{
          width: "100%",
          maxWidth: isFullscreen ? "100%" : "1200px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 10,
          background: darkMode ? "rgba(30, 41, 59, 0.6)" : "rgba(255, 255, 255, 0.75)",
          border: darkMode ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.08)",
          borderRadius: isFullscreen ? "0" : "14px",
          padding: "0.75rem 1.25rem",
          fontFamily: "var(--font-outfit), sans-serif",
          backdropFilter: "blur(12px)",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Document Info */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0, flex: 1 }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "rgba(245, 158, 11, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.25rem",
              flexShrink: 0,
            }}
          >
            {
              fileType === "pdf" ? "📕" : 
              fileType === "text" ? "📄" : 
              fileType === "image" ? "🖼️" :
              fileType === "video" ? "🎥" :
              fileType === "audio" ? "🎵" :
              "📦"
            }
          </div>
          {isRenaming ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    submitRename();
                  } else if (e.key === "Escape") {
                    setIsRenaming(false);
                  }
                }}
                autoFocus
                disabled={renameLoading}
                style={{
                  background: darkMode ? "rgba(15, 23, 42, 0.6)" : "rgba(0, 0, 0, 0.05)",
                  border: "1px solid rgba(245, 158, 11, 0.5)",
                  borderRadius: "8px",
                  padding: "0.25rem 0.6rem",
                  fontSize: "0.85rem",
                  fontWeight: 800,
                  color: darkMode ? "#ffffff" : "#0f172a",
                  outline: "none",
                  width: "200px",
                }}
              />
              <button
                onClick={submitRename}
                disabled={renameLoading}
                style={{
                  background: "linear-gradient(135deg, #F59E0B, #D97706)",
                  border: "none",
                  borderRadius: "8px",
                  padding: "0.3rem 0.6rem",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  color: "#ffffff",
                  cursor: "pointer",
                }}
              >
                {renameLoading ? "..." : "Save"}
              </button>
              <button
                onClick={() => setIsRenaming(false)}
                disabled={renameLoading}
                style={{
                  background: "rgba(255, 255, 255, 0.1)",
                  border: darkMode ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(0,0,0,0.15)",
                  borderRadius: "8px",
                  padding: "0.3rem 0.6rem",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  color: darkMode ? "#ffffff" : "#475569",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <span
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 800,
                    color: darkMode ? "#ffffff" : "#0f172a",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                  }}
                  onClick={startRename}
                  title="Click to rename file"
                >
                  {file.fileName}
                </span>
                <button
                  onClick={startRename}
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    opacity: 0.6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  className="dropdown-item-hover"
                  title="Rename File"
                >
                  <svg style={{ width: "0.76rem", height: "0.76rem", color: darkMode ? "#cbd5e1" : "#475569" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>
              <span style={{ fontSize: "0.7rem", color: darkMode ? "#94a3b8" : "#64748b", fontWeight: 600 }}>
                {formatBytes(file.fileSize)} • {
                  fileType === "pdf" ? "PDF Document" : 
                  fileType === "text" ? "Text/Source Code" : 
                  fileType === "image" ? "Image File" :
                  fileType === "video" ? "Video File" :
                  fileType === "audio" ? "Audio File" :
                  "Binary File"
                }
              </span>
            </div>
          )}
        </div>

        {/* Toolbar Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {/* Image-specific Controls */}
          {fileType === "image" && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <button
                onClick={() => setImageRotation((r) => (r + 90) % 360)}
                style={{ background: "rgba(255, 255, 255, 0.06)", border: "none", color: darkMode ? "#e2e8f0" : "#475569", padding: "0.45rem", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                title="Rotate 90°"
              >
                <svg style={{ width: "0.95rem", height: "0.95rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3" />
                </svg>
              </button>

              <button
                onClick={() => setImageFlipH((f) => !f)}
                style={{ background: "rgba(255, 255, 255, 0.06)", border: "none", color: darkMode ? "#e2e8f0" : "#475569", padding: "0.45rem", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                title="Flip Horizontal"
              >
                <svg style={{ width: "0.95rem", height: "0.95rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </button>

              <button
                onClick={() => setImageFlipV((f) => !f)}
                style={{ background: "rgba(255, 255, 255, 0.06)", border: "none", color: darkMode ? "#e2e8f0" : "#475569", padding: "0.45rem", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                title="Flip Vertical"
              >
                <svg style={{ width: "0.95rem", height: "0.95rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 8v12m0 0l-4-4m4 4l4-4m6 0V4m0 0l4 4m-4-4l-4 4" />
                </svg>
              </button>

              <button
                onClick={() => {
                  setImageRotation(0);
                  setImageFlipH(false);
                  setImageFlipV(false);
                }}
                style={{ background: "rgba(255, 255, 255, 0.06)", border: "none", color: darkMode ? "#e2e8f0" : "#475569", padding: "0.45rem", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                title="Reset Image transformations"
              >
                Reset
              </button>
            </div>
          )}

          {/* Text-specific Search Controls */}
          {fileType === "text" && textContent && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", position: "relative" }}>
              <input
                type="text"
                placeholder="Find in file..."
                value={textSearchQuery}
                onChange={(e) => setTextSearchQuery(e.target.value)}
                style={{
                  background: darkMode ? "rgba(15, 23, 42, 0.4)" : "rgba(0, 0, 0, 0.05)",
                  border: darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
                  borderRadius: "8px",
                  padding: "0.35rem 0.6rem 0.35rem 1.6rem",
                  fontSize: "0.74rem",
                  color: darkMode ? "#ffffff" : "#0f172a",
                  width: "120px",
                  outline: "none",
                }}
              />
              <span style={{ position: "absolute", left: "0.5rem", fontSize: "0.75rem", top: "50%", transform: "translateY(-50%)", opacity: 0.6 }}>🔍</span>
            </div>
          )}

          {/* Text Settings (Word-wrap, Copy) */}
          {fileType === "text" && textContent && (
            <>
              <button
                onClick={() => setWordWrap((w) => !w)}
                style={{
                  background: wordWrap ? "rgba(245, 158, 11, 0.2)" : "rgba(255, 255, 255, 0.06)",
                  border: wordWrap ? "1px solid rgba(245, 158, 11, 0.4)" : "none",
                  color: wordWrap ? "#FBBF24" : (darkMode ? "#e2e8f0" : "#475569"),
                  padding: "0.45rem",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                }}
                title="Toggle Word Wrap"
              >
                Wrap
              </button>

              <button
                onClick={handleCopyText}
                style={{
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "none",
                  color: darkMode ? "#e2e8f0" : "#475569",
                  padding: "0.45rem",
                  borderRadius: "8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                title="Copy to Clipboard"
              >
                <svg style={{ width: "0.95rem", height: "0.95rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002 2h2a2 2 0 002-2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
              </button>
            </>
          )}

          {/* Action: Print */}
          {(fileType === "pdf" || (fileType === "text" && textContent)) && (
            <button
              onClick={handlePrint}
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                border: "none",
                color: darkMode ? "#e2e8f0" : "#475569",
                padding: "0.45rem",
                borderRadius: "8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Print Document"
            >
              <svg style={{ width: "0.95rem", height: "0.95rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            </button>
          )}

          {/* Action: Share */}
          <button
            onClick={() => handleShare(file.id)}
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "none",
              color: darkMode ? "#e2e8f0" : "#475569",
              padding: "0.45rem",
              borderRadius: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Copy Share Link"
          >
            <svg style={{ width: "0.95rem", height: "0.95rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 10.742l4.062-2.031M8.684 13.258l4.062 2.031M14 19a3 3 0 100-6 3 3 0 000 6zM6 13a3 3 0 100-6 3 3 0 000 6zm8-7a3 3 0 100-6 3 3 0 000 6z" />
            </svg>
          </button>

          {/* Action: Download */}
          <button
            onClick={() => handleDownload(file.id, file.fileName)}
            style={{
              background: "rgba(245, 158, 11, 0.2)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              color: "#FBBF24",
              padding: "0.45rem",
              borderRadius: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Download Document"
          >
            <svg style={{ width: "0.95rem", height: "0.95rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>

          {/* Action: Fullscreen */}
          <button
            onClick={handleToggleFullscreen}
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "none",
              color: darkMode ? "#e2e8f0" : "#475569",
              padding: "0.45rem",
              borderRadius: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <svg style={{ width: "0.95rem", height: "0.95rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9L4 4m0 0l5 0m-5 0l0 5m11 5l5 5m0 0l-5 0m5 0l0-5m0-11l-5 5m5-5v5m0-5h-5M9 15l-5 5m0 0h5m-5 0v-5" />
              </svg>
            ) : (
              <svg style={{ width: "0.95rem", height: "0.95rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5h-4m4 0v-4m0 4l-5-5" />
              </svg>
            )}
          </button>

          <div style={{ width: "1px", height: "20px", background: "rgba(255,255,255,0.15)", margin: "0 0.2rem" }} />

          {/* Action: Close */}
          <button
            onClick={onClose}
            style={{
              background: "rgba(239, 68, 68, 0.2)",
              border: "none",
              color: "#f87171",
              padding: "0.45rem",
              borderRadius: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Close (Esc)"
          >
            <svg style={{ width: "0.95rem", height: "0.95rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Document Content Canvas */}
      <div
        style={{
          flex: 1,
          width: "100%",
          maxWidth: isFullscreen ? "100%" : "1200px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: isFullscreen ? "0" : "1.25rem",
          marginBottom: isFullscreen ? "0" : "0.5rem",
          overflow: "hidden",
          borderRadius: isFullscreen ? "0" : "14px",
          background: darkMode ? "rgba(15, 23, 42, 0.55)" : "rgba(255, 255, 255, 0.8)",
          border: darkMode ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.08)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        {/* IMAGE VIEW RENDERER */}
        {fileType === "image" && (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={`/api/files/${file.id}`}
              alt={file.fileName}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                borderRadius: "8px",
                transform: `rotate(${imageRotation}deg) scaleX(${imageFlipH ? -1 : 1}) scaleY(${imageFlipV ? -1 : 1})`,
                transition: "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: darkMode ? "0 25px 50px -12px rgba(0, 0, 0, 0.6)" : "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
              }}
            />
          </div>
        )}

        {/* VIDEO VIEW RENDERER */}
        {fileType === "video" && (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              backgroundColor: "#000000",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <video
              src={`/api/files/${file.id}`}
              controls
              autoPlay
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
              }}
            />
          </div>
        )}

        {/* AUDIO VIEW RENDERER */}
        {fileType === "audio" && (
          <div
            style={{
              padding: "3rem 2rem",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1.25rem",
              maxWidth: "420px",
              fontFamily: "var(--font-outfit), sans-serif",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "3rem",
                animation: "pulse 2s infinite",
              }}
            >
              🎵
            </div>
            <div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: darkMode ? "#ffffff" : "#0f172a", margin: "0 0 0.5rem 0" }}>
                Audio Playback
              </h3>
              <p style={{ fontSize: "0.82rem", color: darkMode ? "#94a3b8" : "#64748b", margin: "0 0 1rem 0", lineHeight: 1.5, fontWeight: 500 }}>
                {file.fileName}
              </p>
            </div>
            <audio
              src={`/api/files/${file.id}`}
              controls
              autoPlay
              style={{
                width: "100%",
                borderRadius: "30px",
              }}
            />
          </div>
        )}

        {/* PDF VIEW RENDERER */}
        {fileType === "pdf" && (
          <iframe
            id="pdf-iframe"
            src={`/api/files/${file.id}`}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              backgroundColor: darkMode ? "#1e293b" : "#ffffff",
            }}
            title={file.fileName}
          />
        )}

        {/* TEXT/CODE VIEW RENDERER */}
        {fileType === "text" && (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              textAlign: "left",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {loadingText ? (
              <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center" }}>
                <LoadingSpinner size="lg" label="Streaming file content cleanly..." />
              </div>
            ) : (
              <div
                style={{
                  flex: 1,
                  overflow: "auto",
                  padding: "1rem 0",
                  backgroundColor: darkMode ? "#0b0f19" : "#f8fafc",
                }}
              >
                {renderTextLines()}
              </div>
            )}
          </div>
        )}

        {/* BINARY/OFFICE FALLBACK RENDERING */}
        {fileType === "fallback" && (
          <div
            style={{
              padding: "3rem 2rem",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1.25rem",
              maxWidth: "420px",
              fontFamily: "var(--font-outfit), sans-serif",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "20px",
                background: "rgba(245, 158, 11, 0.15)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "3rem",
                animation: "pulse 2s infinite",
              }}
            >
              📦
            </div>
            <div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: darkMode ? "#ffffff" : "#0f172a", margin: "0 0 0.5rem 0" }}>
                Document Preview Unavailable
              </h3>
              <p style={{ fontSize: "0.82rem", color: darkMode ? "#94a3b8" : "#64748b", margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
                This is a binary format ({file.fileName.split(".").pop()?.toUpperCase() || "unknown"}) and cannot be previewed natively in the browser. You can download or share the file to view it on your device.
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", width: "100%", marginTop: "0.5rem" }}>
              <button
                onClick={() => handleShare(file.id)}
                style={{
                  flex: 1,
                  background: "rgba(255, 255, 255, 0.05)",
                  border: darkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0,0,0,0.1)",
                  borderRadius: "10px",
                  padding: "0.6rem 1rem",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: darkMode ? "#ffffff" : "#0f172a",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  transition: "all 0.2s ease",
                }}
              >
                Copy Link 🔗
              </button>
              <button
                onClick={() => handleDownload(file.id, file.fileName)}
                style={{
                  flex: 1,
                  background: "linear-gradient(135deg, #F59E0B, #D97706)",
                  border: "none",
                  borderRadius: "10px",
                  padding: "0.6rem 1rem",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "#ffffff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  boxShadow: "0 4px 15px rgba(217, 119, 6, 0.3)",
                  transition: "all 0.2s ease",
                }}
              >
                Download ⬇️
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Label */}
      {!isFullscreen && (
        <span
          style={{
            fontSize: "0.68rem",
            color: darkMode ? "rgba(255,255,255,0.4)" : "rgba(15,23,42,0.5)",
            marginTop: "0.4rem",
            fontFamily: "var(--font-outfit), sans-serif",
            fontWeight: 500,
          }}
        >
          Secure Telegram Storage Tunnel • Click anywhere outside content to close
        </span>
      )}
    </div>
  );
}
