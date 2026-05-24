"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Edit2,
  Check,
  X,
  RefreshCw,
  Image,
  Calendar,
  HardDrive,
  Maximize2,
} from "lucide-react";

interface FileItem {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  caption: string | null;
  faceBox: number[]; // [x1, y1, x2, y2]
}

interface CoverFace {
  id: string;
  fileId: string;
  box: number[];
}

interface PersonDetail {
  id: string;
  name: string | null;
  facesCount: number;
  coverFace: CoverFace | null;
  files: FileItem[];
}

interface PageProps {
  params: Promise<{ personId: string }>;
}

export default function PersonDetailPage({ params }: PageProps) {
  const { personId } = React.use(params);
  const router = useRouter();

  const [person, setPerson] = useState<PersonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [viewerImage, setViewerImage] = useState<FileItem | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const fetchPersonDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/people/${personId}`);
      const json = await res.json();
      if (json.success) {
        setPerson(json.data);
      } else {
        showNotification(json.error || "Failed to load person details", "error");
      }
    } catch (err) {
      showNotification("An error occurred while loading details.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (personId) {
      fetchPersonDetails();
    }
  }, [personId]);

  const showNotification = (message: string, type: "success" | "error" | "info") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  const handleStartRename = () => {
    if (person) {
      setEditing(true);
      setEditName(person.name || "");
    }
  };

  const handleSaveRename = async () => {
    const trimmedName = editName.trim();
    if (!trimmedName) {
      showNotification("Name cannot be empty.", "error");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`/api/people/${personId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName }),
      });
      const json = await res.json();

      if (json.success) {
        setEditing(false);
        if (json.data.merged) {
          showNotification(
            `Group merged into existing group "${trimmedName}" successfully! Redirecting...`,
            "success"
          );
          // Redirect to the merged target person details page
          setTimeout(() => {
            router.push(`/people/${json.data.targetId}`);
          }, 1500);
        } else {
          showNotification("Person renamed successfully!", "success");
          fetchPersonDetails();
        }
      } else {
        showNotification(json.error || "Failed to rename.", "error");
      }
    } catch (err) {
      showNotification("An error occurred during renaming.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Helper to format file sizes
  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Helper to crop face cover avatar
  const renderFaceCover = (coverFace: CoverFace | null) => {
    if (!coverFace || !coverFace.box || coverFace.box.length < 4) {
      return null;
    }
    const [x1, y1, x2, y2] = coverFace.box;
    const w = x2 - x1;
    const h = y2 - y1;
    const widthPct = w > 0 ? 100 / w : 100;
    const heightPct = h > 0 ? 100 / h : 100;
    const leftPct = w > 0 ? -x1 * widthPct : 0;
    const topPct = h > 0 ? -y1 * heightPct : 0;

    return (
      <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-[#F59E0B] shadow-md flex-shrink-0 bg-slate-800">
        <img
          src={`/api/files/${coverFace.fileId}`}
          alt="Cover Face"
          className="absolute max-w-none"
          style={{
            width: `${widthPct}%`,
            height: `${heightPct}%`,
            left: `${leftPct}%`,
            top: `${topPct}%`,
          }}
        />
      </div>
    );
  };

  // Helper to render the inline circular crop of a face over a photo card
  const renderFaceBadge = (file: FileItem) => {
    if (!file.faceBox || file.faceBox.length < 4) return null;
    const [x1, y1, x2, y2] = file.faceBox;
    const w = x2 - x1;
    const h = y2 - y1;
    const widthPct = w > 0 ? 100 / w : 100;
    const heightPct = h > 0 ? 100 / h : 100;
    const leftPct = w > 0 ? -x1 * widthPct : 0;
    const topPct = h > 0 ? -y1 * heightPct : 0;

    return (
      <div className="absolute bottom-2.5 left-2.5 w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-md bg-slate-800 z-10">
        <img
          src={`/api/files/${file.id}`}
          alt="Matched Face"
          className="absolute max-w-none"
          style={{
            width: `${widthPct}%`,
            height: `${heightPct}%`,
            left: `${leftPct}%`,
            top: `${topPct}%`,
          }}
        />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-[var(--text-secondary)] gap-4">
        <RefreshCw className="animate-spin text-[#F59E0B]" size={36} />
        <span className="font-semibold text-sm">Loading group details...</span>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center gap-4">
        <X className="text-red-500" size={48} />
        <h3 className="text-lg font-bold">Group Not Found</h3>
        <p className="text-slate-400 text-sm max-w-sm">
          The person group does not exist or you do not have permission to view it.
        </p>
        <Link href="/people" className="btn btn-secondary mt-2">
          Back to People
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "2rem",
        maxWidth: "1200px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "2rem",
        color: "var(--text-primary)",
      }}
    >
      {/* Toast Notification */}
      {notification && (
        <div className={`toast toast-${notification.type}`} style={{ position: "fixed", bottom: "2rem", right: "2rem", zIndex: 100 }}>
          <span className="font-semibold">{notification.message}</span>
        </div>
      )}

      {/* Back navigation */}
      <div>
        <Link
          href="/people"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to People</span>
        </Link>
      </div>

      {/* Header Profile Section */}
      <div
        className="glass-card flex flex-col sm:flex-row items-center gap-6 p-6"
        style={{
          borderRadius: "24px",
          border: "1px solid var(--border-default)",
        }}
      >
        {renderFaceCover(person.coverFace)}

        <div className="flex-1 text-center sm:text-left">
          {editing ? (
            <div className="flex items-center justify-center sm:justify-start gap-2 max-w-md">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="input-field py-1.5 px-3 text-lg font-bold"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveRename();
                  if (e.key === "Escape") setEditing(false);
                }}
              />
              <button
                onClick={handleSaveRename}
                disabled={saving}
                className="btn btn-primary p-2"
                style={{ borderRadius: "8px" }}
              >
                <Check size={18} />
              </button>
              <button
                onClick={() => setEditing(false)}
                className="btn btn-secondary p-2"
                style={{ borderRadius: "8px" }}
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center sm:justify-start gap-3 group/header">
              <h1 className="text-3xl font-extrabold tracking-tight" style={{ letterSpacing: "-0.03em" }}>
                {person.name || "Unnamed Person"}
              </h1>
              <button
                onClick={handleStartRename}
                className="opacity-0 group-hover/header:opacity-100 transition-opacity p-1.5 text-slate-400 hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.05)] rounded-md"
              >
                <Edit2 size={16} />
              </button>
            </div>
          )}

          <p className="text-[var(--text-secondary)] mt-1.5 font-semibold text-sm">
            {person.files.length === 1 ? "1 photo matches" : `${person.files.length} photos match`}{" "}
            this person
          </p>
        </div>
      </div>

      {/* Photos Grid */}
      {person.files.length === 0 ? (
        <div
          className="glass-card flex flex-col items-center justify-center p-12 text-center"
          style={{
            borderRadius: "20px",
            border: "1px solid var(--border-default)",
            minHeight: "250px",
          }}
        >
          <Image className="text-slate-400 mb-4" size={40} />
          <h3 className="text-lg font-bold">No photos found</h3>
          <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">
            All files for this group may have been deleted.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {person.files.map((file) => {
            const isImage = file.mimeType.startsWith("image/");

            return (
              <div
                key={file.id}
                onClick={() => isImage && setViewerImage(file)}
                className={`glass-card flex flex-col overflow-hidden relative group border border-[var(--border-default)] transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
                  isImage ? "cursor-pointer" : ""
                }`}
                style={{
                  borderRadius: "16px",
                  background: "var(--bg-card)",
                }}
              >
                {/* Media container */}
                <div className="aspect-[4/3] relative w-full overflow-hidden bg-slate-900 flex items-center justify-center">
                  {isImage ? (
                    <img
                      src={`/api/files/${file.id}`}
                      alt={file.fileName}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                      <Image size={32} />
                      <span className="text-xs truncate max-w-[120px]">{file.mimeType}</span>
                    </div>
                  )}

                  {/* Face crop overlay badge */}
                  {isImage && renderFaceBadge(file)}

                  {/* Hover magnifying overlay */}
                  {isImage && (
                    <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                        <Maximize2 size={18} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Details Footer */}
                <div className="p-3.5 flex flex-col gap-1">
                  <span className="text-xs font-bold truncate text-[var(--text-primary)]">
                    {file.fileName}
                  </span>
                  {file.caption && (
                    <p className="text-[10px] text-[var(--text-secondary)] italic line-clamp-1">
                      "{file.caption}"
                    </p>
                  )}
                  <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] font-semibold mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar size={10} />
                      {new Date(file.createdAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <HardDrive size={10} />
                      {formatSize(file.fileSize)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox / Image Viewer Modal */}
      {viewerImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in"
          onClick={() => setViewerImage(null)}
        >
          {/* Modal Content */}
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col justify-center items-center text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setViewerImage(null)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white transition-colors"
            >
              <X size={28} />
            </button>

            {/* Main Full Image */}
            <img
              src={`/api/files/${viewerImage.id}`}
              alt={viewerImage.fileName}
              className="rounded-lg shadow-2xl max-w-full max-h-[80vh] object-contain border border-slate-800"
            />

            {/* Information panel below */}
            <div className="w-full text-center mt-4 px-2 flex flex-col gap-1 select-text">
              <h3 className="font-bold text-base tracking-tight">{viewerImage.fileName}</h3>
              {viewerImage.caption && (
                <p className="text-sm text-slate-300 italic mt-0.5">
                  "{viewerImage.caption}"
                </p>
              )}
              <span className="text-[11px] text-slate-400 font-medium">
                Uploaded on {new Date(viewerImage.createdAt).toLocaleString()} •{" "}
                {formatSize(viewerImage.fileSize)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
