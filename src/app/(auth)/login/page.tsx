"use client";

import { useState, useEffect } from "react";
import { PhoneForm } from "@/components/auth/phone-form";
import { QrLoginForm } from "@/components/auth/qr-login-form";
import Image from "next/image";

export default function LoginPage() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"phone" | "qr">("qr");

  // Initialize theme on client-side mount
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
        padding: "1.5rem 1rem",
        boxSizing: "border-box",
        background: isDark
          ? "linear-gradient(135deg, #09090B 0%, #121215 100%)"
          : "linear-gradient(135deg, #FFFDF9 0%, #FFF8EA 100%)",
      }}
    >
      {/* Dynamic compact responsive CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        .unified-auth-card {
          width: 100%;
          max-width: 720px;
          background: var(--bg-card);
          border: 1px solid var(--border-default);
          border-radius: 1.5rem;
          padding: 2rem 2rem 1.75rem 2rem;
          box-shadow: var(--glass-shadow);
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          transition: background 0.3s ease, border-color 0.3s ease;
        }

        .login-grid {
          display: grid;
          grid-template-columns: 1.25fr 1fr;
          gap: 1.75rem;
          align-items: center;
          width: 100%;
        }

        .login-left {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .login-right {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .hero-title {
          font-size: 2.15rem;
          font-weight: 800;
          line-height: 1.2;
          color: var(--text-primary);
          letter-spacing: -0.04em;
          margin-bottom: 0.5rem;
        }

        .hero-desc {
          font-size: 0.8rem;
          line-height: 1.45;
          color: var(--text-secondary);
          max-width: 380px;
        }

        .features-list {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }

        .feature-item {
          display: flex;
          align-items: flex-start;
          gap: 0.65rem;
        }

        .feature-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 0.4rem;
          background-color: rgba(245, 158, 11, 0.08);
          flex-shrink: 0;
          color: #F59E0B;
        }

        .feature-title {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 0.05rem;
          letter-spacing: -0.02em;
        }

        .feature-desc {
          font-size: 0.72rem;
          color: var(--text-secondary);
          line-height: 1.3;
        }

        .floating-model-wrapper {
          width: 100%;
          max-width: 270px;
          display: flex;
          justify-content: center;
        }

        .form-centered-row {
          display: flex;
          justify-content: center;
          width: 100%;
          margin-top: 0.25rem;
        }

        @media (max-width: 768px) {
          .unified-auth-card {
            padding: 1.75rem 1.25rem;
          }
          .login-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
          .login-right {
            order: -1;
            margin-bottom: 0.25rem;
          }
          .hero-title {
            font-size: 1.85rem;
            text-align: center;
          }
          .hero-desc {
            font-size: 0.9rem;
            text-align: center;
            margin: 0 auto;
          }
          .features-list {
            align-items: center;
            max-width: 380px;
            margin: 0 auto;
          }
          .feature-item {
            width: 100%;
          }
          .login-left {
            align-items: center;
          }
        }
      ` }} />

      {/* Dynamic Theme selector button placed in a sleek, absolute minimalist position at top-right */}
      <div
        style={{
          position: "absolute",
          top: "1.5rem",
          right: "1.5rem",
          zIndex: 10,
        }}
      >
        {renderThemeButton()}
      </div>

      {/* Main Single Centered Form Box matching official Telegram login */}
      <div
        style={{
          width: "100%",
          maxWidth: "380px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1.5rem",
        }}
      >
        <div className="form-centered-row animate-fade-in" key={loginMethod} style={{ width: "100%" }}>
          {loginMethod === "phone" ? (
            <PhoneForm onToggleMethod={setLoginMethod} />
          ) : (
            <QrLoginForm onToggleMethod={setLoginMethod} />
          )}
        </div>
      </div>
    </div>
  );
}
