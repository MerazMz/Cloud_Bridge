"use client";

import { useState, useEffect, useRef, ChangeEvent, DragEvent, Suspense } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSemanticSearch } from "@/hooks/use-semantic-search";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/components/ui/toast";
import { useSearchParams, useRouter } from "next/navigation";

// Modular sub-components
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { WelcomeBanner } from "@/components/dashboard/welcome-banner";
import { MetricsGrid } from "@/components/dashboard/metrics-grid";
import { UploaderPanel } from "@/components/dashboard/uploader-panel";
import { StorageUsageDonut } from "@/components/dashboard/storage-usage-donut";
import { RecentActivityTimeline } from "@/components/dashboard/recent-activity-timeline";
import { RecentFilesTable } from "@/components/dashboard/recent-files-table";
import { CommandPalette } from "@/components/dashboard/command-palette";
import { VideoThumbnail } from "@/components/dashboard/video-thumbnail";
import { DocumentViewer } from "@/components/dashboard/document-viewer";
import { DirectorySelectorModal } from "@/components/dashboard/directory-selector-modal";
import { ConfirmationModal } from "@/components/dashboard/confirmation-modal";

import { DBFile } from "@/types/file.types";

export interface NotificationItem {
  id: string;
  type: "success" | "cancel" | "error" | "info";
  message: string;
  timestamp: Date;
  read: boolean;
}

export interface QueueItem {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "completed" | "failed" | "cancelled";
  speed?: string;
  uploadedBytes?: number;
  parentId?: string | null;
  cancel?: () => void;
}

