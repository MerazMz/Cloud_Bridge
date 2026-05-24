"use client";

import React from "react";
import { DBFile } from "@/types/file.types";
import { FilesGridList } from "./files-grid-list";

interface SharedViewProps {
  files: DBFile[];
  darkMode: boolean;
  viewMode: "grid" | "list";
  setViewMode: (mode: "grid" | "list") => void;
  gridSize: number;
  setGridSize: (size: number) => void;
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
  filesLoading: boolean;
  semanticSearchLoading: boolean;
  searchTerm: string;

  // Handlers
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

export const SharedView = ({
  files,
  darkMode,
  viewMode,
  setViewMode,
  gridSize,
  setGridSize,
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
  filesLoading,
  semanticSearchLoading,
  searchTerm,
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
}: SharedViewProps) => {
  return (
    <div
      className="glass-card animate-slide-up"
      style={{
        borderRadius: "16px",
        background: "var(--bg-card)",
        border: "1px solid var(--border-default)",
        padding: "1.5rem 1.65rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.15rem",
        boxShadow: "var(--glass-shadow)",
        animationDelay: "0.25s",
      }}
    >
      {/* Header title & controls row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <h3 style={{ fontSize: "0.98rem", fontWeight: 800, color: darkMode ? "#ffffff" : "#0f172a", letterSpacing: "-0.015em", textTransform: "capitalize" }}>
          Shared Downloader Links
        </h3>

        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
          {/* Segmented View Mode Controller */}
          <div
            style={{
              display: "flex",
              background: darkMode ? "rgba(30, 41, 59, 0.45)" : "rgba(15, 23, 42, 0.05)",
              border: darkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)",
              borderRadius: "8px",
              padding: "2px",
            }}
          >
            <button
              onClick={() => setViewMode("list")}
              style={{
                padding: "0.35rem 0.55rem",
                background: viewMode === "list" ? "rgba(245, 158, 11, 0.15)" : "transparent",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: viewMode === "list" ? (darkMode ? "#FBBF24" : "#D97706") : (darkMode ? "#94a3b8" : "#64748b"),
                fontSize: "0.82rem",
                fontWeight: 700,
                transition: "all 0.2s ease",
              }}
              title="Switch to detailed File list"
            >
              List
            </button>
            <button
              onClick={() => setViewMode("grid")}
              style={{
                padding: "0.35rem 0.55rem",
                background: viewMode === "grid" ? "rgba(245, 158, 11, 0.15)" : "transparent",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: viewMode === "grid" ? (darkMode ? "#FBBF24" : "#D97706") : (darkMode ? "#94a3b8" : "#64748b"),
                fontSize: "0.82rem",
                fontWeight: 700,
                transition: "all 0.2s ease",
              }}
              title="Switch to card visual Grid"
            >
              Grid
            </button>
          </div>

          {/* Grid Size Control Slider */}
          {viewMode === "grid" && (
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.45rem",
              background: darkMode ? "rgba(30, 41, 59, 0.45)" : "rgba(15, 23, 42, 0.05)",
              border: darkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)",
              borderRadius: "8px",
              padding: "0.35rem 0.65rem",
              transition: "all 0.3s ease",
              height: "32px"
            }}>
              <span style={{ fontSize: "0.68rem", color: darkMode ? "#94a3b8" : "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>Size:</span>
              <input
                type="range"
                min="100"
                max="240"
                value={gridSize}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setGridSize(val);
                  if (typeof window !== "undefined") {
                    localStorage.setItem("gridSize", val.toString());
                  }
                }}
                style={{
                  width: "60px",
                  accentColor: darkMode ? "#FBBF24" : "#D97706",
                  cursor: "ew-resize",
                  height: "4px"
                }}
              />
              <span style={{ fontSize: "0.68rem", color: darkMode ? "#FBBF24" : "#D97706", fontWeight: 800, width: "30px", textAlign: "right" }}>{gridSize}px</span>
            </div>
          )}
        </div>
      </div>

      {/* Shared items grid list */}
      <FilesGridList
        files={files}
        darkMode={darkMode}
        viewMode={viewMode}
        gridSize={gridSize}
        favorites={favorites}
        selectedActiveIds={selectedActiveIds}
        isMultiSelectMode={isMultiSelectMode}
        activeMenuFileId={activeMenuFileId}
        setActiveMenuFileId={setActiveMenuFileId}
        hoveredFileId={hoveredFileId}
        setHoveredFileId={setHoveredFileId}
        draggedItem={draggedItem}
        dragOverItem={dragOverItem}
        mergingSourceId={mergingSourceId}
        mergingTargetId={mergingTargetId}
        filesLoading={filesLoading}
        semanticSearchLoading={semanticSearchLoading}
        searchTerm={searchTerm}
        handleToggleSelectActive={handleToggleSelectActive}
        setActiveDocumentViewerFileId={setActiveDocumentViewerFileId}
        handleDragStart={handleDragStart}
        handleDragEnd={handleDragEnd}
        handleDragOver={handleDragOver}
        handleDragLeave={handleDragLeave}
        handleItemDrop={handleItemDrop}
        handleToggleFavorite={handleToggleFavorite}
        handleInitiateRename={handleInitiateRename}
        handleOpenShareModal={handleOpenShareModal}
        handleMoveToTrash={handleMoveToTrash}
        handleDeleteFile={handleDeleteFile}
        handleRestoreFile={handleRestoreFile}
        handleRevokeShare={handleRevokeShare}
        setIsMultiSelectMode={setIsMultiSelectMode}
        setSelectedActiveIds={setSelectedActiveIds}
        setSelectedDetailsFile={setSelectedDetailsFile}
        handleDownload={handleDownload}
      />
    </div>
  );
};
