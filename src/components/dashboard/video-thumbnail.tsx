"use client";

import { useState, useEffect } from "react";

// Global client-side thumbnail cache map to persist captured video frames between renders and page navigation
const videoThumbnailCache = new Map<string, string>();

export function VideoThumbnail({ fileId }: { fileId: string }) {
  const [cachedSrc, setCachedSrc] = useState<string | null>(
    videoThumbnailCache.get(fileId) || null
  );

  useEffect(() => {
    if (cachedSrc) return;

    // Create a temporary video element to extract the first frame
    const video = document.createElement("video");
    video.src = `/api/files/${fileId}#t=0.1`;
    video.crossOrigin = "anonymous";
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const handleLoadedData = () => {
      // Seek slightly to ensure video frame is painted
      video.currentTime = 0.1;
    };

    const handleSeeked = () => {
      try {
        const canvas = document.createElement("canvas");
        
        // Dynamically match video aspect ratio while capping width at 320px for high-fidelity sharp rendering
        const maxThumbnailWidth = 320;
        const nativeWidth = video.videoWidth || 320;
        const nativeHeight = video.videoHeight || 180;
        
        let targetWidth = nativeWidth;
        let targetHeight = nativeHeight;
        
        if (nativeWidth > maxThumbnailWidth) {
          const ratio = maxThumbnailWidth / nativeWidth;
          targetWidth = maxThumbnailWidth;
          targetHeight = Math.round(nativeHeight * ratio);
        }
        
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.9); // Increase JPEG quality to 90%
          videoThumbnailCache.set(fileId, dataUrl);
          setCachedSrc(dataUrl);
        }
      } catch (err) {
        console.error("Failed to generate video thumbnail", err);
      } finally {
        // Cleanup resources
        video.removeEventListener("loadeddata", handleLoadedData);
        video.removeEventListener("seeked", handleSeeked);
        video.src = "";
        video.load();
      }
    };

    video.addEventListener("loadeddata", handleLoadedData);
    video.addEventListener("seeked", handleSeeked);
    video.load();

    return () => {
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("seeked", handleSeeked);
      video.src = "";
      video.load();
    };
  }, [fileId, cachedSrc]);

  if (cachedSrc) {
    return (
      <img
        src={cachedSrc}
        alt="Video preview"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
        loading="lazy"
      />
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#000000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg style={{ width: "0.65rem", height: "0.65rem", color: "#F59E0B" }} viewBox="0 0 24 24" fill="currentColor">
        <polygon points="5 3 19 12 5 21 5 3"/>
      </svg>
    </div>
  );
}
