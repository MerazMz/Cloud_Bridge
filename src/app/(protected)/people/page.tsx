"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  User,
  Edit2,
  Check,
  X,
  RefreshCw,
  Search,
  Users,
  Grid,
  ChevronRight,
  Sparkles,
} from "lucide-react";

interface CoverFace {
  id: string;
  fileId: string;
  box: number[]; // [x1, y1, x2, y2]
}

interface Person {
  id: string;
  name: string | null;
  facesCount: number;
  coverFace: CoverFace | null;
  createdAt: string;
  updatedAt: string;
}

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const fetchPeople = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/people");
      const json = await res.json();
      if (json.success) {
        setPeople(json.data);
      } else {
        showNotification(json.error || "Failed to load people groups", "error");
      }
    } catch (err) {
      showNotification("An error occurred while fetching people groups.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeople();
  }, []);

  const showNotification = (message: string, type: "success" | "error" | "info") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  const handleStartRename = (person: Person) => {
    setEditingId(person.id);
    setEditName(person.name || "");
  };

  const handleSaveRename = async (personId: string) => {
    const trimmedName = editName.trim();
    if (!trimmedName) {
      showNotification("Name cannot be empty.", "error");
      return;
    }

    try {
      setSavingId(personId);
      const res = await fetch(`/api/people/${personId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName }),
      });
      const json = await res.json();

      if (json.success) {
        if (json.data.merged) {
          showNotification(
            `Group merged into existing group "${trimmedName}" successfully!`,
            "success"
          );
        } else {
          showNotification("Person renamed successfully!", "success");
        }
        setEditingId(null);
        fetchPeople();
      } else {
        showNotification(json.error || "Failed to rename person", "error");
      }
    } catch (err) {
      showNotification("An error occurred while renaming.", "error");
    } finally {
      setSavingId(null);
    }
  };

  const handleTriggerScan = async () => {
    try {
      setScanning(true);
      showNotification(
        "Checking database and scanning files for faces. This runs in the background...",
        "info"
      );
      const res = await fetch("/api/files/backfill", {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        showNotification(
          "Face scanning started in the background! Processing files now...",
          "success"
        );
        
        // Refresh the list dynamically over the next 15 seconds as background processing completes
        const intervals = [3000, 6000, 10000, 15000];
        intervals.forEach((delay) => {
          setTimeout(() => {
            fetchPeople();
          }, delay);
        });
      } else {
        showNotification(json.error || "Failed to scan files.", "error");
      }
    } catch (err) {
      showNotification("An error occurred during file scanning.", "error");
    } finally {
      setScanning(false);
    }
  };

  // Helper to render the face crop avatar dynamically
  const renderFaceAvatar = (coverFace: CoverFace | null) => {
    if (!coverFace || !coverFace.box || coverFace.box.length < 4) {
      return (
        <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-400">
          <User size={32} />
        </div>
      );
    }

    const [x1, y1, x2, y2] = coverFace.box;
    const w = x2 - x1;
    const h = y2 - y1;

    // Standard CSS mapping percentages
    const widthPct = w > 0 ? 100 / w : 100;
    const heightPct = h > 0 ? 100 / h : 100;
    const leftPct = w > 0 ? -x1 * widthPct : 0;
    const topPct = h > 0 ? -y1 * heightPct : 0;

    return (
      <div className="relative w-full h-full overflow-hidden rounded-full">
        <img
          src={`/api/files/${coverFace.fileId}`}
          alt="Face Thumbnail"
          className="absolute max-w-none transition-transform duration-300 hover:scale-110"
          style={{
            width: `${widthPct}%`,
            height: `${heightPct}%`,
            left: `${leftPct}%`,
            top: `${topPct}%`,
          }}
          onError={(e) => {
            // Fallback if image fails to load
            (e.target as HTMLElement).style.display = "none";
          }}
        />
      </div>
    );
  };

  const filteredPeople = people.filter((person) => {
    const name = person.name || "Unnamed Person";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

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

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ letterSpacing: "-0.03em" }}>
            People & Faces
          </h1>
          <p className="text-[var(--text-secondary)] mt-1 font-medium">
            Faces are automatically detected, grouped, and clustered using AI.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchPeople}
            disabled={loading}
            className="btn btn-secondary"
            title="Refresh List"
            style={{ width: "42px", height: "42px", padding: 0 }}
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={handleTriggerScan}
            disabled={scanning}
            className="btn btn-primary flex items-center gap-2"
            style={{ padding: "0.65rem 1.25rem" }}
          >
            <Sparkles size={18} className={scanning ? "animate-pulse" : ""} />
            <span>{scanning ? "Scanning..." : "Scan Files for Faces"}</span>
          </button>
        </div>
      </div>

      {/* Search and Stats bar */}
      <div
        className="glass-card flex flex-col md:flex-row items-center justify-between gap-4"
        style={{
          padding: "1.25rem",
          borderRadius: "16px",
          border: "1px solid var(--border-default)",
        }}
      >
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search grouped people..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field"
            style={{ paddingLeft: "2.75rem" }}
          />
        </div>

        <div className="flex items-center gap-4 text-sm font-semibold text-[var(--text-secondary)]">
          <div className="flex items-center gap-1.5">
            <Users size={16} />
            <span>{people.length} People Groups</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Grid size={16} />
            <span>
              {people.reduce((acc, p) => acc + p.facesCount, 0)} Faces Detected
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="glass-card flex flex-col items-center justify-center p-6 gap-4 animate-pulse"
              style={{
                borderRadius: "20px",
                height: "220px",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div className="w-24 h-24 rounded-full bg-slate-800" />
              <div className="w-20 h-4 bg-slate-800 rounded-md" />
              <div className="w-12 h-3 bg-slate-800 rounded-md" />
            </div>
          ))}
        </div>
      ) : filteredPeople.length === 0 ? (
        <div
          className="glass-card flex flex-col items-center justify-center p-12 text-center"
          style={{
            borderRadius: "20px",
            border: "1px solid var(--border-default)",
            minHeight: "350px",
          }}
        >
          <div className="w-16 h-16 rounded-full bg-[rgba(245,158,11,0.1)] flex items-center justify-center mb-4">
            <Users className="text-[#F59E0B]" size={32} />
          </div>
          <h3 className="text-xl font-bold tracking-tight">No people found</h3>
          <p className="text-[var(--text-secondary)] mt-2 max-w-md mx-auto text-sm leading-relaxed">
            {searchQuery
              ? "No people groups match your search query. Try typing something else."
              : "No faces have been detected or grouped in your cloud storage yet. Run a background scan to process existing photos."}
          </p>
          {!searchQuery && (
            <button
              onClick={handleTriggerScan}
              disabled={scanning}
              className="btn btn-primary mt-6 flex items-center gap-2"
            >
              <Sparkles size={18} />
              <span>{scanning ? "Scanning files..." : "Start Scanning Files"}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {filteredPeople.map((person) => {
            const isEditing = editingId === person.id;
            const displayName = person.name || "Unnamed Person";

            return (
              <div
                key={person.id}
                className="glass-card flex flex-col items-center p-5 text-center relative group transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                style={{
                  borderRadius: "20px",
                  border: "1px solid var(--border-default)",
                  background: "var(--glass-bg)",
                }}
              >
                {/* Circular face crop container */}
                <Link
                  href={`/people/${person.id}`}
                  className="relative w-24 h-24 mb-4 rounded-full p-1 border-2 border-transparent group-hover:border-[#F59E0B] transition-colors"
                >
                  <div className="w-full h-full rounded-full overflow-hidden bg-slate-800 flex items-center justify-center border border-[var(--border-default)] shadow-sm">
                    {renderFaceAvatar(person.coverFace)}
                  </div>
                </Link>

                {/* Name & Editing fields */}
                {isEditing ? (
                  <div className="flex items-center gap-1 w-full max-w-[150px] mb-1.5">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="input-field py-1 px-2 text-xs font-semibold text-center"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveRename(person.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                    />
                    <button
                      onClick={() => handleSaveRename(person.id)}
                      disabled={savingId === person.id}
                      className="text-green-500 hover:text-green-600 p-0.5"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-red-500 hover:text-red-600 p-0.5"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1.5 group/name mb-1">
                    <span
                      className={`font-bold text-sm truncate max-w-[130px] ${
                        !person.name ? "text-[var(--text-muted)] italic font-medium" : ""
                      }`}
                    >
                      {displayName}
                    </span>
                    <button
                      onClick={() => handleStartRename(person)}
                      className="opacity-0 group-hover/name:opacity-100 transition-opacity p-0.5 text-slate-400 hover:text-[var(--text-primary)]"
                    >
                      <Edit2 size={12} />
                    </button>
                  </div>
                )}

                {/* Faces / Photos counter */}
                <span className="text-xs text-[var(--text-secondary)] font-medium mb-3">
                  {person.facesCount === 1 ? "1 photo" : `${person.facesCount} photos`}
                </span>

                {/* Navigate Button */}
                <Link
                  href={`/people/${person.id}`}
                  className="flex items-center gap-1 text-xs text-[#F59E0B] font-bold mt-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                >
                  <span>View Photos</span>
                  <ChevronRight size={14} />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
