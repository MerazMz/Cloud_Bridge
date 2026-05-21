import React, { useState, useEffect } from "react";

interface FolderNode {
  id: string;
  fileName: string;
  parentId: string | null;
}

interface DirectorySelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (folderId: string | null) => void;
  darkMode: boolean;
  showToast?: (type: "success" | "error" | "info", msg: string) => void;
}

export function DirectorySelectorModal({
  isOpen,
  onClose,
  onSelect,
  darkMode,
  showToast,
}: DirectorySelectorModalProps) {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [folderChildren, setFolderChildren] = useState<Record<string, FolderNode[]>>({});
  const [loadingFolders, setLoadingFolders] = useState<Record<string, boolean>>({});
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null); // null means root
  const [creatingInFolderId, setCreatingInFolderId] = useState<string | null | undefined>(undefined); // undefined means not creating, null means root, string is folderId
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Load root folders on mount / open
  useEffect(() => {
    if (isOpen) {
      fetchSubfolders(null);
      // Select root by default
      setSelectedFolderId(null);
    }
  }, [isOpen]);

  const fetchSubfolders = async (parentId: string | null) => {
    const key = parentId || "root";
    setLoadingFolders((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await fetch(`/api/folders?parentId=${parentId || ""}`);
      const json = await res.json();
      if (json.success) {
        const folders = json.items.filter((item: any) => item.mimeType === "folder");
        setFolderChildren((prev) => ({ ...prev, [key]: folders }));
      }
    } catch (err) {
      console.error("Failed to load subfolders", err);
    } finally {
      setLoadingFolders((prev) => ({ ...prev, [key]: false }));
    }
  };

  const toggleExpand = (folderId: string) => {
    const isNowExpanded = !expandedFolders[folderId];
    setExpandedFolders((prev) => ({ ...prev, [folderId]: isNowExpanded }));
    if (isNowExpanded && !folderChildren[folderId]) {
      fetchSubfolders(folderId);
    }
  };

  const handleCreateSubfolder = async (e: React.FormEvent, parentId: string | null) => {
    e.preventDefault();
    const folderName = newFolderName.trim();
    if (!folderName) return;

    // Reset input immediately
    setNewFolderName("");
    setCreatingInFolderId(undefined);

    const tempId = `temp-${Date.now()}`;
    const key = parentId || "root";

    // 1. Optimistically update local folder children list
    const tempNode: FolderNode = {
      id: tempId,
      fileName: folderName,
      parentId: parentId,
    };

    setFolderChildren((prev) => {
      const current = prev[key] || [];
      return { ...prev, [key]: [...current, tempNode] };
    });

    // 2. Expand parent immediately so user sees the newly added folder node
    if (parentId) {
      setExpandedFolders((prev) => ({ ...prev, [parentId]: true }));
    }

    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: folderName,
          parentId: parentId,
        }),
      });
      const json = await res.json();
      if (json.success) {
        // Re-fetch folders from backend to replace the temporary ID
        const fetchRes = await fetch(`/api/folders?parentId=${parentId || ""}`);
        const fetchJson = await fetchRes.json();
        if (fetchJson.success) {
          const folders = fetchJson.items.filter((item: any) => item.mimeType === "folder");
          setFolderChildren((prev) => ({ ...prev, [key]: folders }));
        }
      } else {
        if (showToast) {
          showToast("error", json.message || "Failed to create folder.");
        } else {
          console.error(json.message || "Failed to create folder.");
        }
        // Rollback optimistic update
        setFolderChildren((prev) => {
          const current = prev[key] || [];
          return { ...prev, [key]: current.filter((f) => f.id !== tempId) };
        });
      }
    } catch (err) {
      console.error("Failed to create folder", err);
      // Rollback optimistic update
      setFolderChildren((prev) => {
        const current = prev[key] || [];
        return { ...prev, [key]: current.filter((f) => f.id !== tempId) };
      });
    }
  };

  if (!isOpen) return null;

  // Recursive folder tree item renderer
  const renderFolderItem = (folder: FolderNode, level: number) => {
    const isExpanded = !!expandedFolders[folder.id];
    const hasLoadedChildren = !!folderChildren[folder.id];
    const children = folderChildren[folder.id] || [];
    const isLoading = !!loadingFolders[folder.id];
    const isSelected = selectedFolderId === folder.id;

    return (
      <div key={folder.id} style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.4rem 0.6rem",
            borderRadius: "8px",
            background: isSelected 
              ? (darkMode ? "rgba(251, 191, 36, 0.15)" : "rgba(251, 191, 36, 0.12)") 
              : "transparent",
            cursor: "pointer",
            border: isSelected 
              ? "1px solid var(--primary-color, #F59E0B)" 
              : "1px solid transparent",
            marginLeft: `${level * 16}px`,
          }}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedFolderId(folder.id);
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }} onClick={(e) => {
            e.stopPropagation();
            toggleExpand(folder.id);
            setSelectedFolderId(folder.id);
          }}>
            <button
              type="button"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "2px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: darkMode ? "#94a3b8" : "#64748b",
              }}
            >
              {isExpanded ? (
                <svg style={{ width: "0.75rem", height: "0.75rem" }} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg style={{ width: "0.75rem", height: "0.75rem" }} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            <svg style={{ width: "1.05rem", height: "1.05rem", color: "#FBBF24" }} viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 18H4V8h16v10zM12 6l-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8z"/>
            </svg>
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: darkMode ? "#f8fafc" : "#1e293b" }}>
              {folder.fileName}
            </span>
          </div>

          <button
            type="button"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              borderRadius: "4px",
              color: darkMode ? "#a5f3fc" : "#0369a1",
              fontSize: "0.75rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "2px",
            }}
            onClick={(e) => {
              e.stopPropagation();
              setCreatingInFolderId(folder.id);
              setNewFolderName("");
            }}
          >
            + New
          </button>
        </div>

        {/* Inline Create Folder Input under this folder node */}
        {creatingInFolderId === folder.id && (
          <div style={{ marginLeft: `${(level + 1) * 16}px`, padding: "4px 8px" }}>
            <form onSubmit={(e) => handleCreateSubfolder(e, folder.id)} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="New folder name"
                autoFocus
                style={{
                  padding: "4px 8px",
                  fontSize: "0.8rem",
                  borderRadius: "6px",
                  border: darkMode ? "1px solid #475569" : "1px solid #cbd5e1",
                  background: darkMode ? "#1e293b" : "#ffffff",
                  color: darkMode ? "#ffffff" : "#000000",
                  outline: "none",
                }}
              />
              <button
                type="submit"
                disabled={isCreatingFolder}
                style={{
                  background: "#F59E0B",
                  color: "#000000",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  padding: "4px 8px",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                {isCreatingFolder ? "..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setCreatingInFolderId(undefined)}
                style={{
                  background: "transparent",
                  color: darkMode ? "#94a3b8" : "#64748b",
                  fontSize: "0.75rem",
                  padding: "4px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </form>
          </div>
        )}

        {isExpanded && isLoading && (
          <div style={{ marginLeft: `${(level + 1) * 16}px`, fontSize: "0.75rem", color: "#64748b" }}>
            Loading...
          </div>
        )}

        {isExpanded && hasLoadedChildren && children.map((child) => renderFolderItem(child, level + 1))}
      </div>
    );
  };

  const rootChildren = folderChildren["root"] || [];
  const rootLoading = !!loadingFolders["root"];
  const isRootSelected = selectedFolderId === null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: darkMode ? "rgba(15, 23, 42, 0.75)" : "rgba(15, 23, 42, 0.4)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: darkMode ? "#1e293b" : "#ffffff",
          border: darkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)",
          borderRadius: "16px",
          padding: "1.5rem",
          width: "100%",
          maxWidth: "460px",
          maxHeight: "80vh",
          boxShadow: darkMode ? "0 25px 50px -12px rgba(0, 0, 0, 0.5)" : "0 25px 50px -12px rgba(15, 23, 42, 0.15)",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: darkMode ? "#ffffff" : "#0f172a", margin: 0, fontFamily: "var(--font-outfit)" }}>
            Select Upload Directory
          </h3>
          <p style={{ fontSize: "0.78rem", color: darkMode ? "#94a3b8" : "#64748b", margin: "0.2rem 0 0 0", fontWeight: 500 }}>
            Choose where to upload your file(s) from the tree below.
          </p>
        </div>

        {/* Directory Tree Wrapper */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            minHeight: "200px",
            maxHeight: "350px",
            border: darkMode ? "1px solid #334155" : "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "0.75rem",
            background: darkMode ? "#0f172a" : "#f8fafc",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          {/* Root Directory Node */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.4rem 0.6rem",
                borderRadius: "8px",
                background: isRootSelected 
                  ? (darkMode ? "rgba(251, 191, 36, 0.15)" : "rgba(251, 191, 36, 0.12)") 
                  : "transparent",
                cursor: "pointer",
                border: isRootSelected 
                  ? "1px solid var(--primary-color, #F59E0B)" 
                  : "1px solid transparent",
              }}
              onClick={() => setSelectedFolderId(null)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <svg style={{ width: "1.05rem", height: "1.05rem", color: "#FBBF24" }} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                </svg>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: darkMode ? "#f8fafc" : "#1e293b" }}>
                  / (Root Directory)
                </span>
              </div>

              <button
                type="button"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  borderRadius: "4px",
                  color: darkMode ? "#a5f3fc" : "#0369a1",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: "2px",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setCreatingInFolderId(null);
                  setNewFolderName("");
                }}
              >
                + New
              </button>
            </div>

            {/* Inline Create Folder Input under Root */}
            {creatingInFolderId === null && (
              <div style={{ marginLeft: "16px", padding: "4px 8px" }}>
                <form onSubmit={(e) => handleCreateSubfolder(e, null)} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="New folder name"
                    autoFocus
                    style={{
                      padding: "4px 8px",
                      fontSize: "0.8rem",
                      borderRadius: "6px",
                      border: darkMode ? "1px solid #475569" : "1px solid #cbd5e1",
                      background: darkMode ? "#1e293b" : "#ffffff",
                      color: darkMode ? "#ffffff" : "#000000",
                      outline: "none",
                    }}
                  />
                  <button
                    type="submit"
                    disabled={isCreatingFolder}
                    style={{
                      background: "#F59E0B",
                      color: "#000000",
                      fontWeight: 700,
                      fontSize: "0.75rem",
                      padding: "4px 8px",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    {isCreatingFolder ? "..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreatingInFolderId(undefined)}
                    style={{
                      background: "transparent",
                      color: darkMode ? "#94a3b8" : "#64748b",
                      fontSize: "0.75rem",
                      padding: "4px",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </form>
              </div>
            )}

            {rootLoading && (
              <div style={{ marginLeft: "16px", fontSize: "0.75rem", color: "#64748b", padding: "4px" }}>
                Loading...
              </div>
            )}

            {rootChildren.map((folder) => renderFolderItem(folder, 1))}
          </div>
        </div>

        {/* Footer Buttons */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px", marginTop: "0.5rem" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "0.55rem 1.15rem",
              borderRadius: "8px",
              fontSize: "0.8rem",
              fontWeight: 700,
              background: darkMode ? "#334155" : "#e2e8f0",
              color: darkMode ? "#f1f5f9" : "#475569",
              border: "none",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSelect(selectedFolderId)}
            style={{
              padding: "0.55rem 1.15rem",
              borderRadius: "8px",
              fontSize: "0.8rem",
              fontWeight: 800,
              background: "#FBBF24",
              color: "#000000",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 6px -1px rgba(245, 158, 11, 0.2)",
            }}
          >
            Select & Choose File
          </button>
        </div>
      </div>
    </div>
  );
}
