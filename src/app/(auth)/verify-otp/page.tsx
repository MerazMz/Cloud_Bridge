"use client";

import { useState, useEffect, Suspense } from "react";
import { OtpForm } from "@/components/auth/otp-form";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import Link from "next/link";
import Image from "next/image";

export default function VerifyOtpPage() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Initialize theme on client mount
  useEffect(() => {
    setMounted(true);
    const hasDarkClass = document.documentElement.classList.contains("dark");
    const localTheme = localStorage.getItem("theme");
    const isDarkTheme = hasDarkClass || localTheme === "dark";
    
    setIsDark(isDarkTheme);
    if (isDarkTheme) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;

    const applyTheme = () => {
      setIsDark(nextDark);
      if (nextDark) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
      }
    };

    if (typeof document.startViewTransition !== "function") {
      applyTheme();
      return;
    }

    const root = document.documentElement;
    root.dataset.magicuiThemeVt = "active";

    const transition = document.startViewTransition(() => {
      applyTheme();
    });

    const cleanup = () => {
      delete root.dataset.magicuiThemeVt;
    };

    if (typeof transition?.finished?.finally === "function") {
      transition.finished.finally(cleanup);
    } else {
      cleanup();
    }
  };

  const renderThemeButton = () => {
    if (!mounted) {
      return (
        <div style={{ width: "34px", height: "34px", borderRadius: "0.6rem", background: "rgba(0, 0, 0, 0.02)" }} />
      );
    }

    return (
      <button
        onClick={toggleTheme}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "34px",
          height: "34px",
          border: "1px solid var(--border-default)",
          borderRadius: "0.6rem",
          background: "var(--bg-card)",
          color: isDark ? "#FBBF24" : "#4F46E5",
          cursor: "pointer",
          outline: "none",
          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.02)",
          transition: "all 0.2s ease",
          zIndex: 50,
        }}
        title="Toggle Theme"
        className="theme-toggle-btn"
      >
        {isDark ? (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        ) : (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
        )}
      </button>
    );
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        width: "100%",
        padding: "2rem 1.5rem",
        boxSizing: "border-box",
        position: "relative",
        background: isDark
          ? "linear-gradient(135deg, #09090B 0%, #121215 100%)"
          : "linear-gradient(135deg, #FFFDF9 0%, #FFF8EA 100%)",
        overflowX: "hidden",
      }}
    >
      {/* Decorative ambient background curves and stars */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: "none",
          zIndex: 1,
          opacity: isDark ? 0.15 : 0.8,
        }}
      >
        {/* Curved dotted line top-right */}
        <svg
          style={{
            position: "absolute",
            top: "5%",
            right: "-5%",
            width: "350px",
            height: "350px",
          }}
          viewBox="0 0 200 200"
          fill="none"
        >
          <path
            d="M20,180 Q100,100 180,180"
            stroke="#FFA800"
            strokeWidth="1.5"
            strokeDasharray="4 6"
            fill="none"
          />
        </svg>

        {/* Curved dotted line bottom-left */}
        <svg
          style={{
            position: "absolute",
            bottom: "-5%",
            left: "-5%",
            width: "300px",
            height: "300px",
          }}
          viewBox="0 0 200 200"
          fill="none"
        >
          <path
            d="M20,180 Q100,100 180,180"
            stroke="#FFA800"
            strokeWidth="1.5"
            strokeDasharray="4 6"
            fill="none"
          />
        </svg>

        {/* Floating background star top-right */}
        <div style={{ position: "absolute", top: "12%", right: "22%", color: "#FFA800" }} className="animate-pulse">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" />
          </svg>
        </div>

        {/* Floating background star middle-left */}
        <div style={{ position: "absolute", top: "45%", left: "15%", color: "#FFA800" }} className="animate-pulse">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" />
          </svg>
        </div>
      </div>

      {/* Responsive layout CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        .verify-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          max-width: 440px;
          position: relative;
          z-index: 10;
        }

        .back-btn-top {
          position: absolute;
          top: 2rem;
          left: 2rem;
          display: flex;
          align-items: center;
          gap: 0.35rem;
          color: var(--text-primary);
          font-weight: 700;
          font-size: 0.95rem;
          text-decoration: none;
          transition: all 0.2s ease;
          background: none;
          border: none;
          cursor: pointer;
          z-index: 50;
        }

        .back-btn-top:hover {
          color: #FFA800;
          transform: translateX(-3px);
        }

        .theme-btn-top {
          position: absolute;
          top: 2rem;
          right: 2rem;
          z-index: 50;
        }

        .change-mobile-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          width: 100%;
          background: var(--bg-card);
          border: 1px solid var(--border-default);
          border-radius: 0.8rem;
          color: var(--text-primary);
          font-weight: 700;
          font-size: 0.95rem;
          text-decoration: none;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .change-mobile-btn:hover {
          border-color: #FFA800;
          color: #FFA800;
          transform: translateY(-1px);
          box-shadow: 0 6px 15px rgba(255, 168, 0, 0.06);
        }

        .change-mobile-btn:active {
          transform: translateY(0);
        }

        @media (max-width: 768px) {
          .back-btn-top {
            position: relative;
            top: auto;
            left: auto;
            align-self: flex-start;
            margin-bottom: 1.5rem;
          }
          .theme-btn-top {
            position: relative;
            top: auto;
            right: auto;
            align-self: flex-end;
            margin-bottom: 1.5rem;
          }
          .header-row-mobile {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
            margin-bottom: 1.5rem;
            z-index: 50;
          }
          .lock-asset-wrapper {
            position: relative;
            right: auto;
            bottom: auto;
            align-self: center;
            margin-top: 2rem;
            transform: scale(0.9);
            opacity: 0.95;
          }
        }
      ` }} />

      {/* Top Controls: Back and Theme Toggler */}
      <div className="header-row-mobile" style={{ width: "100%", maxWidth: "440px" }}>
        <Link href="/login" className="back-btn-top">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>Back</span>
        </Link>

        <div className="theme-btn-top">
          {renderThemeButton()}
        </div>
      </div>

      {/* Main Content Box */}
      <div className="verify-container">
        {/* Brand Logo Header centered above the card */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            marginBottom: "2rem",
            zIndex: 10,
          }}
        >
          {/* Custom SVG Golden Cloud with star inside matching mockup */}
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              filter: "drop-shadow(0 3px 8px rgba(255, 122, 0, 0.2))"
            }}
          >
            <path
              d="M22.5 15.5C22.5 11.91 19.59 9 16 9C13.06 9 10.59 10.96 9.81 13.64C7.09 14.15 5 16.58 5 19.5C5 22.81 7.69 25.5 11 25.5H22.5C25.54 25.5 28 23.04 28 20C28 17.15 25.82 15.77 22.5 15.5Z"
              fill="url(#cloudGradVerify)"
            />
            <path
              d="M16 11.5L17.2 14.3L20 15.5L17.2 16.7L16 19.5L14.8 16.7L12 15.5L14.8 14.3L16 11.5Z"
              fill="#ffffff"
            />
            <defs>
              <linearGradient id="cloudGradVerify" x1="5" y1="9" x2="28" y2="25.5" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FFA800" />
                <stop stopColor="#FF7A00" />
              </linearGradient>
            </defs>
          </svg>

          <h1
            style={{
              fontSize: "1.45rem",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              display: "flex",
              alignItems: "center",
            }}
          >
            <span style={{ color: "var(--text-primary)" }}>Cloud</span>
            <span style={{ color: "#FFA800" }}>Bridge</span>
          </h1>
        </div>

        {/* Dynamic Suspended OTP Card */}
        <Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}>
          <OtpForm />
        </Suspense>

        {/* Divider "or" */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            margin: "1.75rem 0",
          }}
        >
          <div style={{ flexGrow: 1, height: "1px", backgroundColor: "var(--border-default)" }}></div>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              border: "1px solid var(--border-default)",
              background: "var(--bg-card)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.85rem",
              color: "var(--text-secondary)",
              fontWeight: 700,
              margin: "0 0.75rem",
              boxShadow: "0 2px 5px rgba(0, 0, 0, 0.01)"
            }}
          >
            or
          </div>
          <div style={{ flexGrow: 1, height: "1px", backgroundColor: "var(--border-default)" }}></div>
        </div>

        {/* Change Mobile Number Button */}
        <Link href="/login" className="change-mobile-btn">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Change Mobile Number
        </Link>
      </div>
    </div>
  );
}
