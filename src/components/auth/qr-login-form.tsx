"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { RefreshCw, Smartphone, CheckCircle } from "lucide-react";

interface QrLoginFormProps {
  onToggleMethod?: (method: "phone" | "qr") => void;
}

export function QrLoginForm({ onToggleMethod }: QrLoginFormProps) {
  const [qrId, setQrId] = useState<string | null>(null);
  const [loginUrl, setLoginUrl] = useState<string | null>(null);
  const [expires, setExpires] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [status, setStatus] = useState<"loading" | "pending" | "success" | "expired" | "error" | "2fa_required">("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  const router = useRouter();
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isSuccessRef = useRef(false);

  // Dynamic Theme mutation listener
  useEffect(() => {
    const checkTheme = () => {
      setIsDarkTheme(document.documentElement.classList.contains("dark"));
    };
    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // Helper to draw rounded rectangle on canvas
  const drawRoundedRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    fill = false,
    stroke = true
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  };

  // High-fidelity custom canvas renderer with dynamic theme and logo image
  const renderQr = (url: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Load Telegram circular icon image centered
    const img = new Image();
    img.src = "/qrImage.png";

    const drawAll = () => {
      try {
        // Generate standard QR matrix with High Error Correction
        const qr = QRCode.create(url, { errorCorrectionLevel: "H" });
        const modules = qr.modules;
        const size = modules.size;

        // High-DPI screen scaling
        const dpi = window.devicePixelRatio || 2;
        const displaySize = 230;
        canvas.width = displaySize * dpi;
        canvas.height = displaySize * dpi;
        canvas.style.width = `${displaySize}px`;
        canvas.style.height = `${displaySize}px`;
        ctx.scale(dpi, dpi);

        const width = displaySize;
        const height = displaySize;
        const cellSize = width / size;

        // 1. Keep canvas background transparent to match the card perfectly
        ctx.clearRect(0, 0, width, height);

        // Skips corner finders and center regions
        const isFinder = (r: number, c: number) => {
          if (r < 7 && c < 7) return true; // Top-Left
          if (r < 7 && c >= size - 7) return true; // Top-Right
          if (c < 7 && r >= size - 7) return true; // Bottom-Left
          return false;
        };

        const isCenter = (r: number, c: number) => {
          const centerX = (size - 1) / 2;
          const centerY = (size - 1) / 2;
          const dist = Math.sqrt(Math.pow(r - centerY, 2) + Math.pow(c - centerX, 2));
          return dist < 5.2; // Perfectly skips dots in the logo area + premium padding
        };

        // 2. Draw standard dots as dynamic rounded circles
        ctx.fillStyle = isDarkTheme ? "#FFFFFF" : "#0F172A"; // white dots in dark, slate in light
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            if (modules.get(r, c)) {
              if (isFinder(r, c) || isCenter(r, c)) {
                continue;
              }
              const x = c * cellSize;
              const y = r * cellSize;

              ctx.beginPath();
              const rx = x + cellSize / 2;
              const ry = y + cellSize / 2;
              const rad = cellSize * 0.45;
              ctx.arc(rx, ry, rad, 0, 2 * Math.PI);
              ctx.fill();
            }
          }
        }

        // 3. Draw premium rounded Corner Finders
        const drawFinder = (x: number, y: number) => {
          ctx.strokeStyle = isDarkTheme ? "#FFFFFF" : "#0F172A";
          ctx.fillStyle = isDarkTheme ? "#FFFFFF" : "#0F172A";
          ctx.lineWidth = cellSize;

          // Outer rounded ring
          const outerOffset = cellSize / 2;
          const outerWidth = 7 * cellSize - cellSize;
          const outerRadius = cellSize * 1.8;
          drawRoundedRect(
            ctx,
            x + outerOffset,
            y + outerOffset,
            outerWidth,
            outerWidth,
            outerRadius,
            false,
            true
          );

          // Inner solid finder dot
          const innerX = x + 2 * cellSize;
          const innerY = y + 2 * cellSize;
          const innerWidth = 3 * cellSize;
          const innerRadius = cellSize * 0.8;
          drawRoundedRect(
            ctx,
            innerX,
            innerY,
            innerWidth,
            innerWidth,
            innerRadius,
            true,
            false
          );
        };

        drawFinder(0, 0); // Top-Left
        drawFinder((size - 7) * cellSize, 0); // Top-Right
        drawFinder(0, (size - 7) * cellSize); // Bottom-Left

        // 4. Draw dynamic/centered transparent Telegram Logo image (background is transparent since modules are skipped in isCenter)
        const cx = width / 2;
        const cy = height / 2;
        const logoSize = cellSize * 9.5;
        ctx.drawImage(img, cx - logoSize / 2, cy - logoSize / 2, logoSize, logoSize);

      } catch (err) {
        console.error("Premium QR renderer error:", err);
      }
    };

    if (img.complete) {
      drawAll();
    } else {
      img.onload = drawAll;
    }
  };

  // Trigger QR rendering once Url or theme changes
  useEffect(() => {
    if (status === "pending" && loginUrl) {
      renderQr(loginUrl);
    }
  }, [status, loginUrl, isDarkTheme]);

  // Initialize/Fetch the QR Code Token
  const initiateQrLogin = async () => {
    try {
      setStatus("loading");
      setErrorMsg("");

      const response = await fetch("/api/auth/qr/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to initiate QR Login.");
      }

      const { qrId, loginUrl, expires } = data.data;

      setQrId(qrId);
      setLoginUrl(loginUrl);
      setExpires(expires);

      const diff = Math.max(0, expires - Math.floor(Date.now() / 1000));
      setSecondsLeft(diff);
      setStatus("pending");

    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setErrorMsg(err.message || "Connection failed. Please check your setup.");
    }
  };

  useEffect(() => {
    initiateQrLogin();

    return () => {
      stopPolling();
      stopCountdown();
    };
  }, []);

  // Poll status endpoint
  const checkStatus = async () => {
    if (isSuccessRef.current || !qrId || status !== "pending") return;

    try {
      const response = await fetch(`/api/auth/qr/status?qrId=${qrId}`);
      const data = await response.json();

      if (isSuccessRef.current) return;

      if (!data.success) {
        throw new Error(data.message || "Session error.");
      }

      const resData = data.data;

      if (resData.status === "success") {
        isSuccessRef.current = true;
        stopPolling();
        stopCountdown();
        setStatus("success");
        setTimeout(() => {
          router.push("/dashboard");
        }, 1500);
      } else if (resData.status === "expired") {
        stopPolling();
        stopCountdown();
        setStatus("expired");
      } else if (resData.status === "2fa_required") {
        stopPolling();
        stopCountdown();
        setStatus("2fa_required");
      } else if (resData.status === "pending" && resData.loginUrl && resData.loginUrl !== loginUrl) {
        setLoginUrl(resData.loginUrl);
        setExpires(resData.expires);
      }
    } catch (err: any) {
      console.error("Polling error", err);
    }
  };

  // Start polling when pending
  useEffect(() => {
    if (status === "pending" && qrId) {
      stopPolling();
      pollingRef.current = setInterval(checkStatus, 2500);
    } else {
      stopPolling();
    }

    return () => stopPolling();
  }, [status, qrId, loginUrl]);

  // Start countdown timer
  useEffect(() => {
    if (status === "pending" && expires) {
      stopCountdown();
      countdownRef.current = setInterval(() => {
        if (isSuccessRef.current) {
          stopCountdown();
          return;
        }
        const diff = Math.max(0, expires - Math.floor(Date.now() / 1000));
        setSecondsLeft(diff);
        if (diff <= 0) {
          if (!isSuccessRef.current) {
            setStatus("expired");
          }
          stopCountdown();
        }
      }, 1000);
    } else {
      stopCountdown();
    }

    return () => stopCountdown();
  }, [status, expires]);

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const stopCountdown = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        gap: "1.25rem",
        animation: "fade-in 0.4s ease-out forwards",
      }}
    >
      {/* QR Code Canvas Card Wrapper */}
      <div
        className="glass-card"
        style={{
          position: "relative",
          width: "250px",
          height: "250px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: isDarkTheme ? "#1E1E1E" : "#FFFFFF", // dynamically matches the theme background
          borderRadius: "1.25rem",
          overflow: "hidden",
          border: isDarkTheme ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid var(--border-default)",
          boxShadow: "var(--glass-shadow)",
          padding: "0.6rem",
          transition: "background 0.3s ease, border-color 0.3s ease",
        }}
      >
        {status === "loading" && (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.85rem",
              background: isDarkTheme ? "#1E1E1E" : "#FFFFFF",
              borderRadius: "0.8rem",
              transition: "background 0.3s ease",
            }}
          >
            <svg
              width="160"
              height="160"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="qr-skeleton-svg"
              style={{
                opacity: 0.85,
              }}
            >
              {/* Top-Left Finder */}
              <rect x="2" y="2" width="24" height="24" rx="5" stroke={isDarkTheme ? "#334155" : "#CBD5E1"} strokeWidth="4" />
              <rect x="8" y="8" width="12" height="12" rx="3" fill={isDarkTheme ? "#334155" : "#CBD5E1"} />

              {/* Top-Right Finder */}
              <rect x="74" y="2" width="24" height="24" rx="5" stroke={isDarkTheme ? "#334155" : "#CBD5E1"} strokeWidth="4" />
              <rect x="80" y="8" width="12" height="12" rx="3" fill={isDarkTheme ? "#334155" : "#CBD5E1"} />

              {/* Bottom-Left Finder */}
              <rect x="2" y="74" width="24" height="24" rx="5" stroke={isDarkTheme ? "#334155" : "#CBD5E1"} strokeWidth="4" />
              <rect x="8" y="80" width="12" height="12" rx="3" fill={isDarkTheme ? "#334155" : "#CBD5E1"} />

              {/* Scattered Abstract QR Blocks */}
              <rect x="34" y="4" width="6" height="6" rx="2" fill={isDarkTheme ? "#1E293B" : "#F1F5F9"} />
              <rect x="44" y="4" width="6" height="6" rx="2" fill={isDarkTheme ? "#1E293B" : "#F1F5F9"} />
              <rect x="54" y="4" width="6" height="6" rx="2" fill={isDarkTheme ? "#1E293B" : "#F1F5F9"} />
              <rect x="64" y="4" width="6" height="6" rx="2" fill={isDarkTheme ? "#1E293B" : "#F1F5F9"} />

              <rect x="34" y="14" width="16" height="6" rx="2" fill={isDarkTheme ? "#1E293B" : "#F1F5F9"} />
              <rect x="54" y="14" width="6" height="6" rx="2" fill={isDarkTheme ? "#1E293B" : "#F1F5F9"} />
              <rect x="64" y="14" width="6" height="6" rx="2" fill={isDarkTheme ? "#1E293B" : "#F1F5F9"} />

              <rect x="4" y="34" width="6" height="6" rx="2" fill={isDarkTheme ? "#1E293B" : "#F1F5F9"} />
              <rect x="14" y="34" width="6" height="6" rx="2" fill={isDarkTheme ? "#1E293B" : "#F1F5F9"} />
              <rect x="24" y="34" width="6" height="6" rx="2" fill={isDarkTheme ? "#1E293B" : "#F1F5F9"} />
              <rect x="34" y="34" width="16" height="6" rx="2" fill={isDarkTheme ? "#1E293B" : "#F1F5F9"} />
              <rect x="54" y="34" width="6" height="16" rx="2" fill={isDarkTheme ? "#1E293B" : "#F1F5F9"} />
              <rect x="64" y="34" width="16" height="6" rx="2" fill={isDarkTheme ? "#1E293B" : "#F1F5F9"} />
              <rect x="84" y="34" width="12" height="6" rx="2" fill={isDarkTheme ? "#1E293B" : "#F1F5F9"} />

              <rect x="4" y="44" width="16" height="6" rx="2" fill={isDarkTheme ? "#1E293B" : "#F1F5F9"} />
              <rect x="24" y="44" width="6" height="16" rx="2" fill={isDarkTheme ? "#1E293B" : "#F1F5F9"} />
              <rect x="34" y="44" width="6" height="6" rx="2" fill={isDarkTheme ? "#1E293B" : "#F1F5F9"} />
              <rect x="44" y="44" width="6" height="6" rx="2" fill={isDarkTheme ? "#1E293B" : "#F1F5F9"} />
              <rect x="74" y="44" width="6" height="16" rx="2" fill={isDarkTheme ? "#1E293B" : "#F1F5F9"} />
              <rect x="84" y="44" width="12" height="6" rx="2" fill={isDarkTheme ? "#1E293B" : "#F1F5F9"} />

              <rect x="4" y="54" width="6" height="6" rx="2" fill={isDarkTheme ? "#1E293B" : "#F1F5F9"} />
              <rect x="14" y="54" width="6" height="6" rx="2" fill={isDarkTheme ? "#1E293B" : "#F1F5F9"} />
              <rect x="34" y="54" width="16" height="6" rx="2" fill={isDarkTheme ? "#1E293B" : "#F1F5F9"} />
              <rect x="64" y="54" width="6" height="16" rx="2" fill={isDarkTheme ? "#1E293B" : "#F1F5F9"} />
              <rect x="84" y="54" width="6" height="16" rx="2" fill={isDarkTheme ? "#1E293B" : "#F1F5F9"} />

              <rect x="4" y="64" width="6" height="6" rx="2" fill={isDarkTheme ? "#1E293B" : "#F1F5F9"} />
              <rect x="14" y="64" width="16" height="6" rx="2" fill={isDarkTheme ? "#1E293B" : "#F1F5F9"} />
              <rect x="34" y="64" width="6" height="6" rx="2" fill={isDarkTheme ? "#1E293B" : "#F1F5F9"} />
              <rect x="44" y="64" width="16" height="6" rx="2" fill={isDarkTheme ? "#1E293B" : "#F1F5F9"} />
              <rect x="74" y="64" width="6" height="6" rx="2" fill={isDarkTheme ? "#1E293B" : "#F1F5F9"} />
              <rect x="84" y="64" width="12" height="6" rx="2" fill={isDarkTheme ? "#1E293B" : "#F1F5F9"} />

              <rect x="34" y="74" width="16" height="6" rx="2" fill={isDarkTheme ? "#1E293B" : "#F1F5F9"} />
              <rect x="54" y="74" width="6" height="16" rx="2" fill={isDarkTheme ? "#1E293B" : "#F1F5F9"} />
              <rect x="64" y="74" width="6" height="6" rx="2" fill={isDarkTheme ? "#1E293B" : "#F1F5F9"} />

              <rect x="34" y="84" width="6" height="12" rx="2" fill={isDarkTheme ? "#1E293B" : "#F1F5F9"} />
              <rect x="44" y="84" width="6" height="6" rx="2" fill={isDarkTheme ? "#1E293B" : "#F1F5F9"} />
              <rect x="64" y="84" width="16" height="6" rx="2" fill={isDarkTheme ? "#1E293B" : "#F1F5F9"} />
              <rect x="84" y="84" width="12" height="6" rx="2" fill={isDarkTheme ? "#1E293B" : "#F1F5F9"} />

              {/* Center Circle Mask */}
              <circle cx="50" cy="50" r="14" fill={isDarkTheme ? "#334155" : "#CBD5E1"} />
            </svg>
            <span
              style={{
                fontSize: "0.72rem",
                color: isDarkTheme ? "#64748B" : "#94A3B8",
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                animation: "pulse-fast 1.5s infinite",
              }}
            >
              Genrating qr code...
            </span>
          </div>
        )}

        {status === "pending" && (
          <canvas
            ref={canvasRef}
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "0.8rem",
              animation: "fade-in 0.3s ease-out forwards",
            }}
          />
        )}

        {status === "success" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.75rem",
              animation: "fade-in 0.3s ease-out",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "rgba(16, 185, 129, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#10B981",
              }}
            >
              <CheckCircle size={36} />
            </div>
            <span style={{ fontSize: "0.95rem", color: "#10B981", fontWeight: 700 }}>
              Authorized! Redirecting...
            </span>
          </div>
        )}

        {status === "2fa_required" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.75rem",
              padding: "1.5rem",
              textAlign: "center",
            }}
          >
            <Smartphone size={32} style={{ color: "#F59E0B" }} />
            <span style={{ fontSize: "0.85rem", color: isDarkTheme ? "#F4F4F5" : "var(--text-primary)", fontWeight: 700 }}>
              2FA Verification Required
            </span>
            <p style={{ fontSize: "0.75rem", color: isDarkTheme ? "#A1A1AA" : "var(--text-secondary)", lineHeight: 1.4 }}>
              Please enter your Cloud Password inside the Telegram app on your phone.
            </p>
          </div>
        )}

        {status === "expired" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: isDarkTheme ? "rgba(30, 30, 30, 0.95)" : "rgba(255, 255, 255, 0.95)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.75rem",
              padding: "1rem",
              backdropFilter: "blur(4px)",
              animation: "fade-in 0.25s ease-out",
            }}
          >
            <span style={{ fontSize: "0.85rem", color: isDarkTheme ? "#A1A1AA" : "#64748B", fontWeight: 700 }}>
              QR Code Expired
            </span>
            <button
              onClick={initiateQrLogin}
              className="btn btn-primary"
              style={{
                padding: "0.5rem 1rem",
                fontSize: "0.8rem",
                borderRadius: "0.5rem",
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                background: "linear-gradient(135deg, #facc15, #eab308)",
                color: "#1e293b",
                fontWeight: 800,
                border: "1px solid rgba(234, 179, 8, 0.3)",
                boxShadow: "0 3px 6px rgba(234, 179, 8, 0.15)",
                fontFamily: "var(--font-outfit), var(--font-sans), system-ui, sans-serif",
                cursor: "pointer",
              }}
            >
              <RefreshCw size={12} />
              <span>Refresh QR</span>
            </button>
          </div>
        )}

        {status === "error" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.75rem",
              padding: "1.5rem",
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: "0.85rem", color: "#EF4444", fontWeight: 700 }}>
              Failed to connect
            </span>
            <p style={{ fontSize: "0.75rem", color: isDarkTheme ? "#A1A1AA" : "var(--text-secondary)", minHeight: "36px" }}>
              {errorMsg}
            </p>
            <button
              onClick={initiateQrLogin}
              className="btn btn-secondary"
              style={{
                padding: "0.5rem 1rem",
                fontSize: "0.8rem",
                borderRadius: "0.5rem",
              }}
            >
              Retry
            </button>
          </div>
        )}
      </div>



      {/* Official Telegram QR Code Typography & Instructions */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
          gap: "1.5rem",
          marginTop: "0.5rem",
        }}
      >
        <h3
          style={{
            fontSize: "1.5rem",
            fontWeight: 500,
            color: isDarkTheme ? "#FFFFFF" : "#000000",
            textAlign: "center",
            margin: "0",
            fontFamily: "var(--font-outfit), var(--font-sans), system-ui, -apple-system, sans-serif",
            letterSpacing: "-0.01em",
          }}
        >
          Log in to CloudBridge by QR Code
        </h3>

        <ol
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            padding: "0",
            margin: "0 0 1.25rem 0",
            listStyleType: "none",
            counterReset: "inst-counter",
            maxWidth: "340px",
            width: "100%",
          }}
        >
          {[
            "Open Telegram on your phone",
            "Go to Settings › Devices › Link Desktop Device",
            "Point your phone at this screen to confirm login",
          ].map((text, idx) => (
            <li
              key={idx}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
                fontSize: "0.9rem",
                color: isDarkTheme ? "#AAAAAA" : "#555555",
                lineHeight: "1.5",
                textAlign: "left",
                fontFamily: "var(--font-outfit), var(--font-sans), system-ui, -apple-system, sans-serif",
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "1.25rem",
                  height: "1.25rem",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: isDarkTheme ? "#AAAAAA" : "#555555",
                  flexShrink: 0,
                }}
              >
                {idx + 1}.
              </span>
              <span>
                {idx === 1 ? (
                  <>
                    Go to <strong>Settings › Devices › Link Desktop Device</strong>
                  </>
                ) : (
                  text
                )}
              </span>
            </li>
          ))}
        </ol>

        {onToggleMethod && (
          <button
            onClick={() => onToggleMethod("phone")}
            style={{
              background: "none",
              border: "none",
              color: isDarkTheme ? "#fbbf24" : "#d97706",
              fontWeight: 700,
              fontSize: "0.85rem",
              cursor: "pointer",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              padding: "0.5rem 1rem",
              marginTop: "0.25rem",
              fontFamily: "var(--font-outfit), var(--font-sans), system-ui, -apple-system, sans-serif",
              transition: "color 0.2s ease, opacity 0.2s ease",
              outline: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.8";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
          >
            LOG IN BY PHONE NUMBER
          </button>
        )}
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes pulse-fast {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
        @keyframes qr-skeleton-shimmer {
          0%, 100% { opacity: 0.12; }
          50% { opacity: 0.45; }
        }
        .qr-skeleton-svg rect, .qr-skeleton-svg circle {
          animation: qr-skeleton-shimmer 1.5s ease-in-out infinite;
        }
        .qr-skeleton-svg rect:nth-child(2n), .qr-skeleton-svg rect:nth-child(3n) {
          animation-delay: 0.25s;
        }
        .qr-skeleton-svg rect:nth-child(4n) {
          animation-delay: 0.5s;
        }
      `}} />
    </div>
  );
}