function DashboardContent() {
  const { user, loading, error } = useAuth();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get("tab") || "dashboard";

  const {
    searchTerm,
    setSearchTerm,
    loading: semanticSearchLoading,
    results: semanticSearchResults,
  } = useSemanticSearch("", 600);

  const [files, setFiles] = useState<DBFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({});
  const [downloadingIds, setDownloadingIds] = useState<Record<string, boolean>>({});
  const [compressVideo, setCompressVideo] = useState<boolean>(false);

  // Load video compression preference from localStorage on mount
  useEffect(() => {
    const savedCompress = localStorage.getItem("cloudbridge_compress_video");
    if (savedCompress !== null) {
      setCompressVideo(savedCompress === "true");
    }
  }, []);

  const handleToggleCompressVideo = (val: boolean) => {
    setCompressVideo(val);
    localStorage.setItem("cloudbridge_compress_video", val ? "true" : "false");
    showToast("success", `Video compression turned ${val ? "ON" : "OFF"}.`);
  };

  const compressVideoRef = useRef(compressVideo);
  useEffect(() => {
    compressVideoRef.current = compressVideo;
  }, [compressVideo]);
  const [allFiles, setAllFiles] = useState<DBFile[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: "danger" | "warning" | "info";
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const showConfirm = (options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: "danger" | "warning" | "info";
    onConfirm: () => void;
  }) => {
    setConfirmModal({
      isOpen: true,
      title: options.title,
      message: options.message,
      confirmText: options.confirmText,
      cancelText: options.cancelText,
      type: options.type,
      onConfirm: () => {
        options.onConfirm();
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };
  const [isSyncing, setIsSyncing] = useState(false);

  // Folder Directory Navigation States
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderBreadcrumbs, setFolderBreadcrumbs] = useState<Array<{ id: string; name: string }>>([]);
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // View Layout Modes (List vs Grid) and Dynamic Grid Size Slider Controller
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [gridSize, setGridSize] = useState<number>(160); // Dynamic card width: 100px - 260px
  const [hoveredFileId, setHoveredFileId] = useState<string | null>(null);
  const [selectedDetailsFile, setSelectedDetailsFile] = useState<DBFile | null>(null);

  // Lightweight Image Viewer Modal States
  const [activeImageViewerFileId, setActiveImageViewerFileId] = useState<string | null>(null);
  const [activeDocumentViewerFileId, setActiveDocumentViewerFileId] = useState<string | null>(null);
  const [renameModalFile, setRenameModalFile] = useState<DBFile | null>(null);
  const [renameModalValue, setRenameModalValue] = useState("");
  const [renameModalLoading, setRenameModalLoading] = useState(false);
  const [imageZoom, setImageZoom] = useState<number>(1);
  const [imageRotation, setImageRotation] = useState<number>(0);
  const [imageFlipH, setImageFlipH] = useState<boolean>(false);
  const [imageFlipV, setImageFlipV] = useState<boolean>(false);
  const [isVideoBuffering, setIsVideoBuffering] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Reset video buffering state on file switch or close
  useEffect(() => {
    setIsVideoBuffering(false);
  }, [activeImageViewerFileId]);

  // Command palette state
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const addNotification = (type: "success" | "cancel" | "error" | "info", message: string) => {
    setNotifications((prev) => [
      {
        id: Math.random().toString(),
        type,
        message,
        timestamp: new Date(),
        read: false,
      },
      ...prev,
    ]);
  };

  // Upload Queue State
  const [uploadQueue, setUploadQueue] = useState<QueueItem[]>([]);
  const [isChooseDirModalOpen, setIsChooseDirModalOpen] = useState(false);
  const [uploadTargetFolderId, setUploadTargetFolderId] = useState<string | null>(null);

  const addFilesToQueue = (fileList: FileList | File[], targetParentId?: string | null) => {
    const parentId = targetParentId !== undefined ? targetParentId : currentFolderId;
    const newItems: QueueItem[] = Array.from(fileList).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      progress: 0,
      status: "pending",
      speed: "0 KB/s",
      uploadedBytes: 0,
      parentId: parentId,
    }));
    setUploadQueue((prev) => [...prev, ...newItems]);
  };

  const handleClearCompleted = () => {
    setUploadQueue((prev) =>
      prev.filter((i) => i.status !== "completed" && i.status !== "cancelled" && i.status !== "failed")
    );
  };

  // Keyboard shortcut listener for Command Palette (Cmd + K / Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Client-side visual state features
  const [favorites, setFavorites] = useState<string[]>([]);
  const [sharedIds, setSharedIds] = useState<string[]>([]);
  const [selectedFolderCategory, setSelectedFolderCategory] = useState<string | null>(null);
  const [activeMenuFileId, setActiveMenuFileId] = useState<string | null>(null);

  // Keyboard navigation & zoom shortcuts listener for Image Viewer
  useEffect(() => {
    if (!activeImageViewerFileId) return;

    // Helper to determine if file is a viewer-supported image or video
    const isImageFile = (file: DBFile) => {
      const mimeLower = (file.mimeType || "").toLowerCase();
      const nameLower = (file.fileName || "").toLowerCase();
      return (
        mimeLower.startsWith("image/") || 
        mimeLower.startsWith("video/") ||
        ((mimeLower === "application/octet-stream" || !mimeLower) && 
         /\.(png|jpg|jpeg|gif|webp|svg|mp4|mov|webm|mkv|avi)$/i.test(nameLower))
      );
    };

    // Calculate activeImages dynamically on keydown event to satisfy Rules of Hooks perfectly
    const getActiveImages = () => {
      const activeFiles = files.filter((f) => !f.isDeleted);
      let visibleFiles: DBFile[] = [];
      if (tab === "dashboard") {
        visibleFiles = activeFiles.slice(0, 5);
      } else if (tab === "my-files" || tab === "recent") {
        visibleFiles = activeFiles;
      } else if (tab === "favorites") {
        visibleFiles = activeFiles.filter((f) => favorites.includes(f.id));
      } else if (tab === "shared") {
        visibleFiles = activeFiles.filter((f) => f.isShared);
      } else if (tab === "trash") {
        visibleFiles = files.filter((f) => f.isDeleted);
      } else if (tab === "folders") {
        if (selectedFolderCategory === "images") visibleFiles = activeFiles.filter(f => classifyFile(f.mimeType, f.fileName) === "image");
        else if (selectedFolderCategory === "documents") visibleFiles = activeFiles.filter(f => classifyFile(f.mimeType, f.fileName) === "document");
        else if (selectedFolderCategory === "media") visibleFiles = activeFiles.filter(f => classifyFile(f.mimeType, f.fileName) === "media");
        else if (selectedFolderCategory === "archives") visibleFiles = activeFiles.filter(f => classifyFile(f.mimeType, f.fileName) === "archive");
        else visibleFiles = activeFiles.filter(f => 
          classifyFile(f.mimeType, f.fileName) !== "image" &&
          classifyFile(f.mimeType, f.fileName) !== "document" &&
          classifyFile(f.mimeType, f.fileName) !== "media" &&
          classifyFile(f.mimeType, f.fileName) !== "archive"
        );
      }

      const finalFiltered = visibleFiles.filter((f) =>
        f.fileName.toLowerCase().includes(searchTerm.toLowerCase())
      );

      return (
        (tab === "dashboard" || tab === "my-files")
          ? finalFiltered.filter((f) => f.mimeType !== "folder")
          : finalFiltered
      ).filter(isImageFile);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const currentImages = getActiveImages();
      const currentIndex = currentImages.findIndex((img) => img.id === activeImageViewerFileId);
      const activeFile = currentImages[currentIndex];
      const isVideo = activeFile && (
        activeFile.mimeType.startsWith("video/") ||
        /\.(mp4|mov|webm|mkv|avi)$/i.test(activeFile.fileName.toLowerCase())
      );

      if (e.key === "Escape") {
        setActiveImageViewerFileId(null);
      } else if (e.key === "ArrowRight") {
        if (isVideo) {
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = Math.min(videoRef.current.currentTime + 10, videoRef.current.duration || 0);
          }
        } else {
          if (currentIndex !== -1 && currentIndex < currentImages.length - 1) {
            setActiveImageViewerFileId(currentImages[currentIndex + 1].id);
            setImageZoom(1);
            setImageRotation(0);
            setImageFlipH(false);
            setImageFlipV(false);
          }
        }
      } else if (e.key === "ArrowLeft") {
        if (isVideo) {
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = Math.max(videoRef.current.currentTime - 10, 0);
          }
        } else {
          if (currentIndex !== -1 && currentIndex > 0) {
            setActiveImageViewerFileId(currentImages[currentIndex - 1].id);
            setImageZoom(1);
            setImageRotation(0);
            setImageFlipH(false);
            setImageFlipV(false);
          }
        }
      } else if (e.key === " ") {
        if (isVideo) {
          e.preventDefault();
          if (videoRef.current) {
            if (videoRef.current.paused) {
              videoRef.current.play().catch(() => {});
            } else {
              videoRef.current.pause();
            }
          }
        }
      } else if (e.key === "=" || e.key === "+") {
        setImageZoom((z) => Math.min(z + 0.25, 4));
      } else if (e.key === "-") {
        setImageZoom((z) => Math.max(z - 0.25, 0.5));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeImageViewerFileId, files, tab, favorites, sharedIds, selectedFolderCategory, searchTerm, videoRef]);

  // Touchpad pinch-to-zoom for the image viewer
  useEffect(() => {
    if (!activeImageViewerFileId) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 0.08 : -0.08;
        setImageZoom((z) => Math.max(0.25, Math.min(z + factor, 5)));
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", handleWheel);
    };
  }, [activeImageViewerFileId]);

  // Click-outside listener for dropdown menus
  useEffect(() => {
    const handleGlobalClick = () => {
      setActiveMenuFileId(null);
    };
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  // Cover banner state variables
  const [showBanner, setShowBanner] = useState(true);
  const [isBannerVisible, setIsBannerVisible] = useState(true);

  const handleCloseBanner = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsBannerVisible(false);
    setTimeout(() => {
      setShowBanner(false);
    }, 400);
  };

  // Upload Progress and Cancel State
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(null);
  const [uploadingFileSize, setUploadingFileSize] = useState<number>(0);
  const [uploadSpeed, setUploadSpeed] = useState<string | null>(null);
  const [uploadedBytes, setUploadedBytes] = useState<number>(0);
  const startTimeRef = useRef<number | null>(null);
  const cancelUploadRef = useRef<(() => void) | null>(null);
  const currentJobIdRef = useRef<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize theme and local storage states
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme === "dark") {
        document.documentElement.classList.add("dark");
        setDarkMode(true);
      } else if (savedTheme === "light") {
        document.documentElement.classList.remove("dark");
        setDarkMode(false);
      } else {
        const hasDarkClass = document.documentElement.classList.contains("dark");
        setDarkMode(hasDarkClass);
      }

      // Load favorites
      try {
        const favs = localStorage.getItem("favorites");
        if (favs) setFavorites(JSON.parse(favs));
      } catch {}

      // Load shared
      try {
        const sh = localStorage.getItem("shared_ids");
        if (sh) setSharedIds(JSON.parse(sh));
      } catch {}

      // Load viewMode
      try {
        const savedViewMode = localStorage.getItem("viewMode");
        if (savedViewMode === "list" || savedViewMode === "grid") {
          setViewMode(savedViewMode);
        }
      } catch {}

      // Load gridSize
      try {
        const savedGridSize = localStorage.getItem("gridSize");
        if (savedGridSize) {
          const parsed = parseInt(savedGridSize, 10);
          if (!isNaN(parsed) && parsed >= 100 && parsed <= 260) {
            setGridSize(parsed);
          }
        }
      } catch {}
    }
  }, []);

  const toggleDarkMode = () => {
    const nextDark = !darkMode;
    setDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const fetchAllFiles = async () => {
    try {
      const res = await fetch("/api/files");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setAllFiles(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch all files for global analytics", err);
    }
  };

  const fetchFiles = async (folderId: string | null = currentFolderId) => {
    setFilesLoading(true);
    try {
      const res = await fetch(`/api/folders?parentId=${folderId || ""}`);
      const json = await res.json();
      if (json.success) {
        setFiles(json.items);
      } else {
        showToast("error", json.message || "Failed to load files.");
      }
    } catch (err) {
      showToast("error", "An error occurred while fetching files.");
    } finally {
      setFilesLoading(false);
    }
  };

  // Helper actions to handle folder navigation and creation
  const handleCreateFolder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newFolderName.trim()) return;

    setIsCreatingFolder(true);
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFolderName.trim(),
          parentId: currentFolderId,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("success", `Folder "${newFolderName}" created.`);
        setNewFolderName("");
        setIsNewFolderModalOpen(false);
        fetchFiles(currentFolderId);
        fetchAllFiles();
      } else {
        showToast("error", json.message || "Failed to create folder.");
      }
    } catch (err) {
      showToast("error", "An error occurred while creating the folder.");
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleEnterFolder = (folderId: string, folderName: string) => {
    const newBreadcrumbs = [...folderBreadcrumbs, { id: folderId, name: folderName }];
    setFolderBreadcrumbs(newBreadcrumbs);
    setCurrentFolderId(folderId);
  };

  const handleNavigateBreadcrumb = (index: number) => {
    if (index === -1) {
      setFolderBreadcrumbs([]);
      setCurrentFolderId(null);
    } else {
      const clickedBreadcrumb = folderBreadcrumbs[index];
      const newBreadcrumbs = folderBreadcrumbs.slice(0, index + 1);
      setFolderBreadcrumbs(newBreadcrumbs);
      setCurrentFolderId(clickedBreadcrumb.id);
    }
  };

  useEffect(() => {
    if (user && user.storageChannelId) {
      fetchFiles(currentFolderId);
    }
  }, [user, currentFolderId]);

  useEffect(() => {
    if (user && user.storageChannelId) {
      fetchAllFiles();
    }
  }, [user]);

  // Trigger background embedding backfill on user authentication
  useEffect(() => {
    if (user) {
      fetch("/api/files/backfill", { method: "POST" })
        .then(async (res) => {
          const json = await res.json();
          if (json.success) {
            console.log("Embedding backfill check completed:", json.message);
          }
        })
        .catch((err) => {
          console.error("Failed to check/trigger embedding backfill:", err);
        });
    }
  }, [user]);

  const handleSyncSemanticSearch = async (force = false) => {
    if (isSyncing) return;
    setIsSyncing(true);
    showToast("info", force ? "Forcing generation of all image embeddings in background..." : "Triggering semantic search sync for previous image files...");
    try {
      const res = await fetch("/api/files/backfill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ force }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("success", "Semantic search sync successfully started in background.");
        addNotification("success", force ? "Full embedding re-generation started." : "Missing image embedding backfill started.");
      } else {
        showToast("error", json.message || "Failed to trigger embedding sync.");
      }
    } catch (err: any) {
      showToast("error", err.message || "An error occurred while connecting to backfill service.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Sequential Upload Queue Runner Effect Hook
  useEffect(() => {
    const activeItem = uploadQueue.find((item) => item.status === "uploading");
    const nextItem = uploadQueue.find((item) => item.status === "pending");

    if (nextItem && !activeItem) {
      uploadQueueItem(nextItem.id, nextItem.file, nextItem.parentId);
    }
  }, [uploadQueue]);

  // Helper to perform uploads via XMLHttpRequest to track client-to-server progress instantly
  const uploadFileWithXhr = (params: {
    url: string;
    file: File;
    headers?: Record<string, string>;
    formData?: FormData;
    onProgress: (percent: number, loaded: number, total: number, speed: string) => void;
    signal: AbortSignal;
  }): Promise<any> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", params.url);

      if (params.headers) {
        Object.entries(params.headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });
      }

      const startTime = Date.now();

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          const elapsed = (Date.now() - startTime) / 1000;
          let speedStr = "0 KB/s";
          if (elapsed > 0.5) {
            const speedBytesPerSec = event.loaded / elapsed;
            if (speedBytesPerSec > 1024 * 1024) {
              speedStr = `${(speedBytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
            } else if (speedBytesPerSec > 1024) {
              speedStr = `${(speedBytesPerSec / 1024).toFixed(0)} KB/s`;
            } else {
              speedStr = `${speedBytesPerSec.toFixed(0)} B/s`;
            }
          }
          params.onProgress(percent, event.loaded, event.total, speedStr);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            resolve({ success: true });
          }
        } else {
          let errorMsg = "Upload failed";
          try {
            const parsed = JSON.parse(xhr.responseText);
            errorMsg = parsed.message || errorMsg;
          } catch {}
          reject(new Error(errorMsg));
        }
      };

      xhr.onerror = () => {
        reject(new Error("Network error during upload"));
      };

      xhr.onabort = () => {
        reject(new Error("Upload cancelled"));
      };

      params.signal.addEventListener("abort", () => {
        xhr.abort();
      });

      if (params.formData) {
        xhr.send(params.formData);
      } else {
        xhr.send(params.file);
      }
    });
  };

  // Processes and uploads a single item in the queue sequentially
  const uploadQueueItem = async (itemId: string, file: File, itemParentId?: string | null) => {

    // 2. Mark status as uploading
    setUploadQueue((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, status: "uploading", progress: 0 } : i))
    );

    // Sync global state values to drive bottom progress HUD beautifully
    setIsUploading(true);
    setUploadProgress(0);
    setUploadingFileName(file.name);
    setUploadingFileSize(file.size);
    setUploadSpeed("0 KB/s");
    setUploadedBytes(0);

    const abortController = new AbortController();
    
    // Store cancel handle inside queue item
    setUploadQueue((prev) =>
      prev.map((i) =>
        i.id === itemId ? { ...i, cancel: () => abortController.abort() } : i
      )
    );

    // Link global sticky bottom HUD triggers to active queue uploader abort controller
    cancelUploadRef.current = () => {
      abortController.abort();
    };

    let currentJobId: string | null = null;

    try {
      // 1. Ingest streaming upload to disk and get background queue jobId
      const headers: Record<string, string> = {
        "x-file-name": encodeURIComponent(file.name),
        "x-file-size": file.size.toString(),
      };
      if (itemParentId) {
        headers["x-parent-id"] = itemParentId;
      }
      if (compressVideoRef.current) {
        headers["x-compress-video"] = "true";
      }

      const responseData = await uploadFileWithXhr({
        url: "/api/files/upload",
        file,
        headers,
        signal: abortController.signal,
        onProgress: (percent, loaded, total, speed) => {
          const displayPercent = Math.max(0, Math.min(99, percent));
          setUploadQueue((prev) =>
            prev.map((i) =>
              i.id === itemId
                ? {
                    ...i,
                    progress: displayPercent,
                    speed: `${speed} (to server)`,
                    uploadedBytes: loaded,
                  }
                : i
            )
          );
          setUploadProgress(displayPercent);
          setUploadedBytes(loaded);
          setUploadSpeed(`${speed} (to server)`);
        },
      });

      const { jobId } = responseData;
      currentJobId = jobId;
      currentJobIdRef.current = jobId;

      // 2. Connect to SSE telemetry stream for live speed, bytes, and percentage
      const response = await fetch(`/api/files/upload/progress?jobId=${jobId}`, {
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        let errMsg = "Failed to establish progress stream.";
        try {
          const errJson = JSON.parse(errText);
          errMsg = errJson.message || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Failed to read progress stream.");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const cleanLine = line.trim();
          if (cleanLine.startsWith("data: ")) {
            const dataStr = cleanLine.slice(6).trim();
            if (!dataStr) continue;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.type === "progress") {
                // Update queue progress states
                setUploadQueue((prev) =>
                  prev.map((i) =>
                    i.id === itemId
                      ? {
                          ...i,
                          progress: parsed.percent,
                          speed: parsed.speed,
                          uploadedBytes: parsed.uploadedBytes,
                        }
                      : i
                  )
                );

                // Update global HUD
                setUploadProgress(parsed.percent);
                setUploadedBytes(parsed.uploadedBytes);
                setUploadSpeed(parsed.speed);
              } else if (parsed.type === "success") {
                showToast("success", `${file.name} uploaded successfully.`);
                addNotification("success", `${file.name} uploaded successfully.`);
                
                // Fetch the updated files list scoped to current folder
                fetchFiles(currentFolderId);
                fetchAllFiles();

                // Complete queue item
                setUploadQueue((prev) =>
                  prev.map((i) =>
                    i.id === itemId ? { ...i, status: "completed", progress: 100 } : i
                  )
                );
              } else if (parsed.type === "error") {
                throw new Error(parsed.message || "Failed to upload file.");
              }
            } catch (jsonErr) {
              console.error("Failed to parse progress SSE JSON chunk", jsonErr);
            }
          }
        }
      }
    } catch (err: any) {
      const isCancelled = err.name === "AbortError" || err.message === "Upload cancelled";
      
      if (isCancelled && currentJobId) {
        fetch("/api/files/upload/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId: currentJobId }),
        }).catch((e) => console.error("Failed to propagate cancel signal to queue", e));
      }

      showToast(isCancelled ? "info" : "error", isCancelled ? "Upload cancelled." : err.message || "An error occurred while uploading.");
      addNotification(isCancelled ? "cancel" : "error", isCancelled ? `${file.name} upload cancelled.` : `Failed to upload ${file.name}: ${err.message}`);

      // Fail queue item
      setUploadQueue((prev) =>
        prev.map((i) =>
          i.id === itemId ? { ...i, status: isCancelled ? "cancelled" : "failed" } : i
        )
      );
    } finally {
      // Release current global refs
      cancelUploadRef.current = null;
      currentJobIdRef.current = null;

      // Check if there are any remaining items in the queue that are pending or active
      let hasMore = false;
      setUploadQueue((current) => {
        hasMore = current.some((i) => i.id !== itemId && (i.status === "pending" || i.status === "uploading"));
        return current;
      });

      if (!hasMore) {
        // Clear global states so that if the queue finishes, the bottom HUD goes away!
        setIsUploading(false);
        setUploadProgress(null);
        setUploadingFileName(null);
        setUploadSpeed(null);
        setUploadedBytes(0);
        setUploadingFileSize(0);
      }
    }
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadingFileName(file.name);
    setUploadingFileSize(file.size);
    setUploadSpeed("0 KB/s");
    setUploadedBytes(0);
    startTimeRef.current = Date.now();

    const abortController = new AbortController();
    cancelUploadRef.current = () => {
      abortController.abort();
    };

    try {
      // 1. Ingest streaming upload to disk and get background queue jobId
      const formData = new FormData();
      formData.append("file", file);

      const headers: Record<string, string> = {};
      if (compressVideoRef.current) {
        headers["x-compress-video"] = "true";
      }

      const responseData = await uploadFileWithXhr({
        url: "/api/files/upload",
        file,
        formData,
        headers,
        signal: abortController.signal,
        onProgress: (percent, loaded, total, speed) => {
          const displayPercent = Math.max(0, Math.min(99, percent));
          setUploadProgress(displayPercent);
          setUploadedBytes(loaded);
          setUploadSpeed(`${speed} (to server)`);
        },
      });

      const { jobId } = responseData;
      currentJobIdRef.current = jobId;

      // 2. Connect to SSE telemetry stream for live speed, bytes, and percentage
      const response = await fetch(`/api/files/upload/progress?jobId=${jobId}`, {
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        let errMsg = "Failed to establish progress stream.";
        try {
          const errJson = JSON.parse(errText);
          errMsg = errJson.message || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Failed to read progress stream.");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const cleanLine = line.trim();
          if (cleanLine.startsWith("data: ")) {
            const dataStr = cleanLine.slice(6).trim();
            if (!dataStr) continue;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.type === "progress") {
                setUploadProgress(parsed.percent);
                setUploadedBytes(parsed.uploadedBytes);
                if (parsed.totalBytes) {
                  setUploadingFileSize(parsed.totalBytes);
                }
                setUploadSpeed(parsed.speed);
              } else if (parsed.type === "success") {
                showToast("success", `${file.name} uploaded successfully.`);
                addNotification("success", `${file.name} uploaded successfully.`);
                if (parsed.data) {
                  setFiles((prev) => [parsed.data, ...prev]);
                }
              } else if (parsed.type === "error") {
                throw new Error(parsed.message || "Failed to upload file.");
              }
            } catch (jsonErr) {
              console.error("Failed to parse progress SSE JSON chunk", jsonErr);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError" || err.message === "Upload cancelled") {
        showToast("info", "Upload cancelled.");
        addNotification("cancel", `${file.name} upload cancelled.`);
      } else {
        showToast("error", err.message || "An error occurred while uploading the file.");
        addNotification("error", `Failed to upload ${file.name}: ${err.message}`);
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      setUploadingFileName(null);
      setUploadSpeed(null);
      setUploadedBytes(0);
      setUploadingFileSize(0);
      startTimeRef.current = null;
      cancelUploadRef.current = null;
      currentJobIdRef.current = null;
    }
  };

  const handleCancelUpload = async () => {
    if (cancelUploadRef.current) {
      cancelUploadRef.current();
    }
    const jobId = currentJobIdRef.current;
    if (jobId) {
      fetch("/api/files/upload/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      }).catch((e) => console.error("Failed to propagate cancel signal to queue", e));
    }
  };

  const handleDownload = async (fileId: string, fileName: string) => {
    setDownloadingIds((prev) => ({ ...prev, [fileId]: true }));
    try {
      const res = await fetch(`/api/files/${fileId}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message || "Download failed.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast("success", `${fileName} downloaded successfully.`);
    } catch (err: any) {
      showToast("error", err.message || "Failed to download file.");
    } finally {
      setDownloadingIds((prev) => ({ ...prev, [fileId]: false }));
    }
  };

  // Move file to Trash (Soft Delete on backend)
  const executeMoveToTrash = async (file: DBFile) => {
    try {
      const res = await fetch(`/api/files/${file.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        showToast("info", `${file.fileName} moved to trash.`);
        setFiles((prev) =>
          prev.map((f) => (f.id === file.id ? { ...f, isDeleted: true } : f))
        );
        fetchAllFiles();
      } else {
        showToast("error", json.message || "Failed to move file to trash.");
      }
    } catch {
      showToast("error", "An error occurred while moving the file to trash.");
    }
  };

  const handleMoveToTrash = (file: DBFile) => {
    if (file.mimeType === "folder") {
      showConfirm({
        title: "Move Folder to Trash?",
        message: `Warning: Deleting this folder will move all the contents inside it to Trash. Do you want to proceed?`,
        confirmText: "Move to Trash",
        cancelText: "Cancel",
        type: "warning",
        onConfirm: () => executeMoveToTrash(file),
      });
    } else {
      showConfirm({
        title: "Move File to Trash?",
        message: `Are you sure you want to move "${file.fileName}" to trash?`,
        confirmText: "Move to Trash",
        cancelText: "Cancel",
        type: "warning",
        onConfirm: () => executeMoveToTrash(file),
      });
    }
  };

  // Restore file from Trash (PATCH isDeleted to false)
  const handleRestoreFromTrash = async (file: DBFile) => {
    try {
      const res = await fetch(`/api/files/${file.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDeleted: false }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("success", `${file.fileName} restored from trash.`);
        setFiles((prev) =>
          prev.map((f) => (f.id === file.id ? { ...f, isDeleted: false } : f))
        );
        fetchAllFiles();
      } else {
        showToast("error", json.message || "Failed to restore file.");
      }
    } catch {
      showToast("error", "An error occurred while restoring the file.");
    }
  };

  // Permanent Delete from Telegram & DB
  const executePermanentDelete = async (fileId: string, fileName: string) => {
    setDeletingIds((prev) => ({ ...prev, [fileId]: true }));
    try {
      const res = await fetch(`/api/files/${fileId}?permanent=true`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (json.success) {
        showToast("success", `${fileName} permanently deleted.`);
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
        fetchAllFiles();
      } else {
        showToast("error", json.message || "Failed to delete file.");
      }
    } catch (err) {
      showToast("error", "An error occurred while deleting the file.");
    } finally {
      setDeletingIds((prev) => ({ ...prev, [fileId]: false }));
    }
  };

  const handlePermanentDelete = (fileId: string, fileName: string) => {
    const file = files.find((f) => f.id === fileId);
    const isFolder = file && file.mimeType === "folder";
    showConfirm({
      title: isFolder ? "Permanently Delete Folder?" : "Permanently Delete File?",
      message: isFolder
        ? `Warning: Permanently deleting this folder will permanently delete all the contents inside it. This action cannot be undone. Do you want to proceed?`
        : `Are you sure you want to permanently delete "${fileName}"? This action cannot be undone.`,
      confirmText: "Permanently Delete",
      cancelText: "Cancel",
      type: "danger",
      onConfirm: () => executePermanentDelete(fileId, fileName),
    });
  };

  const handleShare = async (fileId: string) => {
    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isShared: true }),
      });

      if (!response.ok) {
        throw new Error("Failed to configure sharing on server.");
      }

      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, isShared: true } : f))
      );

      const sharedUrl = `${window.location.origin}/api/files/shared/${fileId}`;
      await navigator.clipboard.writeText(sharedUrl);

      showToast("success", "Shareable download link copied to clipboard!");
    } catch (err) {
      showToast("error", "Failed to copy share link.");
    }
  };

  const handleRevokeShare = async (fileId: string) => {
    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isShared: false }),
      });

      if (!response.ok) {
        throw new Error("Failed to revoke access on server.");
      }

      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, isShared: false } : f))
      );

      showToast("success", "Access to this shared link has been revoked!");
    } catch (err) {
      showToast("error", "Failed to revoke access.");
    }
  };
  const handleRenameFile = async (fileId: string, newName: string) => {
    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: newName }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.message || "Failed to rename file.");
      }

      setFiles((prevFiles) =>
        prevFiles.map((f) => (f.id === fileId ? { ...f, fileName: newName } : f))
      );
      showToast("success", "File renamed successfully.");
      fetchFiles(currentFolderId);
    } catch (err: any) {
      showToast("error", err.message || "Failed to rename file.");
      throw err;
    }
  };

  const handleRenameModalSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!renameModalFile) return;
    const trimmed = renameModalValue.trim();
    if (!trimmed || trimmed === renameModalFile.fileName) {
      setRenameModalFile(null);
      return;
    }
    setRenameModalLoading(true);
    try {
      await handleRenameFile(renameModalFile.id, trimmed);
      setRenameModalFile(null);
    } catch {
      // Toast is managed inside handleRenameFile
    } finally {
      setRenameModalLoading(false);
    }
  };

  // Toggle Favorite Star
  const handleToggleFavorite = (fileId: string) => {
    let nextFavorites: string[] = [];
    if (favorites.includes(fileId)) {
      nextFavorites = favorites.filter((id) => id !== fileId);
      showToast("info", "Removed from favorites.");
    } else {
      nextFavorites = [...favorites, fileId];
      showToast("success", "Added to favorites.");
    }
    setFavorites(nextFavorites);
    localStorage.setItem("favorites", JSON.stringify(nextFavorites));
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

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(e.dataTransfer.files);
      router.push("/dashboard?tab=uploads");
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(e.target.files, uploadTargetFolderId);
      router.push("/dashboard?tab=uploads");
    }
  };

  const triggerFileInput = () => {
    setIsChooseDirModalOpen(true);
  };

  const handleDirectorySelected = (folderId: string | null) => {
    setUploadTargetFolderId(folderId);
    setIsChooseDirModalOpen(false);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 150);
  };

  // Helper formats
  const formatBytes = (bytes: number, decimals = 1) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Classify file category
  const classifyFile = (mime: string, name: string): "image" | "document" | "media" | "archive" | "other" => {
    let mimeLower = mime.toLowerCase();
    const nameLower = name.toLowerCase();

    // Fallback classification if MIME type is generic octet-stream
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

  // Get dynamic file icon styles
   const getFileStyle = (mime: string, name: string) => {
    if (mime.toLowerCase() === "folder") {
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

  // Render premium custom vector line SVG icons
  const renderFileIcon = (category: string, fileName?: string, mimeType?: string) => {
    const nameLower = fileName?.toLowerCase() || "";
    const mimeLower = mimeType?.toLowerCase() || "";

    // Specific custom icon branding for folders
    if (mimeLower === "folder") {
      return (
        <svg style={{ width: "1.05rem", height: "1.05rem", color: "#FBBF24" }} viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 5h-8.586L9.414 3.004A2 2 0 008 2.418H4c-1.103 0-2 .897-2 2v14c0 1.103.897 2 2 2h16c1.103 0 2-.897 2-2V7c0-1.103-.897-2-2-2z" />
        </svg>
      );
    }

    // Specific custom image branding for PDF
    if (nameLower.endsWith(".pdf") || mimeLower.includes("pdf")) {
      return (
        <img
          src="/pdf.png"
          alt="PDF"
          style={{ width: "1.2rem", height: "1.2rem", objectFit: "contain", display: "block" }}
        />
      );
    }

    // Specific custom image branding for DOCS/Word
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

    // Specific custom image branding for Markdown
    if (nameLower.endsWith(".md") || mimeLower.includes("markdown")) {
      return (
        <img
          src="/md.png"
          alt="Markdown File"
          style={{ width: "1.3rem", height: "1.3rem", objectFit: "contain", display: "block" }}
        />
      );
    }

    // Specific custom image branding for Excel
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

    // Specific custom image branding for ZIP / Archives
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

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <LoadingSpinner size="lg" label="Restoring your secure cloud bridge..." />
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <LoadingSpinner size="lg" label="Loading profile..." />
      </div>
    );
  }

  // Active files (excludes files marked as isDeleted)
  const activeFiles = files.filter((f) => !f.isDeleted);
  const globalActiveFiles = allFiles.filter((f) => !f.isDeleted);

  // Metrics calculation
  const totalStorage = globalActiveFiles.reduce((acc, f) => acc + Number(f.fileSize), 0);
  const totalFilesCount = globalActiveFiles.length;
  const imageFiles = globalActiveFiles.filter(f => classifyFile(f.mimeType, f.fileName) === "image");
  const documentFiles = globalActiveFiles.filter(f => classifyFile(f.mimeType, f.fileName) === "document");
  const mediaFiles = globalActiveFiles.filter(f => classifyFile(f.mimeType, f.fileName) === "media");
  const archiveFiles = globalActiveFiles.filter(f => classifyFile(f.mimeType, f.fileName) === "archive");
  const otherFiles = globalActiveFiles.filter(
    (f) =>
      classifyFile(f.mimeType, f.fileName) !== "image" &&
      classifyFile(f.mimeType, f.fileName) !== "document" &&
      classifyFile(f.mimeType, f.fileName) !== "media" &&
      classifyFile(f.mimeType, f.fileName) !== "archive"
  );

  const imagesCount = imageFiles.length;
  const documentsCount = documentFiles.length;

  const imagesPercent = totalFilesCount > 0 ? Math.round((imagesCount / totalFilesCount) * 100) : 0;
  const documentsPercent = totalFilesCount > 0 ? Math.round((documentsCount / totalFilesCount) * 100) : 0;

  // Donut breakdown calculations
  const imagesSize = imageFiles.reduce((acc, f) => acc + Number(f.fileSize), 0);
  const documentsSize = documentFiles.reduce((acc, f) => acc + Number(f.fileSize), 0);
  const mediaSize = mediaFiles.reduce((acc, f) => acc + Number(f.fileSize), 0);
  const otherSize = Math.max(0, totalStorage - imagesSize - documentsSize - mediaSize);

  const imgPct = totalStorage > 0 ? (imagesSize / totalStorage) * 100 : 0;
  const docPct = totalStorage > 0 ? (documentsSize / totalStorage) * 100 : 0;
  const medPct = totalStorage > 0 ? (mediaSize / totalStorage) * 100 : 0;

  const donutGradient = totalStorage > 0 
    ? `conic-gradient(
        #a855f7 0% ${imgPct}%,
        #3b82f6 ${imgPct}% ${imgPct + docPct}%,
        #10b981 ${imgPct + docPct}% ${imgPct + docPct + medPct}%,
        #f59e0b ${imgPct + docPct + medPct}% 100%
      )`
    : "conic-gradient(#cbd5e1 0% 100%)";

  const limitBytes = 100 * 1024 * 1024 * 1024; // 100 GB
  const totalUsedPercent = Math.min(Math.round((totalStorage / limitBytes) * 100), 100);

  // Fallback chain for user display name
  const userName = user.displayName || user.username || user.phoneNumber || "Aditya";

  // Filtered files list selector by tab
  let visibleFiles: DBFile[] = [];
  if (tab === "dashboard") {
    visibleFiles = activeFiles.slice(0, 5); // dashboard shows only 5 recent
  } else if (tab === "my-files" || tab === "recent") {
    visibleFiles = activeFiles; // show all active
  } else if (tab === "favorites") {
    visibleFiles = activeFiles.filter((f) => favorites.includes(f.id));
  } else if (tab === "shared") {
    visibleFiles = activeFiles.filter((f) => f.isShared);
  } else if (tab === "trash") {
    visibleFiles = files.filter((f) => f.isDeleted);
  } else if (tab === "folders") {
    if (selectedFolderCategory === "images") visibleFiles = imageFiles;
    else if (selectedFolderCategory === "documents") visibleFiles = documentFiles;
    else if (selectedFolderCategory === "media") visibleFiles = mediaFiles;
    else if (selectedFolderCategory === "archives") visibleFiles = archiveFiles;
    else if (selectedFolderCategory === "others") visibleFiles = otherFiles;
  }

  // Filter visible files: use semantic search results if search query is active (except in Trash tab)
  const finalFilteredFiles = tab === "trash"
    ? visibleFiles.filter((f) => f.fileName.toLowerCase().includes(searchTerm.toLowerCase()))
    : (searchTerm.trim() ? semanticSearchResults : visibleFiles);

  // Helper to determine if file is a viewer-supported image or video
  const isImageFile = (file: DBFile) => {
    const mimeLower = (file.mimeType || "").toLowerCase();
    const nameLower = (file.fileName || "").toLowerCase();
    return (
      mimeLower.startsWith("image/") || 
      mimeLower.startsWith("video/") ||
      ((mimeLower === "application/octet-stream" || !mimeLower) && 
       /\.(png|jpg|jpeg|gif|webp|svg|mp4|mov|webm|mkv|avi)$/i.test(nameLower))
    );
  };

  // Helper to determine if file is a viewer-supported document
  const isDocumentFile = (file: DBFile) => {
    const mimeLower = (file.mimeType || "").toLowerCase();
    const nameLower = (file.fileName || "").toLowerCase();
    const ext = nameLower.split(".").pop()?.toLowerCase();
    
    // PDF
    if (ext === "pdf" || mimeLower === "application/pdf") return true;
    
    // Text / Code
    const textExtensions = [
      "txt", "md", "json", "csv", "xml", "yaml", "yml", "ini", "log", "conf",
      "js", "jsx", "ts", "tsx", "py", "html", "css", "go", "sh", "bat", "sql",
      "cpp", "h", "java", "rs", "php", "rb", "swift", "kt", "scala"
    ];
    if (textExtensions.includes(ext || "") || mimeLower.startsWith("text/")) return true;
    
    // Office / Binary documents that we show fallbacks for
    const docExtensions = [
      "doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp",
      "zip", "tar", "rar", "7z", "gz"
    ];
    return docExtensions.includes(ext || "");
  };

  // List of all image files in current view mode
  const activeImages = ((tab === "dashboard" || tab === "my-files") ? finalFilteredFiles.filter((f) => f.mimeType !== "folder") : finalFilteredFiles).filter(isImageFile);

  // List of all document files in current view mode (includes images, videos, audio, PDFs, and docs for unified slideshow navigation)
  const activeDocuments = ((tab === "dashboard" || tab === "my-files") ? finalFilteredFiles.filter((f) => f.mimeType !== "folder") : finalFilteredFiles).filter((f) => f.mimeType !== "folder");

  const currentViewerDocIndex = activeDocuments.findIndex((doc) => doc.id === activeDocumentViewerFileId);
  const currentViewerDoc = activeDocuments.find((doc) => doc.id === activeDocumentViewerFileId);

  const handleNextViewerDoc = () => {
    if (currentViewerDocIndex !== -1 && currentViewerDocIndex < activeDocuments.length - 1) {
      setActiveDocumentViewerFileId(activeDocuments[currentViewerDocIndex + 1].id);
    }
  };

  const handlePrevViewerDoc = () => {
    if (currentViewerDocIndex !== -1 && currentViewerDocIndex > 0) {
      setActiveDocumentViewerFileId(activeDocuments[currentViewerDocIndex - 1].id);
    }
  };

  const currentViewerIndex = activeImages.findIndex((img) => img.id === activeImageViewerFileId);
  const currentViewerImage = activeImages.find((img) => img.id === activeImageViewerFileId);
  const isViewerVideo = currentViewerImage ? (
    currentViewerImage.mimeType.startsWith("video/") || 
    ((currentViewerImage.mimeType === "application/octet-stream" || !currentViewerImage.mimeType) && 
     /\.(mp4|webm|ogg|mov)$/i.test(currentViewerImage.fileName))
  ) : false;

  const handleNextViewerImage = () => {
    if (currentViewerIndex !== -1 && currentViewerIndex < activeImages.length - 1) {
      setActiveImageViewerFileId(activeImages[currentViewerIndex + 1].id);
      setImageZoom(1);
      setImageRotation(0);
      setImageFlipH(false);
      setImageFlipV(false);
    }
  };

  const handlePrevViewerImage = () => {
    if (currentViewerIndex !== -1 && currentViewerIndex > 0) {
      setActiveImageViewerFileId(activeImages[currentViewerIndex - 1].id);
      setImageZoom(1);
      setImageRotation(0);
      setImageFlipH(false);
      setImageFlipV(false);
    }
  };

  // Helper renderer for trash bin list
  function renderTrashTable(fileList: DBFile[]) {
    if (fileList.length === 0) {
      return (
        <div style={{ padding: "3rem 0", textAlign: "center" }}>
          <span style={{ fontSize: "2rem" }}>🗑️</span>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.5rem" }}>
            Trash is empty.
          </p>
        </div>
      );
    }

    return (
      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border-default)" }}>
            <th style={{ padding: "0.75rem 0.5rem", fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600 }}>Name</th>
            <th style={{ padding: "0.75rem 0.5rem", fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600 }}>Size</th>
            <th style={{ padding: "0.75rem 0.5rem", fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600, textAlign: "right" }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {fileList.map((file) => {
            const style = getFileStyle(file.mimeType, file.fileName);
            const isDeleting = deletingIds[file.id];

            return (
              <tr key={file.id} style={{ borderBottom: "1px solid var(--border-subtle)", opacity: isDeleting ? 0.5 : 1 }}>
                {/* Name */}
                <td style={{ padding: "0.85rem 0.5rem", maxWidth: "240px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
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
                      {renderFileIcon(classifyFile(file.mimeType, file.fileName), file.fileName, file.mimeType)}
                    </div>
                    <span style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {file.fileName}
                    </span>
                  </div>
                </td>

                {/* Size */}
                <td style={{ padding: "0.85rem 0.5rem", fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                  {formatBytes(file.fileSize)}
                </td>

                {/* Actions */}
                <td style={{ padding: "0.85rem 0.5rem", textAlign: "right" }}>
                  <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", alignItems: "center" }}>
                    <button
                      disabled={isDeleting}
                      onClick={() => handleRestoreFromTrash(file)}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
                      title="Restore File"
                    >
                      <svg style={{ width: "1.05rem", height: "1.05rem", color: "#64748B" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="23 4 23 10 17 10"/>
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                      </svg>
                    </button>
                    <button
                      disabled={isDeleting}
                      onClick={() => handlePermanentDelete(file.id, file.fileName)}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
                      title="Delete Permanently"
                    >
                      {isDeleting ? (
                        <span style={{ fontSize: "0.75rem" }}>⏳</span>
                      ) : (
                        <svg style={{ width: "1.05rem", height: "1.05rem", color: "#EF4444" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          <line x1="10" y1="11" x2="10" y2="17"/>
                          <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", width: "100%" }}>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: "none" }} multiple />
      {/* Top Header Bar */}
      <DashboardHeader
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        toggleDarkMode={toggleDarkMode}
        userName={userName}
        onSearchClick={() => setIsCommandPaletteOpen(true)}
        notifications={notifications}
        setNotifications={setNotifications}
        darkMode={darkMode}
      />

      {/* Welcome & Cover Banner */}
      {tab !== "settings" && (
        <WelcomeBanner
          userName={userName}
          tab={tab}
          triggerFileInput={triggerFileInput}
          isUploading={isUploading}
          showBanner={showBanner}
          isBannerVisible={isBannerVisible}
          handleCloseBanner={handleCloseBanner}
          onCreateFolderClick={() => setIsNewFolderModalOpen(true)}
          onSyncClick={handleSyncSemanticSearch}
          isSyncing={isSyncing}
        />
      )}

      {/* Conditional Rendering Based on Tabs */}
      {tab === "dashboard" && (
        <>
          {/* Metrics Row (4 Cards) */}
          <MetricsGrid
            totalStorage={totalStorage}
            totalFilesCount={totalFilesCount}
            imagesCount={imagesCount}
            documentsCount={documentsCount}
            imagesPercent={imagesPercent}
            documentsPercent={documentsPercent}
            totalUsedPercent={totalUsedPercent}
            formatBytes={formatBytes}
          />

          {/* Quick Actions & Drag Drop Section */}
          <UploaderPanel
            isUploading={isUploading}
            triggerFileInput={triggerFileInput}
            fileInputRef={fileInputRef}
            handleFileChange={handleFileChange}
            isDragActive={isDragActive}
            handleDrag={handleDrag}
            handleDrop={handleDrop}
            onCreateFolder={() => setIsNewFolderModalOpen(true)}
          />

          {/* Storage Overview & Recent Uploads Visuals */}
          <section style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.15rem", width: "100%" }}>
            {/* Storage Donut representation */}
            <StorageUsageDonut
              donutGradient={donutGradient}
              totalStorage={totalStorage}
              imagesSize={imagesSize}
              documentsSize={documentsSize}
              mediaSize={mediaSize}
              otherSize={otherSize}
              formatBytes={formatBytes}
              totalUsedPercent={totalUsedPercent}
            />

            {/* Recent Uploads timeline activity track */}
            <RecentActivityTimeline
              activeFiles={activeFiles}
              getFileStyle={getFileStyle}
              renderFileIcon={renderFileIcon}
              getRelativeTime={getRelativeTime}
              classifyFile={classifyFile}
            />
          </section>
        </>
      )}

      {/* Folders Tab Directory Breakdowns */}
      {tab === "folders" && !selectedFolderCategory && (
        <section className="animate-fade-in" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem", width: "100%" }}>
          {/* Images Folder */}
          <div
            onClick={() => setSelectedFolderCategory("images")}
            className="glass-card card-hover"
            style={{
              padding: "1.65rem 1.5rem",
              borderRadius: "16px",
              border: "1px solid var(--border-default)",
              background: "var(--bg-card)",
              display: "flex",
              flexDirection: "column",
              gap: "0.85rem",
              cursor: "pointer",
              transition: "all 0.22s ease",
              boxShadow: "var(--glass-shadow)"
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, rgba(255, 168, 0, 0.06) 0%, rgba(255, 122, 0, 0.12) 100%)",
                border: "1px solid rgba(255, 168, 0, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFA800" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
              <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.015em" }}>Images</span>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 500 }}>{imagesCount} files • {formatBytes(imagesSize)}</span>
            </div>
          </div>

          {/* Documents Folder */}
          <div
            onClick={() => setSelectedFolderCategory("documents")}
            className="glass-card card-hover"
            style={{
              padding: "1.65rem 1.5rem",
              borderRadius: "16px",
              border: "1px solid var(--border-default)",
              background: "var(--bg-card)",
              display: "flex",
              flexDirection: "column",
              gap: "0.85rem",
              cursor: "pointer",
              transition: "all 0.22s ease",
              boxShadow: "var(--glass-shadow)"
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, rgba(255, 168, 0, 0.06) 0%, rgba(255, 122, 0, 0.12) 100%)",
                border: "1px solid rgba(255, 168, 0, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFA800" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
              <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.015em" }}>Documents</span>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 500 }}>{documentsCount} files • {formatBytes(documentsSize)}</span>
            </div>
          </div>

          {/* Media Folder */}
          <div
            onClick={() => setSelectedFolderCategory("media")}
            className="glass-card card-hover"
            style={{
              padding: "1.65rem 1.5rem",
              borderRadius: "16px",
              border: "1px solid var(--border-default)",
              background: "var(--bg-card)",
              display: "flex",
              flexDirection: "column",
              gap: "0.85rem",
              cursor: "pointer",
              transition: "all 0.22s ease",
              boxShadow: "var(--glass-shadow)"
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, rgba(255, 168, 0, 0.06) 0%, rgba(255, 122, 0, 0.12) 100%)",
                border: "1px solid rgba(255, 168, 0, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFA800" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
              <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.015em" }}>Audio & Video</span>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 500 }}>{mediaFiles.length} files • {formatBytes(mediaSize)}</span>
            </div>
          </div>

          {/* Others Folder */}
          <div
            onClick={() => setSelectedFolderCategory("others")}
            className="glass-card card-hover"
            style={{
              padding: "1.65rem 1.5rem",
              borderRadius: "16px",
              border: "1px solid var(--border-default)",
              background: "var(--bg-card)",
              display: "flex",
              flexDirection: "column",
              gap: "0.85rem",
              cursor: "pointer",
              transition: "all 0.22s ease",
              boxShadow: "var(--glass-shadow)"
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, rgba(255, 168, 0, 0.06) 0%, rgba(255, 122, 0, 0.12) 100%)",
                border: "1px solid rgba(255, 168, 0, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFA800" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
                <polygon points="12 22.08 12 12 3 6.92 3 17.08 12 22.08" />
                <polygon points="12 22.08 21 17.08 21 6.92 12 12 12 22.08" />
                <polygon points="12 12 21 6.92 12 1.84 3 6.92 12 12" />
              </svg>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
              <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.015em" }}>Archives & Others</span>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 500 }}>{archiveFiles.length + otherFiles.length} files • {formatBytes(otherSize)}</span>
            </div>
          </div>
        </section>
      )}

      {/* Settings Tab Panel */}
      {tab === "settings" && (
        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1.5rem", width: "100%", maxWidth: "800px", margin: "0 auto", marginTop: "1rem" }}>
          {/* Header Description */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginBottom: "0.5rem" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.03em", margin: 0 }}>
              Portal Preferences
            </h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 500, margin: 0 }}>
              Customize your security, upload, and media optimization parameters.
            </p>
          </div>

          {/* Section: Upload Settings */}
          <div
            className="glass-card"
            style={{
              padding: "1.5rem",
              borderRadius: "16px",
              border: "1px solid var(--border-default)",
              background: "var(--bg-card)",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
              boxShadow: "var(--glass-shadow)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "0.75rem" }}>
              <div style={{ fontSize: "1.25rem" }}>⚙️</div>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.015em" }}>
                Upload & Optimization
              </h3>
            </div>

            {/* Optimization Toggle Row */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1.5rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", flex: 1 }}>
                <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
                  Compress video before uploading
                </span>
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 500, lineHeight: "1.45" }}>
                  When enabled, CloudBridge will execute background hardware-accelerated video video compression (H.264 / Constant Rate Factor 23) upon server ingestion. This reduces sizes by up to 80% and accelerates transfer times, preserving original visual detail and copy-preserving your audio feeds perfectly!
                </span>
              </div>

              {/* iOS Premium Toggle Switch */}
              <button
                onClick={() => handleToggleCompressVideo(!compressVideo)}
                style={{
                  width: "48px",
                  height: "26px",
                  borderRadius: "9999px",
                  background: compressVideo ? "#F59E0B" : "rgba(100, 116, 139, 0.15)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  position: "relative",
                  cursor: "pointer",
                  transition: "background-color 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  flexShrink: 0,
                  boxShadow: compressVideo ? "0 2px 8px rgba(245, 158, 11, 0.3)" : "none",
                }}
              >
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background: "#ffffff",
                    position: "absolute",
                    left: compressVideo ? "24px" : "3px",
                    transition: "left 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                  }}
                />
              </button>
            </div>
          </div>
          
          {/* Quick FAQ / Specs Card */}
          <div
            className="glass-card"
            style={{
              padding: "1.15rem",
              borderRadius: "14px",
              border: "1px solid var(--border-default)",
              background: "rgba(15, 23, 42, 0.15)",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem"
            }}
          >
            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Technical Specifications
            </span>
            <ul style={{ margin: 0, paddingLeft: "1.1rem", display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>
              <li>Uses premium <strong>H.264 High-Profile</strong> video encoders maximizing compatibility with Telegram's Web Player.</li>
              <li>Preserves original frame rates, scaling resolutions, and aspect ratios.</li>
              <li>Strict <strong>zero-reencode audio copy</strong> preserves your master tracks completely.</li>
              <li>Runs fully multi-threaded asynchronously on the server to prevent browser thread locking.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Uploads Tab Dedicated Sequential Queue Dashboard */}
      {tab === "uploads" && (
        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1.25rem", width: "100%" }}>
          {/* Stats Bar */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.15rem" }}>
            <div className="glass-card" style={{ padding: "1.15rem", borderRadius: "14px", border: "1px solid var(--border-default)", background: "var(--bg-card)", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total In Queue</span>
              <span style={{ fontSize: "1.65rem", fontWeight: 900, color: "var(--text-primary)", letterSpacing: "-0.03em" }}>{uploadQueue.length}</span>
            </div>
            <div className="glass-card" style={{ padding: "1.15rem", borderRadius: "14px", border: "1px solid var(--border-default)", background: "var(--bg-card)", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Uploading / Active</span>
              <span style={{ fontSize: "1.65rem", fontWeight: 900, color: "#F59E0B", letterSpacing: "-0.03em" }}>{uploadQueue.filter(i => i.status === "uploading").length}</span>
            </div>
            <div className="glass-card" style={{ padding: "1.15rem", borderRadius: "14px", border: "1px solid var(--border-default)", background: "var(--bg-card)", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Success / Completed</span>
              <span style={{ fontSize: "1.65rem", fontWeight: 900, color: "#10B981", letterSpacing: "-0.03em" }}>{uploadQueue.filter(i => i.status === "completed").length}</span>
            </div>
            <div className="glass-card" style={{ padding: "1.15rem", borderRadius: "14px", border: "1px solid var(--border-default)", background: "var(--bg-card)", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Remaining / Pending</span>
              <span style={{ fontSize: "1.65rem", fontWeight: 900, color: "var(--text-primary)", letterSpacing: "-0.03em" }}>{uploadQueue.filter(i => i.status === "pending").length}</span>
            </div>
          </div>

          {/* Action Header Card & Drag Zone */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={triggerFileInput}
            className="glass-card card-hover"
            style={{
              borderRadius: "16px",
              background: isDragActive ? "rgba(245, 158, 11, 0.02)" : "var(--bg-card)",
              border: isDragActive ? "2px dashed #F59E0B" : "2px dashed var(--border-default)",
              padding: "2.5rem 1.5rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.25s ease",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: isDragActive ? "rgba(245, 158, 11, 0.12)" : "rgba(245, 158, 11, 0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "0.75rem",
                transform: isDragActive ? "scale(1.08)" : "scale(1)",
                transition: "transform 0.25s ease",
              }}
            >
              <svg style={{ width: "1.5rem", height: "1.5rem", color: "#F59E0B" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
            </div>
            <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.25rem", letterSpacing: "-0.015em" }}>
              {isDragActive ? "Drop multiple files here!" : "Drag & drop multiple files, folders, or videos"}
            </h4>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>
              or click here to select files from your file explorer
            </p>
          </div>

          {/* Queue Card Table representation */}
          <div
            className="glass-card"
            style={{
              borderRadius: "16px",
              background: "var(--bg-card)",
              border: "1px solid var(--border-default)",
              padding: "1.5rem 1.65rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.15rem",
              boxShadow: "var(--glass-shadow)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "0.98rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.015em" }}>
                Sequential Upload Queue
              </h3>
              {uploadQueue.some((i) => i.status === "completed" || i.status === "cancelled" || i.status === "failed") && (
                <button
                  onClick={handleClearCompleted}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#EF4444",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Clear Finished Items
                </button>
              )}
            </div>

            <div style={{ overflowX: "auto" }}>
              {uploadQueue.length === 0 ? (
                <div style={{ padding: "3.5rem 0", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.55rem" }}>
                  <div style={{ fontSize: "2rem" }}>📤</div>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontWeight: 500, margin: 0 }}>
                    No files currently in the upload queue.
                  </p>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.72rem", fontWeight: 500, margin: 0 }}>
                    Drag & drop or select files above to populate the sequential uploader.
                  </p>
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-default)" }}>
                      <th style={{ padding: "0.75rem 0.5rem", fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600 }}>File</th>
                      <th style={{ padding: "0.75rem 0.5rem", fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600 }}>Size</th>
                      <th style={{ padding: "0.75rem 0.5rem", fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600, width: "35%" }}>Progress / Speed</th>
                      <th style={{ padding: "0.75rem 0.5rem", fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600 }}>Status</th>
                      <th style={{ padding: "0.75rem 0.5rem", fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600, textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadQueue.map((item) => {
                      const fileStyle = getFileStyle(item.file.type, item.file.name);
                      const isUploadingItem = item.status === "uploading";
                      const isCompleted = item.status === "completed";
                      const isCancelled = item.status === "cancelled";
                      const isFailed = item.status === "failed";

                      return (
                        <tr key={item.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                          {/* Name and Icon */}
                          <td style={{ padding: "0.85rem 0.5rem", maxWidth: "250px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                              <div
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  borderRadius: "6px",
                                  background: fileStyle.bg,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                }}
                              >
                                {renderFileIcon(classifyFile(item.file.type, item.file.name), item.file.name, item.file.type)}
                              </div>
                              <span
                                style={{
                                  fontSize: "0.82rem",
                                  fontWeight: 700,
                                  color: "var(--text-primary)",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                                title={item.file.name}
                              >
                                {item.file.name}
                              </span>
                            </div>
                          </td>

                          {/* Size */}
                          <td style={{ padding: "0.85rem 0.5rem", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)" }}>
                            {formatBytes(item.file.size)}
                          </td>

                          {/* Progress bar and upload speed */}
                          <td style={{ padding: "0.85rem 0.5rem" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)" }}>
                                <span>{item.progress}%</span>
                                {isUploadingItem && item.speed && (
                                  <span style={{ color: "#F59E0B" }}>
                                    {item.progress >= 99 ? "Assembling..." : item.speed}
                                  </span>
                                )}
                              </div>
                              <div style={{ width: "100%", height: "6px", background: "var(--bg-secondary)", borderRadius: "9999px", overflow: "hidden", border: "1px solid var(--border-default)" }}>
                                <div
                                  style={{
                                    width: `${item.progress}%`,
                                    height: "100%",
                                    background: isCompleted ? "#10B981" : isFailed ? "#EF4444" : isCancelled ? "#64748B" : "#F59E0B",
                                    borderRadius: "9999px",
                                    transition: "width 0.2s ease-out",
                                  }}
                                />
                              </div>
                              {/* Dynamic upload bytes uploaded / total bytes stats tracker */}
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.66rem", color: "var(--text-muted)", fontWeight: 500 }}>
                                <span>
                                  {isUploadingItem
                                    ? `${formatBytes(item.uploadedBytes || 0)} of ${formatBytes(item.file.size)}`
                                    : isCompleted
                                    ? `Uploaded ${formatBytes(item.file.size)}`
                                    : isCancelled
                                    ? `Cancelled at ${formatBytes(item.uploadedBytes || 0)}`
                                    : isFailed
                                    ? `Failed at ${formatBytes(item.uploadedBytes || 0)}`
                                    : `Pending • ${formatBytes(item.file.size)}`}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td style={{ padding: "0.85rem 0.5rem" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.3rem",
                                padding: "0.25rem 0.6rem",
                                borderRadius: "9999px",
                                fontSize: "0.68rem",
                                fontWeight: 700,
                                background: isCompleted
                                  ? "rgba(16, 185, 129, 0.08)"
                                  : isUploadingItem
                                  ? "rgba(245, 158, 11, 0.08)"
                                  : isCancelled
                                  ? "rgba(100, 116, 139, 0.08)"
                                  : isFailed
                                  ? "rgba(239, 68, 68, 0.08)"
                                  : "rgba(100, 116, 139, 0.04)",
                                color: isCompleted
                                  ? "#10B981"
                                  : isUploadingItem
                                  ? "#F59E0B"
                                  : isCancelled
                                  ? "#64748B"
                                  : isFailed
                                  ? "#EF4444"
                                  : "var(--text-muted)",
                                border: isCompleted
                                  ? "1px solid rgba(16, 185, 129, 0.15)"
                                  : isUploadingItem
                                  ? "1px solid rgba(245, 158, 11, 0.15)"
                                  : isCancelled
                                  ? "1px solid rgba(100, 116, 139, 0.15)"
                                  : isFailed
                                  ? "1px solid rgba(239, 68, 68, 0.15)"
                                  : "1px solid var(--border-default)",
                              }}
                            >
                              {isUploadingItem && (
                                <span className="pulse" style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#F59E0B" }} />
                              )}
                              {isCompleted && "Completed"}
                              {isUploadingItem && "Uploading"}
                              {isCancelled && "Cancelled"}
                              {isFailed && "Failed"}
                              {item.status === "pending" && "In Queue"}
                            </span>
                          </td>

                          {/* Dismiss / Cancel Trigger */}
                          <td style={{ padding: "0.85rem 0.5rem", textAlign: "right" }}>
                            {(isUploadingItem || item.status === "pending") && item.cancel ? (
                              <button
                                onClick={item.cancel}
                                style={{
                                  background: "rgba(239, 68, 68, 0.05)",
                                  border: "1px solid rgba(239, 68, 68, 0.15)",
                                  cursor: "pointer",
                                  width: "26px",
                                  height: "26px",
                                  borderRadius: "50%",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "#EF4444",
                                }}
                                title="Cancel Upload"
                                className="close-hover"
                              >
                                <svg style={{ width: "0.85rem", height: "0.85rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setUploadQueue((prev) => prev.filter((i) => i.id !== item.id));
                                }}
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  color: "var(--text-muted)",
                                  fontSize: "0.8rem",
                                }}
                                title="Remove item"
                              >
                                <svg style={{ width: "0.95rem", height: "0.95rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Files Table Card */}
      {!(tab === "folders" && !selectedFolderCategory) && tab !== "uploads" && tab !== "settings" && (
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
          {/* Header title */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              {tab === "folders" && selectedFolderCategory && (
                <button
                  onClick={() => setSelectedFolderCategory(null)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0.35rem",
                    borderRadius: "50%",
                    color: "var(--text-primary)",
                    marginRight: "0.2rem",
                  }}
                  className="dropdown-item-hover"
                  title="Back to Organiser"
                >
                  <svg style={{ width: "1rem", height: "1rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>
              )}

              {/* Dynamic interactive Breadcrumbs */}
              {(tab === "dashboard" || tab === "my-files") ? (
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap", fontSize: "0.85rem" }}>
                  <button
                    onClick={() => handleNavigateBreadcrumb(-1)}
                    style={{
                      background: "none",
                      border: "none",
                      color: currentFolderId === null ? (darkMode ? "#ffffff" : "#0f172a") : (darkMode ? "#FBBF24" : "#D97706"),
                      fontWeight: currentFolderId === null ? 800 : 700,
                      cursor: "pointer",
                      padding: "0.25rem 0.5rem",
                      borderRadius: "6px",
                      fontSize: "0.88rem",
                      fontFamily: "var(--font-outfit)",
                      transition: "all 0.2s ease",
                    }}
                    className="dropdown-item-hover"
                  >
                    Root
                  </button>
                  {folderBreadcrumbs.map((bc, idx) => (
                    <div key={bc.id} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <span style={{ color: darkMode ? "#94a3b8" : "#64748b", fontSize: "0.75rem", opacity: 0.6 }}>/</span>
                      <button
                        onClick={() => handleNavigateBreadcrumb(idx)}
                        style={{
                          background: "none",
                          border: "none",
                          color: idx === folderBreadcrumbs.length - 1 ? (darkMode ? "#ffffff" : "#0f172a") : (darkMode ? "#FBBF24" : "#D97706"),
                          fontWeight: idx === folderBreadcrumbs.length - 1 ? 800 : 700,
                          cursor: "pointer",
                          padding: "0.25rem 0.5rem",
                          borderRadius: "6px",
                          fontSize: "0.88rem",
                          fontFamily: "var(--font-outfit)",
                          transition: "all 0.2s ease",
                        }}
                        className="dropdown-item-hover"
                      >
                        {bc.name}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <h3 style={{ fontSize: "0.98rem", fontWeight: 800, color: darkMode ? "#ffffff" : "#0f172a", letterSpacing: "-0.015em", textTransform: "capitalize" }}>
                  {tab === "my-files" && "All Files"}
                  {tab === "folders" && selectedFolderCategory && `${selectedFolderCategory} files`}
                  {tab === "recent" && "Recent Uploads"}
                  {tab === "favorites" && "Starred Items"}
                  {tab === "shared" && "Shared Downloader Links"}
                  {tab === "trash" && "Deleted Bin"}
                </h3>
              )}
            </div>

            {(tab === "dashboard" || tab === "my-files") && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
                {/* Segemented View Mode Controller */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  background: darkMode ? "rgba(30, 41, 59, 0.45)" : "rgba(15, 23, 42, 0.05)",
                  border: darkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)",
                  borderRadius: "8px",
                  padding: "0.15rem",
                  gap: "0.1rem",
                  height: "32px"
                }}>
                  <button
                    onClick={() => {
                      setViewMode("list");
                      if (typeof window !== "undefined") {
                        localStorage.setItem("viewMode", "list");
                      }
                    }}
                    style={{
                      background: viewMode === "list" ? "rgba(245, 158, 11, 0.15)" : "transparent",
                      border: "none",
                      color: viewMode === "list" ? (darkMode ? "#FBBF24" : "#D97706") : (darkMode ? "#94a3b8" : "#64748b"),
                      cursor: "pointer",
                      padding: "0.35rem 0.55rem",
                      borderRadius: "6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.2s ease",
                      height: "100%"
                    }}
                    title="List View"
                  >
                    <svg style={{ width: "0.9rem", height: "0.9rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      setViewMode("grid");
                      if (typeof window !== "undefined") {
                        localStorage.setItem("viewMode", "grid");
                      }
                    }}
                    style={{
                      background: viewMode === "grid" ? "rgba(245, 158, 11, 0.15)" : "transparent",
                      border: "none",
                      color: viewMode === "grid" ? (darkMode ? "#FBBF24" : "#D97706") : (darkMode ? "#94a3b8" : "#64748b"),
                      cursor: "pointer",
                      padding: "0.35rem 0.55rem",
                      borderRadius: "6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.2s ease",
                      height: "100%"
                    }}
                    title="Grid View (Icons)"
                  >
                    <svg style={{ width: "0.9rem", height: "0.9rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25a2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
                    </svg>
                  </button>
                </div>

                {/* Grid Dynamic Size Control Slider */}
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

                {/* Create Folder Trigger Button */}
                <button
                  onClick={() => setIsNewFolderModalOpen(true)}
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: "#fff",
                    background: "linear-gradient(135deg, #F59E0B, #D97706)",
                    border: "none",
                    borderRadius: "8px",
                    padding: "0.45rem 0.85rem",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(245, 158, 11, 0.25)",
                    transition: "transform 0.15s ease",
                    height: "32px"
                  }}
                  onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.96)")}
                  onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  <svg style={{ width: "0.85rem", height: "0.85rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  New Folder
                </button>

                {tab === "dashboard" && (
                  <a
                    href="/dashboard?tab=my-files"
                    className="btn"
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      color: darkMode ? "#FBBF24" : "#D97706",
                      background: "transparent",
                      border: darkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)",
                      borderRadius: "8px",
                      padding: "0.45rem 0.85rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      textDecoration: "none",
                    }}
                  >
                    View all
                    <svg style={{ width: "0.8rem", height: "0.8rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Premium Folder Cards Grid Panel */}
          {(tab === "dashboard" || tab === "my-files") && finalFilteredFiles.filter((f) => f.mimeType === "folder").length > 0 && (
            <div style={{ marginBottom: "1.8rem" }}>
              <h4 style={{ fontSize: "0.76rem", fontWeight: 700, color: darkMode ? "#94a3b8" : "#64748b", marginBottom: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Folders ({finalFilteredFiles.filter((f) => f.mimeType === "folder").length})
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.85rem" }}>
                {finalFilteredFiles
                  .filter((f) => f.mimeType === "folder")
                  .map((folder) => (
                    <div
                      key={folder.id}
                      onDoubleClick={() => handleEnterFolder(folder.id, folder.fileName)}
                      onClick={() => handleEnterFolder(folder.id, folder.fileName)}
                      style={{
                        background: darkMode ? "rgba(30, 41, 59, 0.45)" : "rgba(255, 255, 255, 0.9)",
                        backdropFilter: "blur(12px)",
                        border: darkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)",
                        borderRadius: "12px",
                        padding: "0.85rem 1rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        cursor: "pointer",
                        position: "relative",
                        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                        boxShadow: darkMode ? "none" : "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
                      }}
                      className="folder-card-hover"
                    >
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "8px",
                          background: darkMode 
                            ? "linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.05))" 
                            : "linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(251, 191, 36, 0.22))",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: darkMode ? "#FBBF24" : "#D97706",
                          flexShrink: 0,
                        }}
                      >
                        <svg style={{ width: "1.2rem", height: "1.2rem" }} fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19.5 21a3 3 0 0 0 3-3v-4.5a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3V18a3 3 0 0 0 3 3h15ZM22.5 12V9.75a3 3 0 0 0-3-3h-7.164a3 3 0 0 1-2.122-.879L8.964 4.621A3 3 0 0 0 6.843 3.75H4.5a3 3 0 0 0-3 3v4.75h21Z" />
                        </svg>
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p
                          style={{
                            fontSize: "0.82rem",
                            fontWeight: 700,
                            color: darkMode ? "#ffffff" : "#0f172a",
                            margin: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontFamily: "var(--font-outfit)",
                          }}
                          title={folder.fileName}
                        >
                          {folder.fileName}
                        </p>
                        <span style={{ fontSize: "0.68rem", color: darkMode ? "#94a3b8" : "#64748b", fontWeight: 500 }}>
                          Directory
                        </span>
                      </div>

                      {/* Actions Ellipsis button */}
                      <div
                        style={{ position: "relative" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuFileId(activeMenuFileId === folder.id ? null : folder.id);
                        }}
                      >
                        <button
                          style={{
                            background: "none",
                            border: "none",
                            color: darkMode ? "#94a3b8" : "#64748b",
                            cursor: "pointer",
                            padding: "0.25rem",
                            borderRadius: "4px",
                          }}
                          className="dropdown-item-hover"
                        >
                          <svg style={{ width: "0.9rem", height: "0.9rem" }} fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 10.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm0-6a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm0 12a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z" />
                          </svg>
                        </button>

                        {activeMenuFileId === folder.id && (
                          <div
                            style={{
                              position: "absolute",
                              right: 0,
                              top: "100%",
                              background: darkMode ? "#1e293b" : "#ffffff",
                              border: darkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)",
                              borderRadius: "8px",
                              padding: "0.35rem",
                              zIndex: 40,
                              boxShadow: darkMode ? "0 10px 15px -3px rgba(0, 0, 0, 0.3)" : "0 10px 15px -3px rgba(15, 23, 42, 0.08)",
                              minWidth: "110px",
                            }}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRenameModalFile(folder as any);
                                setRenameModalValue(folder.fileName);
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
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z" />
                              </svg>
                              Rename
                            </button>
                            <button
                              onClick={(e) => {
                                  e.stopPropagation();
                                  handlePermanentDelete(folder.id, folder.fileName);
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
                                gap: "0.35rem",
                              }}
                              className="dropdown-item-hover"
                            >
                              <svg style={{ width: "0.8rem", height: "0.8rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                      {/* Direct Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveToTrash(folder);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#EF4444",
                          cursor: "pointer",
                          padding: "0.25rem",
                          borderRadius: "4px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        className="dropdown-item-hover"
                        title="Delete Folder"
                      >
                        <svg style={{ width: "0.95rem", height: "0.95rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Files List Table or Dynamic Grid/Icon View */}
          <div style={{ overflowX: "auto" }}>
            {tab === "trash" ? (
              renderTrashTable(finalFilteredFiles)
            ) : (
              <div>
                {(tab === "dashboard" || tab === "my-files") && finalFilteredFiles.filter((f) => f.mimeType !== "folder").length > 0 && (
                  <h4 style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Files ({finalFilteredFiles.filter((f) => f.mimeType !== "folder").length})
                  </h4>
                )}

                {viewMode === "grid" ? (
                  (filesLoading || semanticSearchLoading) && finalFilteredFiles.length === 0 ? (
                    <div style={{ padding: "3rem 0", display: "flex", justifyContent: "center", width: "100%" }}>
                      <LoadingSpinner size="md" label="Searching files semantically..." />
                    </div>
                  ) : ((tab === "dashboard" || tab === "my-files") ? finalFilteredFiles.filter((f) => f.mimeType !== "folder") : finalFilteredFiles).length === 0 ? (
                    <div style={{ padding: "3rem 0", textAlign: "center", width: "100%" }}>
                      <span style={{ fontSize: "2rem" }}>📭</span>
                      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                        No files matching your search were found.
                      </p>
                    </div>
                  ) : (
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: `repeat(auto-fill, minmax(${gridSize}px, 1fr))`,
                      gap: "1.2rem",
                      padding: "0.25rem 0",
                    }}>
                      {((tab === "dashboard" || tab === "my-files") ? finalFilteredFiles.filter((f) => f.mimeType !== "folder") : finalFilteredFiles).map((file) => {
                      const isStarred = favorites.includes(file.id);
                      const fileStyle = getFileStyle(file.mimeType, file.fileName);
                      
                      const isImage = 
                        file.mimeType.startsWith("image/") || 
                        ((file.mimeType === "application/octet-stream" || !file.mimeType) && 
                         /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(file.fileName));

                      const isVideo = 
                        file.mimeType.startsWith("video/") || 
                        ((file.mimeType === "application/octet-stream" || !file.mimeType) && 
                         /\.(mp4|webm|ogg|mov)$/i.test(file.fileName));

                      return (
                        <div
                          key={file.id}
                          style={{
                            background: "transparent",
                            backdropFilter: "none",
                            border: "none",
                            borderRadius: "14px",
                            padding: 0,
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
                          className="folder-card-hover"
                          onMouseEnter={() => setHoveredFileId(file.id)}
                          onMouseLeave={() => setHoveredFileId(null)}
                          onClick={() => {
                            setActiveDocumentViewerFileId(file.id);
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
                              flexShrink: 0
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
                                  transition: "transform 0.3s ease"
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
                                  transition: "transform 0.2s ease"
                                }}
                              >
                                {renderFileIcon(classifyFile(file.mimeType, file.fileName), file.fileName, file.mimeType)}
                              </div>
                            )}

                            {/* Floating Star button (Visible on Hover or if Starred) */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleFavorite(file.id);
                              }}
                              style={{
                                position: "absolute",
                                top: "0.4rem",
                                left: "0.4rem",
                                background: darkMode ? "rgba(15, 23, 42, 0.75)" : "rgba(255, 255, 255, 0.85)",
                                border: darkMode ? "none" : "1px solid rgba(0, 0, 0, 0.08)",
                                cursor: "pointer",
                                padding: "0.3rem",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                zIndex: 10,
                                backdropFilter: "blur(4px)",
                                opacity: (hoveredFileId === file.id || isStarred) ? 1 : 0,
                                transform: (hoveredFileId === file.id || isStarred) ? "scale(1)" : "scale(0.85)",
                                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
                              }}
                              title={isStarred ? "Starred" : "Star"}
                            >
                              <svg style={{ width: "0.85rem", height: "0.85rem", color: isStarred ? "#FBBF24" : (darkMode ? "#94A3B8" : "#64748B") }} viewBox="0 0 24 24" fill={isStarred ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                              </svg>
                            </button>

                            {/* Floating Ellipsis Menu button */}
                            <div
                              style={{ position: "absolute", top: "0.4rem", right: "0.4rem", zIndex: 10 }}
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
                                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
                                }}
                              >
                                <svg style={{ width: "0.85rem", height: "0.85rem" }} fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 10.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm0-6a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm0 12a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z" />
                                </svg>
                              </button>
                            </div>
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
                                    handleShare(file.id);
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
                                  setRenameModalFile(file);
                                  setRenameModalValue(file.fileName);
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
                                  <line x1="10" y1="11" x2="10" y2="17"/>
                                  <line x1="14" y1="11" x2="14" y2="17"/>
                                </svg>
                                <span>Delete</span>
                              </button>
                            </div>
                          )}

                          {/* File metadata description below */}
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", minWidth: 0, padding: "0.1rem 0.2rem" }}>
                            <p
                              style={{
                                fontSize: "0.78rem",
                                fontWeight: 700,
                                color: darkMode ? "#ffffff" : "#0f172a",
                                margin: 0,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                width: "100%",
                                fontFamily: "var(--font-outfit)"
                              }}
                              title={file.fileName}
                            >
                              {file.fileName}
                            </p>
                            <span
                              style={{
                                fontSize: "0.68rem",
                                color: darkMode ? "#94a3b8" : "#64748b",
                                fontWeight: 600,
                                marginTop: "0.15rem"
                              }}
                            >
                              {formatBytes(file.fileSize)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  )) : (
                  <RecentFilesTable
                    fileList={(tab === "dashboard" || tab === "my-files") ? finalFilteredFiles.filter((f) => f.mimeType !== "folder") : finalFilteredFiles}
                    filesLoading={filesLoading || semanticSearchLoading}
                    deletingIds={deletingIds}
                    downloadingIds={downloadingIds}
                    favorites={favorites}
                    handleToggleFavorite={handleToggleFavorite}
                    handleShare={handleShare}
                    handleRevokeShare={handleRevokeShare}
                    handleDownload={handleDownload}
                    handleMoveToTrash={handleMoveToTrash}
                    getFileStyle={getFileStyle}
                    classifyFile={classifyFile}
                    renderFileIcon={renderFileIcon}
                    formatBytes={formatBytes}
                    getRelativeTime={getRelativeTime}
                    activeMenuFileId={activeMenuFileId}
                    setActiveMenuFileId={setActiveMenuFileId}
                    darkMode={darkMode}
                    onRenameClick={(file) => {
                      setRenameModalFile(file);
                      setRenameModalValue(file.fileName);
                    }}
                    onFileClick={(file) => {
                      setActiveDocumentViewerFileId(file.id);
                    }}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Global Bottom Sticky Upload Progress HUD Widget */}
      {isUploading && uploadProgress !== null && (
        <div
          className="glass-card"
          style={{
            position: "fixed",
            bottom: "1.5rem",
            right: "1.5rem",
            width: "360px",
            background: "var(--bg-card)",
            border: "1px solid var(--border-default)",
            borderRadius: "14px",
            padding: "1.1rem 1.25rem",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15)",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            gap: "0.6rem",
            animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
            <div style={{ display: "flex", gap: "0.65rem", minWidth: 0 }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(245, 158, 11, 0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg className="animate-spin" style={{ width: "0.95rem", height: "0.95rem", color: "#F59E0B" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
              </div>
              <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {uploadingFileName || "Uploading File..."}
                </span>
                <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 500 }}>
                  {formatBytes(uploadedBytes)} of {formatBytes(uploadingFileSize)}
                </span>
              </div>
            </div>

            <button
              onClick={handleCancelUpload}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0.2rem",
                borderRadius: "50%",
                color: "var(--text-muted)",
              }}
              className="dropdown-item-hover"
              title="Cancel Upload"
            >
              <svg style={{ width: "0.85rem", height: "0.85rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div>
            <div style={{ width: "100%", height: "5px", background: "var(--bg-secondary)", borderRadius: "9999px", overflow: "hidden" }}>
              <div style={{ width: `${uploadProgress}%`, height: "100%", background: "#FBBF24", borderRadius: "9999px", transition: "width 0.15s linear" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 500, marginTop: "0.35rem" }}>
              <span>
                {uploadProgress >= 99 
                  ? "Assembling on Telegram (please wait)..." 
                  : (uploadSpeed || "Calculating speed...")}
              </span>
              <span>{uploadProgress}%</span>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Micro-Dialog */}
      {isNewFolderModalOpen && (
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
          onClick={() => setIsNewFolderModalOpen(false)}
        >
          <div
            style={{
              background: darkMode ? "#1e293b" : "#ffffff",
              border: darkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)",
              borderRadius: "16px",
              padding: "1.5rem",
              width: "100%",
              maxWidth: "380px",
              boxShadow: darkMode ? "0 25px 50px -12px rgba(0, 0, 0, 0.5)" : "0 25px 50px -12px rgba(15, 23, 42, 0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: darkMode ? "#ffffff" : "#0f172a", margin: "0 0 0.4rem 0", fontFamily: "var(--font-outfit)" }}>
              Create New Folder
            </h3>
            <p style={{ fontSize: "0.76rem", color: darkMode ? "#94a3b8" : "#64748b", margin: "0 0 1.2rem 0", fontWeight: 500 }}>
              Enter a name for your virtual directory.
            </p>
            
            <form onSubmit={handleCreateFolder}>
              <input
                type="text"
                autoFocus
                placeholder="Folder Name (e.g. Personal)"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                style={{
                  width: "100%",
                  background: darkMode ? "rgba(15, 23, 42, 0.6)" : "rgba(241, 245, 249, 0.9)",
                  border: darkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.1)",
                  borderRadius: "8px",
                  padding: "0.6rem 0.8rem",
                  fontSize: "0.82rem",
                  color: darkMode ? "#ffffff" : "#0f172a",
                  fontWeight: 600,
                  outline: "none",
                  marginBottom: "1.25rem",
                }}
              />
              
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem" }}>
                <button
                  type="button"
                  onClick={() => setIsNewFolderModalOpen(false)}
                  style={{
                    background: "transparent",
                    border: darkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.1)",
                    borderRadius: "8px",
                    padding: "0.45rem 0.9rem",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: darkMode ? "#ffffff" : "#0f172a",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingFolder || !newFolderName.trim()}
                  style={{
                    background: "linear-gradient(135deg, #F59E0B, #D97706)",
                    border: "none",
                    borderRadius: "8px",
                    padding: "0.45rem 0.9rem",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: "#fff",
                    cursor: "pointer",
                    opacity: (!newFolderName.trim() || isCreatingFolder) ? 0.6 : 1,
                  }}
                >
                  {isCreatingFolder ? "Creating..." : "Create Folder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Directory Selector Modal for Upload */}
      <DirectorySelectorModal
        isOpen={isChooseDirModalOpen}
        onClose={() => setIsChooseDirModalOpen(false)}
        onSelect={handleDirectorySelected}
        darkMode={darkMode}
        showToast={showToast}
      />

      {/* Reusable Custom Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        darkMode={darkMode}
        type={confirmModal.type}
      />

      {/* Premium File Details Modal */}
      {selectedDetailsFile && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: darkMode ? "rgba(15, 23, 42, 0.75)" : "rgba(15, 23, 42, 0.4)",
            backdropFilter: "blur(16px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1.5rem",
          }}
          onClick={() => setSelectedDetailsFile(null)}
        >
          <div
            style={{
              background: darkMode ? "#1e293b" : "#ffffff",
              border: darkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)",
              borderRadius: "16px",
              padding: "1.8rem",
              width: "100%",
              maxWidth: "450px",
              boxShadow: darkMode ? "0 25px 50px -12px rgba(0, 0, 0, 0.5)" : "0 25px 50px -12px rgba(15, 23, 42, 0.15)",
              position: "relative",
              fontFamily: "var(--font-outfit)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedDetailsFile(null)}
              style={{
                position: "absolute",
                top: "1.2rem",
                right: "1.2rem",
                background: darkMode ? "rgba(15, 23, 42, 0.5)" : "rgba(0, 0, 0, 0.05)",
                border: "none",
                color: darkMode ? "#94a3b8" : "#64748b",
                cursor: "pointer",
                padding: "0.4rem",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              className="dropdown-item-hover"
            >
              <svg style={{ width: "0.85rem", height: "0.85rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 style={{ fontSize: "1rem", fontWeight: 800, color: darkMode ? "#ffffff" : "#0f172a", marginBottom: "1.2rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.2rem" }}>ℹ️</span> File System Details
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.95rem" }}>
              <div>
                <span style={{ fontSize: "0.72rem", color: darkMode ? "#94a3b8" : "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>File Name</span>
                <p style={{ fontSize: "0.85rem", fontWeight: 800, color: darkMode ? "#ffffff" : "#0f172a", margin: "0.15rem 0 0", wordBreak: "break-all" }}>{selectedDetailsFile.fileName}</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <span style={{ fontSize: "0.72rem", color: darkMode ? "#94a3b8" : "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Size</span>
                  <p style={{ fontSize: "0.85rem", fontWeight: 800, color: "#FBBF24", margin: "0.15rem 0 0" }}>{formatBytes(selectedDetailsFile.fileSize)}</p>
                </div>
                <div>
                  <span style={{ fontSize: "0.72rem", color: darkMode ? "#94a3b8" : "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>MIME Type</span>
                  <p style={{ fontSize: "0.85rem", fontWeight: 800, color: darkMode ? "#ffffff" : "#0f172a", margin: "0.15rem 0 0" }}>{selectedDetailsFile.mimeType || "Unknown"}</p>
                </div>
              </div>

              <div>
                <span style={{ fontSize: "0.72rem", color: darkMode ? "#94a3b8" : "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Uploaded Timestamp</span>
                <p style={{ fontSize: "0.85rem", fontWeight: 800, color: darkMode ? "#ffffff" : "#0f172a", margin: "0.15rem 0 0" }}>{new Date(selectedDetailsFile.createdAt).toLocaleString()}</p>
              </div>

              <div style={{ marginTop: "0.4rem", borderTop: darkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)", paddingTop: "0.95rem", display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setSelectedDetailsFile(null)}
                  style={{
                    background: "rgba(245, 158, 11, 0.15)",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                    color: "#FBBF24",
                    borderRadius: "8px",
                    padding: "0.45rem 1rem",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  className="dropdown-item-hover"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Premium Lightweight Image Viewer Modal */}
      {activeImageViewerFileId && currentViewerImage && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(8, 10, 18, 0.93)",
            backdropFilter: "blur(12px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 10000,
            padding: "1rem",
            userSelect: "none",
          }}
          onClick={() => setActiveImageViewerFileId(null)}
        >
          {/* Header Toolbar */}
          <div
            style={{
              width: "100%",
              maxWidth: "1200px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              zIndex: 10,
              background: "rgba(30, 41, 59, 0.4)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "12px",
              padding: "0.6rem 1rem",
              fontFamily: "var(--font-outfit)",
              backdropFilter: "blur(8px)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <span
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 800,
                  color: "#ffffff",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {currentViewerImage.fileName}
              </span>
              <span style={{ fontSize: "0.68rem", color: "#94a3b8", fontWeight: 600 }}>
                {formatBytes(currentViewerImage.fileSize)} • {isViewerVideo ? "Video" : "Image"} {currentViewerIndex + 1} of {activeImages.length}
              </span>
            </div>

            {/* Viewer action controls */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              {!isViewerVideo && (
                <>
                  <button
                    onClick={() => setImageZoom((z) => Math.max(z - 0.25, 0.5))}
                    style={{ background: "rgba(255, 255, 255, 0.06)", border: "none", color: "#e2e8f0", padding: "0.45rem", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    title="Zoom Out (-)"
                  >
                    <svg style={{ width: "0.95rem", height: "0.95rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6" />
                    </svg>
                  </button>

                  <button
                    onClick={() => setImageZoom((z) => Math.min(z + 0.25, 4))}
                    style={{ background: "rgba(255, 255, 255, 0.06)", border: "none", color: "#e2e8f0", padding: "0.45rem", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    title="Zoom In (+)"
                  >
                    <svg style={{ width: "0.95rem", height: "0.95rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
                    </svg>
                  </button>

                  <button
                    onClick={() => setImageRotation((r) => (r + 90) % 360)}
                    style={{ background: "rgba(255, 255, 255, 0.06)", border: "none", color: "#e2e8f0", padding: "0.45rem", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    title="Rotate 90°"
                  >
                    <svg style={{ width: "0.95rem", height: "0.95rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3" />
                    </svg>
                  </button>

                  <button
                    onClick={() => setImageFlipH((f) => !f)}
                    style={{ background: "rgba(255, 255, 255, 0.06)", border: "none", color: "#e2e8f0", padding: "0.45rem", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    title="Flip Horizontal"
                  >
                    <svg style={{ width: "0.95rem", height: "0.95rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </button>

                  <button
                    onClick={() => setImageFlipV((f) => !f)}
                    style={{ background: "rgba(255, 255, 255, 0.06)", border: "none", color: "#e2e8f0", padding: "0.45rem", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    title="Flip Vertical"
                  >
                    <svg style={{ width: "0.95rem", height: "0.95rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 8v12m0 0l-4-4m4 4l4-4m6 0V4m0 0l4 4m-4-4l-4 4" />
                    </svg>
                  </button>

                  <button
                    onClick={() => {
                      setImageZoom(1);
                      setImageRotation(0);
                      setImageFlipH(false);
                      setImageFlipV(false);
                    }}
                    style={{ background: "rgba(255, 255, 255, 0.06)", border: "none", color: "#e2e8f0", padding: "0.45rem", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    title="Reset View"
                  >
                    <svg style={{ width: "0.95rem", height: "0.95rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                </>
              )}

              <button
                onClick={() => handleDownload(currentViewerImage.id, currentViewerImage.fileName)}
                style={{ background: "rgba(245, 158, 11, 0.2)", border: "1px solid rgba(245, 158, 11, 0.3)", color: "#FBBF24", padding: "0.45rem", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                title="Download"
              >
                <svg style={{ width: "0.95rem", height: "0.95rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>

              <div style={{ width: "1px", height: "20px", background: "rgba(255,255,255,0.15)", margin: "0 0.2rem" }} />

              <button
                onClick={() => setActiveImageViewerFileId(null)}
                style={{ background: "rgba(239, 68, 68, 0.2)", border: "none", color: "#f87171", padding: "0.45rem", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                title="Close (Esc)"
              >
                <svg style={{ width: "0.95rem", height: "0.95rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Main Viewer area */}
          <div
            style={{
              position: "relative",
              flex: 1,
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setActiveImageViewerFileId(null);
              }
            }}
          >
            {/* Previous Image Chevron */}
            {currentViewerIndex > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevViewerImage();
                }}
                style={{
                  position: "absolute",
                  left: "1.5rem",
                  background: "rgba(30, 41, 59, 0.6)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#ffffff",
                  padding: "0.8rem",
                  borderRadius: "50%",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 20,
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

            {/* Media Canvas with Premium Styles */}
            <div
              style={{
                position: "relative",
                width: isViewerVideo ? "90vw" : "auto",
                maxWidth: isViewerVideo ? "1080px" : "85%",
                maxHeight: "85%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "12px",
                overflow: isViewerVideo ? "visible" : "hidden",
                boxShadow: isViewerVideo ? "none" : "0 25px 50px -12px rgba(0, 0, 0, 0.8)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {isViewerVideo ? (
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onDoubleClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const width = rect.width;
                    if (x < width / 2) {
                      // Double click on left half -> Rewind 10s
                      if (videoRef.current) {
                        videoRef.current.currentTime = Math.max(videoRef.current.currentTime - 10, 0);
                        showToast("info", "Rewind 10s ↩️");
                      }
                    } else {
                      // Double click on right half -> Fast Forward 10s
                      if (videoRef.current) {
                        videoRef.current.currentTime = Math.min(videoRef.current.currentTime + 10, videoRef.current.duration || 0);
                        showToast("info", "Forward 10s ↪️");
                      }
                    }
                  }}
                >
                  <video
                    ref={videoRef}
                    src={`/api/files/${currentViewerImage.id}`}
                    controls
                    autoPlay
                    onSeeking={() => setIsVideoBuffering(true)}
                    onSeeked={() => setIsVideoBuffering(false)}
                    onWaiting={() => setIsVideoBuffering(true)}
                    onPlaying={() => setIsVideoBuffering(false)}
                    onCanPlay={() => setIsVideoBuffering(false)}
                    style={{
                      width: "100%",
                      height: "auto",
                      maxHeight: "75vh",
                      borderRadius: "12px",
                      boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)",
                      outline: "none",
                      backgroundColor: "#000000",
                    }}
                  />
                  {isVideoBuffering && (
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "rgba(0, 0, 0, 0.45)",
                        borderRadius: "12px",
                        zIndex: 5,
                        pointerEvents: "none",
                      }}
                    >
                      <div
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "50%",
                          border: "4px solid rgba(255, 255, 255, 0.2)",
                          borderTopColor: "#3b82f6",
                          animation: "spin 0.8s linear infinite",
                        }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <img
                  src={`/api/files/${currentViewerImage.id}`}
                  alt={currentViewerImage.fileName}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "80vh",
                    objectFit: "contain",
                    transform: `scale(${imageZoom}) rotate(${imageRotation}deg) scaleX(${imageFlipH ? -1 : 1}) scaleY(${imageFlipV ? -1 : 1})`,
                    transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    pointerEvents: "none",
                  }}
                />
              )}
            </div>

            {/* Next Image Chevron */}
            {currentViewerIndex < activeImages.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNextViewerImage();
                }}
                style={{
                  position: "absolute",
                  right: "1.5rem",
                  background: "rgba(30, 41, 59, 0.6)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#ffffff",
                  padding: "0.8rem",
                  borderRadius: "50%",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 20,
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
          </div>

          {/* Footer Info Display */}
          <div
            style={{
              padding: "0.5rem 1rem",
              background: "rgba(15, 23, 42, 0.6)",
              borderRadius: "20px",
              fontSize: "0.72rem",
              color: "#94a3b8",
              fontFamily: "var(--font-outfit)",
              border: "1px solid rgba(255, 255, 255, 0.05)",
              zIndex: 10,
              marginBottom: "0.5rem",
            }}
          >
            {isViewerVideo ? (
              <span>Video Player • Controls: Arrow Keys (Nav) • Esc (Exit) • Native Player Controls (Play/Pause, Fullscreen)</span>
            ) : (
              <span>Zoom: {Math.round(imageZoom * 100)}% • Rotation: {imageRotation}° • Controls: Arrow Keys (Nav) • Esc (Exit) • +/- (Zoom)</span>
            )}
          </div>
        </div>
      )}

      {/* Shadcn Command Palette modal */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={(tabName) => router.push(`/dashboard?tab=${tabName}`)}
        onUpload={triggerFileInput}
        onToggleTheme={toggleDarkMode}
        files={files}
        darkMode={darkMode}
      />

      {/* Premium Document Viewer modal */}
      <DocumentViewer
        file={files.find((f) => f.id === activeDocumentViewerFileId) || null}
        isOpen={activeDocumentViewerFileId !== null}
        onClose={() => setActiveDocumentViewerFileId(null)}
        darkMode={darkMode}
        handleDownload={handleDownload}
        handleShare={handleShare}
        hasPrev={currentViewerDocIndex > 0}
        hasNext={currentViewerDocIndex !== -1 && currentViewerDocIndex < activeDocuments.length - 1}
        onPrev={handlePrevViewerDoc}
        onNext={handleNextViewerDoc}
        handleRename={handleRenameFile}
      />

      {/* Premium Rename File/Folder Dialog Modal */}
      {renameModalFile && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(8, 10, 18, 0.75)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 20000,
            animation: "fadeIn 0.2s ease-out",
          }}
          onClick={() => setRenameModalFile(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "420px",
              background: darkMode ? "#111827" : "#ffffff",
              border: darkMode ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.08)",
              borderRadius: "16px",
              padding: "1.5rem",
              boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
              fontFamily: "var(--font-outfit), sans-serif",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: darkMode ? "#ffffff" : "#0f172a", margin: "0 0 0.5rem 0" }}>
              Rename {renameModalFile.mimeType === "folder" ? "Folder" : "File"}
            </h3>
            <p style={{ fontSize: "0.78rem", color: darkMode ? "#94a3b8" : "#64748b", margin: "0 0 1rem 0", lineHeight: 1.4 }}>
              Enter a new name for your {renameModalFile.mimeType === "folder" ? "folder" : "file"}.
            </p>
            <form onSubmit={handleRenameModalSubmit}>
              <input
                type="text"
                value={renameModalValue}
                onChange={(e) => setRenameModalValue(e.target.value)}
                autoFocus
                disabled={renameModalLoading}
                style={{
                  width: "100%",
                  background: darkMode ? "rgba(15, 23, 42, 0.6)" : "rgba(0, 0, 0, 0.03)",
                  border: "1px solid rgba(245, 158, 11, 0.5)",
                  borderRadius: "10px",
                  padding: "0.6rem 0.8rem",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  color: darkMode ? "#ffffff" : "#0f172a",
                  outline: "none",
                  marginBottom: "1.25rem",
                }}
              />
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setRenameModalFile(null)}
                  disabled={renameModalLoading}
                  style={{
                    background: "transparent",
                    border: darkMode ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(0,0,0,0.15)",
                    borderRadius: "8px",
                    padding: "0.5rem 1rem",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    color: darkMode ? "#e2e8f0" : "#475569",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={renameModalLoading}
                  style={{
                    background: "linear-gradient(135deg, #F59E0B, #D97706)",
                    border: "none",
                    borderRadius: "8px",
                    padding: "0.5rem 1.25rem",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    color: "#ffffff",
                    cursor: "pointer",
                    boxShadow: "0 4px 15px rgba(217, 119, 6, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                  }}
                >
                  {renameModalLoading ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <LoadingSpinner size="lg" label="Establishing secure dashboard..." />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
