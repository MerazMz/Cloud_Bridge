"use client";

import { DBFile } from "@/types/file.types";
import { VideoThumbnail } from "./video-thumbnail";

interface RecentActivityTimelineProps {
  activeFiles: DBFile[];
  getFileStyle: (mime: string, name: string) => { bg: string; color: string };
  renderFileIcon: (category: string, fileName?: string, mimeType?: string) => React.ReactNode;
  getRelativeTime: (date: string) => string;
  classifyFile: (mime: string, name: string) => string;
}

export function RecentActivityTimeline({
  activeFiles,
  getFileStyle,
  renderFileIcon,
  getRelativeTime,
  classifyFile,
}: RecentActivityTimelineProps) {
  return (
    <div
      className="glass-card"
      style={{
        padding: "1.15rem",
        borderRadius: "14px",
        border: "1px solid var(--border-default)",
        background: "var(--bg-card)",
        display: "flex",
        flexDirection: "column",
        gap: "0.85rem",
        height: "100%",
      }}
    >
      <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.015em" }}>Recent Activity</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", flex: 1, justifyContent: "center" }}>
        {activeFiles.slice(0, 3).map((f, index) => {
          const cat = classifyFile(f.mimeType, f.fileName);
          const style = getFileStyle(f.mimeType, f.fileName);

          const isImage = 
            f.mimeType.startsWith("image/") || 
            ((f.mimeType === "application/octet-stream" || !f.mimeType) && 
             /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(f.fileName));

          const isVideo = 
            f.mimeType.startsWith("video/") || 
            ((f.mimeType === "application/octet-stream" || !f.mimeType) && 
             /\.(mp4|webm|ogg|mov)$/i.test(f.fileName));

          return (
            <div key={f.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", position: "relative" }}>
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", minWidth: 0, flex: 1 }}>
                {(() => {
                  if (isImage) {
                    return (
                      <div
                        style={{
                          width: "30px",
                          height: "30px",
                          borderRadius: "6px",
                          overflow: "hidden",
                          border: "1px solid var(--border-default)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "var(--bg-secondary)",
                          flexShrink: 0,
                        }}
                      >
                        <img
                          src={`/api/files/${f.id}`}
                          alt={f.fileName}
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
                          border: "1px solid var(--border-default)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "#000000",
                          flexShrink: 0,
                        }}
                      >
                        <VideoThumbnail fileId={f.id} />
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
                      {renderFileIcon(cat, f.fileName, f.mimeType)}
                    </div>
                  );
                })()}
                <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {f.fileName}
                  </span>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 500 }}>
                    Uploaded {getRelativeTime(f.createdAt)}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative", width: "16px", height: "30px", justifyContent: "center" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#FBBF24", zIndex: 2 }} />
                {index < Math.min(activeFiles.slice(0, 3).length - 1, 2) && (
                  <div style={{ position: "absolute", top: "18px", bottom: "-22px", width: "2px", background: "var(--border-subtle)", zIndex: 1 }} />
                )}
              </div>
            </div>
          );
        })}
        {activeFiles.length === 0 && (
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", textAlign: "center", padding: "0.5rem 0" }}>No activity recorded yet</span>
        )}
      </div>
    </div>
  );
}
