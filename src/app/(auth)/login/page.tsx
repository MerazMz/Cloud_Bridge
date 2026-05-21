"use client";

import { useState, useEffect } from "react";
import { PhoneForm } from "@/components/auth/phone-form";
import Image from "next/image";

export default function LoginPage() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

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
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
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
        transition: "background 0.3s ease",
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

      {/* Main Single Card enclosing everything */}
      <div className="unified-auth-card">
        {/* Top Header Bar inside the card */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
          }}
        >
          {/* Brand Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "0.5rem",
                background: "linear-gradient(135deg, #FFA800 0%, #FF7A00 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 3px 8px rgba(255, 122, 0, 0.15)",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ffffff"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <h1
              style={{
                fontSize: "1.25rem",
                fontWeight: 800,
                letterSpacing: "-0.04em",
                display: "flex",
                alignItems: "center",
              }}
            >
              <span style={{ color: "var(--text-primary)" }}>Cloud</span>
              <span style={{ color: "#FFA800" }}>Bridge</span>
            </h1>
          </div>

          {/* Dynamic Theme selector button */}
          {renderThemeButton()}
        </header>

        {/* Mid section: Info and 3D Graphic */}
        <div className="login-grid">
          {/* Left info column */}
          <div className="login-left">
            <div>
              <h2 className="hero-title">
                Welcome to <br />
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                  <span>Cloud</span>
                  <span style={{ color: "#FFA800" }}>Bridge</span>
                  <span>👋</span>
                </span>
              </h2>
              <p className="hero-desc">
                Your secure cloud storage on Telegram. <br />
                Fast, private and always with you.
              </p>
            </div>

            {/* Features Checklist */}
            <div className="features-list">
              {/* Feature 1 */}
              <div className="feature-item">
                <div className="feature-icon-wrapper">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <div>
                  <h4 className="feature-title">End-to-End Secure</h4>
                  <p className="feature-desc">Your files are encrypted and safe.</p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="feature-item">
                <div className="feature-icon-wrapper">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </div>
                <div>
                  <h4 className="feature-title">Blazing Fast</h4>
                  <p className="feature-desc">Upload, access and share instantly.</p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="feature-item">
                <div className="feature-icon-wrapper">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
                  </svg>
                </div>
                <div>
                  <h4 className="feature-title">Anywhere Access</h4>
                  <p className="feature-desc">Access your data from any device.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right 3D Column */}
          <div className="login-right">
            <div className="floating-model-wrapper animate-float">
              <Image
                src="/cloud_model.png"
                alt="CloudBridge 3D Secure Cloud Storage illustration"
                width={260}
                height={260}
                priority
                style={{
                  objectFit: "contain",
                  maxWidth: "100%",
                  height: "auto",
                }}
              />
            </div>
          </div>
        </div>

        {/* Bottom section: Phone Number Input form in centered card row */}
        <div className="form-centered-row">
          <PhoneForm />
        </div>

        {/* Footer inside the card at bottom */}
        <footer
          style={{
            width: "100%",
            textAlign: "center",
            padding: "1.25rem 0 0 0",
            color: "var(--text-muted)",
            fontSize: "0.8rem",
            fontWeight: 500,
            borderTop: "1px solid var(--border-default)",
            marginTop: "0.5rem",
          }}
        >
          <span>© 2025 CloudBridge. All rights reserved.</span>
        </footer>
      </div>
    </div>
  );
}
