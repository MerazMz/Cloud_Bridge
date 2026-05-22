"use client";

import Link from "next/link";
import { useState } from "react";
import { Safari } from "@/components/ui/safari";

export default function RootPage() {
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: isDarkMode ? "#09090b" : "#fafaf9",
        color: isDarkMode ? "#f4f4f5" : "#0f172a",
        fontFamily: "var(--font-outfit), system-ui, -apple-system, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        position: "relative",
        overflowX: "hidden",
        transition: "background-color 0.4s cubic-bezier(0.4, 0, 0.2, 1), color 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Dynamic ambient yellow grid highlights */}
      <div
        style={{
          position: "absolute",
          top: "-15%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "1200px",
          height: "600px",
          background: isDarkMode
            ? "radial-gradient(circle, rgba(253, 224, 71, 0.22) 0%, rgba(234, 179, 8, 0.08) 50%, transparent 100%)"
            : "radial-gradient(circle, rgba(253, 224, 71, 0.16) 0%, rgba(254, 240, 138, 0.05) 50%, transparent 100%)",
          filter: "blur(80px)",
          pointerEvents: "none",
          zIndex: 0,
          transition: "background 0.4s ease",
        }}
      />

      {/* Modern Floating Header Navbar */}
      <nav
        style={{
          width: "90%",
          maxWidth: "1100px",
          margin: "1.5rem auto",
          padding: "0.65rem 1.6rem",
          background: isDarkMode ? "rgba(24, 24, 27, 0.82)" : "rgba(255, 255, 255, 0.82)",
          backdropFilter: "blur(20px)",
          border: isDarkMode ? "1px solid rgba(253, 224, 71, 0.12)" : "1px solid rgba(234, 179, 8, 0.16)",
          borderRadius: "9999px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: isDarkMode 
            ? "0 10px 30px rgba(0, 0, 0, 0.3)" 
            : "0 10px 30px rgba(234, 179, 8, 0.03), 0 1px 3px rgba(0, 0, 0, 0.01)",
          zIndex: 10,
          position: "relative",
          transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            fontSize: "1.35rem",
            fontWeight: 900,
            letterSpacing: "-0.03em",
            textDecoration: "none",
            color: isDarkMode ? "#f4f4f5" : "#0f172a",
            display: "flex",
            alignItems: "center",
            gap: "0.2rem",
          }}
        >
          <span>Cloud</span>
          <span style={{ color: "#d97706" }}>Bridge</span>
        </Link>

        {/* Links */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: "2.2rem",
          }}
        >
          {["Features", "Storage", "About"].map((link) => (
            <Link
              key={link}
              href="#features"
              onMouseEnter={() => setHoveredLink(link)}
              onMouseLeave={() => setHoveredLink(null)}
              style={{
                fontSize: "0.85rem",
                fontWeight: 700,
                color: hoveredLink === link ? "#d97706" : (isDarkMode ? "#a1a1aa" : "#475569"),
                textDecoration: "none",
                transition: "color 0.2s ease",
              }}
            >
              {link}
            </Link>
          ))}
        </div>

        {/* Right Nav Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {/* Theme Toggle Button */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "transparent",
              color: isDarkMode ? "#facc15" : "#64748b",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDarkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)";
              e.currentTarget.style.color = "#d97706";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = isDarkMode ? "#facc15" : "#64748b";
            }}
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? (
              // Sun Icon
              <svg style={{ width: "1.15rem", height: "1.15rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            ) : (
              // Moon Icon
              <svg style={{ width: "1.1rem", height: "1.1rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )}
          </button>

          {/* Login Pill Button */}
          <Link
            href="/login"
            style={{
              background: "#facc15",
              color: "#1e293b",
              fontSize: "0.85rem",
              fontWeight: 800,
              padding: "0.6rem 1.5rem",
              borderRadius: "9999px",
              textDecoration: "none",
              boxShadow: "0 4px 15px rgba(234, 179, 8, 0.2)",
              transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
              border: "1px solid rgba(234, 179, 8, 0.3)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.03)";
              e.currentTarget.style.background = "#eab308";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.background = "#facc15";
            }}
          >
            Go to Dashboard
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main
        style={{
          width: "100%",
          maxWidth: "900px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          padding: "3.5rem 1.5rem 1rem 1.5rem",
          zIndex: 5,
        }}
      >
        {/* Pill Tagline */}
        <div
          style={{
            background: isDarkMode ? "rgba(254, 240, 138, 0.12)" : "rgba(254, 240, 138, 0.45)",
            border: isDarkMode ? "1px solid rgba(253, 224, 71, 0.2)" : "1px solid rgba(234, 179, 8, 0.35)",
            padding: "0.45rem 1.1rem",
            borderRadius: "9999px",
            color: isDarkMode ? "#fef08a" : "#854d0e",
            fontSize: "0.78rem",
            fontWeight: 800,
            display: "inline-flex",
            alignItems: "center",
            gap: "0.45rem",
            boxShadow: "0 2px 8px rgba(234, 179, 8, 0.05)",
            marginBottom: "2rem",
            letterSpacing: "0.02em",
            transition: "all 0.4s ease",
          }}
        >
          <span>Supported by</span>
          <span
            style={{
              background: "#000001ff",
              color: "#ffffff",
              padding: "0.1rem 0.45rem",
              borderRadius: "4px",
              fontSize: "0.68rem",
              fontWeight: 900,
              letterSpacing: "0.05em",
            }}
          >
            NO ONE :)
          </span>
        </div>

        {/* Hero Title */}
        <h1
          style={{
            fontSize: "3.8rem",
            lineHeight: "1.08",
            fontWeight: 900,
            color: isDarkMode ? "#f4f4f5" : "#0f172a",
            letterSpacing: "-0.04em",
            margin: "0 0 1.5rem 0",
            maxWidth: "800px",
            transition: "color 0.4s ease",
          }}
        >
          Get Unlimited Storage at <span style={{ color: "#d97706" }}>India's Top Bridge</span>
        </h1>

        {/* Hero Subtitle */}
        <p
          style={{
            fontSize: "1.1rem",
            lineHeight: "1.65",
            color: isDarkMode ? "#a1a1aa" : "#475569",
            fontWeight: 500,
            margin: "0 0 2.5rem 0",
            maxWidth: "640px",
            transition: "color 0.4s ease",
          }}
        >
          Upload and organize your files via Founder's Office, Tech, and Media folders. 
          Bridge directly with secure private Telegram channels. Get robust startup cloud exposure.
        </p>

        {/* Hero CTA Button container */}
        <div style={{ display: "flex", gap: "1.2rem", flexWrap: "wrap", justifyContent: "center" }}>
          {/* Action Yellow Pill */}
          <Link
            href="/login"
            style={{
              background: "linear-gradient(135deg, #facc15, #eab308)",
              color: "#0f172a",
              fontSize: "1.02rem",
              fontWeight: 800,
              padding: "0.9rem 2.4rem",
              borderRadius: "9999px",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.55rem",
              boxShadow: "0 10px 25px rgba(234, 179, 8, 0.35)",
              transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
              border: "1px solid rgba(234, 179, 8, 0.4)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 14px 30px rgba(234, 179, 8, 0.45)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 10px 25px rgba(234, 179, 8, 0.35)";
            }}
          >
            <span>Explore Dashboard</span>
            <svg style={{ width: "1.1rem", height: "1.1rem", strokeWidth: 3 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>

          {/* See how it works secondary button */}
          <button
            onClick={() => {
              const el = document.getElementById("mockup-section");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            style={{
              background: isDarkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.8)",
              color: isDarkMode ? "#f3f4f6" : "#475569",
              fontSize: "1.02rem",
              fontWeight: 800,
              padding: "0.9rem 2.4rem",
              borderRadius: "9999px",
              border: isDarkMode ? "1px solid rgba(253, 224, 71, 0.2)" : "1px solid rgba(0, 0, 0, 0.08)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.55rem",
              boxShadow: "0 4px 15px rgba(0,0,0,0.02)",
              transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.borderColor = "#eab308";
              e.currentTarget.style.color = "#d97706";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.borderColor = isDarkMode ? "rgba(253, 224, 71, 0.2)" : "rgba(0, 0, 0, 0.08)";
              e.currentTarget.style.color = isDarkMode ? "#f3f4f6" : "#475569";
            }}
          >
            <svg style={{ width: "1.1rem", height: "1.1rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>See how it works</span>
          </button>
        </div>
      </main>

      {/* Perspective Dashboard Mockup Screen (Visual representation of the image structure) */}
      <section
        id="mockup-section"
        style={{
          width: "90%",
          maxWidth: "1000px",
          marginTop: "10rem",
          marginBottom: "6rem",
          zIndex: 5,
          position: "relative",
        }}
      >
        {/* Glow ambient highlight behind mockup */}
        <div
          style={{
            position: "absolute",
            bottom: "-30px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "80%",
            height: "100px",
            background: isDarkMode ? "rgba(253, 224, 71, 0.25)" : "rgba(254, 240, 138, 0.25)",
            filter: "blur(40px)",
            borderRadius: "100px",
            zIndex: -1,
            transition: "background 0.4s ease",
          }}
        />

        {/* High-Fidelity Safari Mockup Preview */}
        <Safari
          url="cloudbridge.in/dashboard"
          imageSrc="/telegram.png"
          width={1203}
          height={753}
          style={{
            width: "100%",
            height: "auto",
            borderRadius: "16px",
            boxShadow: isDarkMode 
              ? "0 0 65px rgba(253, 224, 71, 0.55), 0 20px 50px rgba(0, 0, 0, 0.7)" 
              : "0 0 65px rgba(253, 224, 71, 0.65), 0 20px 50px rgba(234, 179, 8, 0.12), 0 4px 12px rgba(0, 0, 0, 0.01)",
            transition: "all 0.4s ease",
          }}
        />
      </section>
    </div>
  );
}
