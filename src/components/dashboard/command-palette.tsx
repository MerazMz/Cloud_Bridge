"use client";

import { useState, useEffect, useRef } from "react";
import { DBFile } from "@/types/file.types";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
  onUpload: () => void;
  onToggleTheme: () => void;
  files: DBFile[];
  darkMode: boolean;
}

interface CommandItem {
  id: string;
  label: string;
  category: string;
  action: () => void;
  icon?: React.ReactNode;
}

export function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  onUpload,
  onToggleTheme,
  files,
  darkMode,
}: CommandPaletteProps) {
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close command palette on escape and toggle on Cmd/Ctrl + K
  useEffect(() => {
    if (!isOpen) return;
    inputRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Build the list of static command palette actions
  const staticItems: CommandItem[] = [
    // Follow for updates group
    {
      id: "twitter",
      label: "Twitter @mannupaaji",
      category: "Follow for updates",
      action: () => window.open("https://twitter.com/mannupaaji", "_blank"),
    },
    {
      id: "motion",
      label: "Learn Tailwind and Motion",
      category: "Follow for updates",
      action: () => window.open("https://tailwindcss.com", "_blank"),
    },
    // Installation group
    {
      id: "install-next",
      label: "Install Next.js",
      category: "Installation",
      action: () => window.open("https://nextjs.org/docs/getting-started/installation", "_blank"),
    },
    {
      id: "install-tailwind",
      label: "Install Tailwind CSS",
      category: "Installation",
      action: () => window.open("https://tailwindcss.com/docs/installation", "_blank"),
    },
    {
      id: "add-utilities",
      label: "Add utilities",
      category: "Installation",
      action: () => window.open("https://tailwindcss.com/docs/utility-first", "_blank"),
    },
    // Navigation group
    {
      id: "nav-dash",
      label: "Go to Dashboard",
      category: "Navigation",
      action: () => {
        onNavigate("dashboard");
        onClose();
      },
    },
    {
      id: "nav-files",
      label: "Go to All Files",
      category: "Navigation",
      action: () => {
        onNavigate("my-files");
        onClose();
      },
    },
    {
      id: "nav-favs",
      label: "Go to Starred Items",
      category: "Navigation",
      action: () => {
        onNavigate("favorites");
        onClose();
      },
    },
    {
      id: "nav-shared",
      label: "Go to Shared Links",
      category: "Navigation",
      action: () => {
        onNavigate("shared");
        onClose();
      },
    },
    // System utility group
    {
      id: "util-upload",
      label: "Upload New File",
      category: "System Actions",
      action: () => {
        onUpload();
        onClose();
      },
    },
    {
      id: "util-theme",
      label: "Toggle Light/Dark Theme",
      category: "System Actions",
      action: () => {
        onToggleTheme();
        onClose();
      },
    },
  ];

  // Dynamic items from searching files
  const fileItems: CommandItem[] = files
    .filter((file) => !file.isDeleted && file.fileName.toLowerCase().includes(search.toLowerCase()))
    .map((file) => ({
      id: `file-${file.id}`,
      label: `File: ${file.fileName}`,
      category: "My Files",
      action: () => {
        // trigger download or link copy!
        navigator.clipboard.writeText(`${window.location.origin}/api/files/shared/${file.id}`);
        onClose();
      },
    }));

  // Combine static and file items
  const allItems = [...fileItems, ...staticItems].filter((item) =>
    item.label.toLowerCase().includes(search.toLowerCase()) ||
    item.category.toLowerCase().includes(search.toLowerCase())
  );

  // Keyboard navigation between items
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % allItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allItems.length) % allItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        allItems[selectedIndex].action();
      }
    }
  };

  // Group items by category for rendering
  const categories: Record<string, CommandItem[]> = {};
  allItems.forEach((item) => {
    if (!categories[item.category]) {
      categories[item.category] = [];
    }
    categories[item.category].push(item);
  });

  // Calculate index offset for each item to map to overall index
  let itemCounter = 0;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: darkMode ? "rgba(0, 0, 0, 0.45)" : "rgba(0, 0, 0, 0.25)",
        backdropFilter: "blur(8px)",
        zIndex: 99999,
        display: "flex",
        justifyContent: "center",
        paddingTop: "6.5rem",
        animation: "fadeIn 0.2s ease-out",
      }}
    >
      <div
        ref={containerRef}
        className="glass-card"
        style={{
          width: "520px",
          maxHeight: "360px",
          background: darkMode ? "rgba(15, 23, 42, 0.85)" : "rgba(248, 250, 252, 0.85)",
          backdropFilter: "blur(20px)",
          border: darkMode ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(255, 255, 255, 0.6)",
          borderRadius: "12px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: darkMode ? "0 20px 40px rgba(0, 0, 0, 0.5)" : "0 20px 40px rgba(15, 23, 42, 0.12)",
          fontFamily: "Outfit, sans-serif",
          animation: "slideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Search Input Area */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "0.85rem 1rem",
            borderBottom: darkMode ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.06)",
            gap: "0.75rem",
            position: "relative",
          }}
        >
          {/* Magnifying glass */}
          <svg style={{ width: "1.1rem", height: "1.1rem", color: "#64748B" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>

          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              fontSize: "0.88rem",
              color: darkMode ? "#f1f5f9" : "#1e293b",
              fontWeight: 500,
            }}
          />

          {/* Close trigger */}
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#64748B",
              display: "flex",
              alignItems: "center",
              padding: "0.2rem",
            }}
            title="Close command palette"
          >
            <svg style={{ width: "0.95rem", height: "0.95rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable command list */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "0.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.6rem",
          }}
        >
          {allItems.length === 0 ? (
            <div style={{ padding: "1.5rem", textAlign: "center", color: "#64748B", fontSize: "0.82rem" }}>
              No results found.
            </div>
          ) : (
            Object.entries(categories).map(([category, items]) => (
              <div key={category} style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                {/* Category Header */}
                <span
                  style={{
                    fontSize: "0.68rem",
                    color: darkMode ? "#94a3b8" : "#64748b",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    paddingLeft: "0.65rem",
                    paddingBottom: "0.15rem",
                    letterSpacing: "0.03em",
                  }}
                >
                  {category}
                </span>

                {/* Category items */}
                {items.map((item) => {
                  const currentIndex = itemCounter++;
                  const isSelected = currentIndex === selectedIndex;

                  return (
                    <div
                      key={item.id}
                      onClick={item.action}
                      style={{
                        padding: "0.55rem 0.65rem",
                        borderRadius: "6px",
                        background: isSelected ? (darkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)") : "transparent",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {/* Dashboard loop dotted icon like in image */}
                      <svg style={{ width: "0.9rem", height: "0.9rem", color: isSelected ? (darkMode ? "#94a3b8" : "#334155") : (darkMode ? "#475569" : "#94a3b8") }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="3 3">
                        <circle cx="12" cy="12" r="10"/>
                      </svg>

                      <span
                        style={{
                          fontSize: "0.82rem",
                          fontWeight: isSelected ? 600 : 500,
                          color: isSelected ? (darkMode ? "#f8fafc" : "#0f172a") : (darkMode ? "#94a3b8" : "#475569"),
                        }}
                      >
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
