"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Safari } from "@/components/ui/safari";
import Iphone15Pro from "@/components/ui/iphone";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import Marquee from "react-fast-marquee";
import { CountingNumber } from "@/components/animate-ui/primitives/texts/counting-number";

export default function RootPage() {
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Initialize and synchronize theme and auth state
  useEffect(() => {
    setMounted(true);

    const updateTheme = () => {
      const isDark = document.documentElement.classList.contains("dark");
      setIsDarkMode(isDark);
    };

    // Run initial sync
    updateTheme();

    // Check if user is logged in
    fetch("/api/auth/me")
      .then((res) => {
        if (res.ok) {
          setIsLoggedIn(true);
        } else {
          setIsLoggedIn(false);
        }
      })
      .catch(() => {
        setIsLoggedIn(false);
      });

    // Set up observer to sync when AnimatedThemeToggler modifies documentElement classes
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

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
          {!mounted ? (
            <div style={{ width: "34px", height: "34px", borderRadius: "0.6rem", background: "rgba(0, 0, 0, 0.02)" }} />
          ) : (
            <AnimatedThemeToggler
              variant="circle"
              duration={550}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "34px",
                height: "34px",
                border: isDarkMode ? "1px solid rgba(253, 224, 71, 0.2)" : "1px solid rgba(234, 179, 8, 0.2)",
                borderRadius: "0.6rem",
                background: isDarkMode ? "rgba(24, 24, 27, 0.9)" : "rgba(255, 255, 255, 0.9)",
                color: isDarkMode ? "#FBBF24" : "#000000ff",
                cursor: "pointer",
                outline: "none",
                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.02)",
                transition: "all 0.2s ease",
              }}
              className="theme-toggle-btn"
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.03)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            />
          )}

          {/* Login Pill Button */}
          <Link
            href={isLoggedIn ? "/dashboard" : "/login"}
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
            {isLoggedIn ? "Dashboard" : "Login"}
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main
        style={{
          width: "100%",
          maxWidth: "900px",
          // marginTop: "rem",
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
          Get Unlimited Storage at <span style={{ color: "#d97706" }}>CloudBridge</span>
        </h1>

        {/* Hero Subtitle */}
        <p
          style={{
            fontSize: "1rem",
            lineHeight: "1.65",
            color: isDarkMode ? "#a1a1aa" : "#47556979",
            fontWeight: 500,
            margin: "0 0 2.5rem 0",
            maxWidth: "640px",
            transition: "color 0.4s ease",
          }}
        >
          Upload and organize your files using your own Telegram Account.
          Bridge directly with secure private Telegram channels. Get robust startup cloud exposure.
        </p>

        {/* Hero CTA Button container */}
        <div style={{ display: "flex", gap: "1.2rem", flexWrap: "wrap", justifyContent: "center" }}>
          {/* Action Yellow Pill */}
          <Link
            href={isLoggedIn ? "/dashboard" : "/login"}
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
              if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
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
      
      {/* Brand & Integrations Monochromatic Marquee */}
      <section
        style={{
          width: "60%",
          padding: "3rem 0",
          background: isDarkMode ? "rgba(9, 9, 11, 0.4)" : "rgba(250, 250, 249, 0.4)",
          // borderTop: isDarkMode ? "1px solid rgba(255, 255, 255, 0.05)" : "1px solid rgba(0, 0, 0, 0.05)",
          // borderBottom: isDarkMode ? "1px solid rgba(255, 255, 255, 0.05)" : "1px solid rgba(0, 0, 0, 0.05)",
          backdropFilter: "blur(8px)",
          overflow: "hidden",
          marginTop: "5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
          transition: "all 0.4s ease",
          marginBottom: "-2rem",
        }}
      >
        <div style={{ width: "100%", opacity: 0.65 }}>
          <Marquee
            speed={40}
            gradient={true}
            gradientWidth={120}
            gradientColor={isDarkMode ? "#09090b" : "#fafaf9"}
            pauseOnHover={false}
          >
            {/* Unity */}
            <div style={{ margin: "0 3.5rem", color: isDarkMode ? "#a1a1aa" : "#475569", display: "flex", alignItems: "center" }}>
              <svg viewBox="0 0 120 32" height="26" fill="currentColor">
                <path d="M12 4L16 8L8 12L4 8L12 4Z" />
                <path d="M20 12L24 16L16 20L12 16L20 12Z" />
                <path d="M8 20L12 24L4 28L0 24L8 20Z" />
                <text x="32" y="22" fontFamily="var(--font-sans), sans-serif" fontWeight="bold" fontSize="16" letterSpacing="-0.03em">Unity</text>
              </svg>
            </div>

            {/* Fiverr */}
            <div style={{ margin: "0 3.5rem", color: isDarkMode ? "#a1a1aa" : "#475569", display: "flex", alignItems: "center" }}>
              <svg viewBox="0 0 90 32" height="26" fill="currentColor">
                <text x="0" y="22" fontFamily="var(--font-sans), sans-serif" fontWeight="900" fontSize="20" letterSpacing="-0.05em">fiverr<tspan fill="#d97706">.</tspan></text>
              </svg>
            </div>

            {/* British Airways */}
            <div style={{ margin: "0 3.5rem", color: isDarkMode ? "#a1a1aa" : "#475569", display: "flex", alignItems: "center" }}>
              <svg viewBox="0 0 200 32" height="26" fill="currentColor">
                <path d="M5 8 C 30 5, 75 11, 95 7 C 80 10, 40 9, 5 8 Z M95 7 C 115 3, 155 1, 175 -1 C 155 4, 115 6, 95 7 Z" />
                <text x="0" y="24" fontFamily="'Times New Roman', serif" fontWeight="bold" fontSize="12" letterSpacing="0.12em">BRITISH AIRWAYS</text>
              </svg>
            </div>

            {/* Intel */}
            <div style={{ margin: "0 3.5rem", color: isDarkMode ? "#a1a1aa" : "#475569", display: "flex", alignItems: "center" }}>
              <svg viewBox="0 0 70 32" height="26" fill="currentColor">
                <text x="0" y="22" fontFamily="var(--font-sans), sans-serif" fontWeight="800" fontSize="21" letterSpacing="-0.06em">intel.</text>
              </svg>
            </div>

            {/* Waze */}
            <div style={{ margin: "0 3.5rem", color: isDarkMode ? "#a1a1aa" : "#475569", display: "flex", alignItems: "center" }}>
              <svg viewBox="0 0 95 32" height="26" fill="currentColor">
                <circle cx="12" cy="15" r="8" stroke="currentColor" strokeWidth="2.5" fill="none" />
                <circle cx="9" cy="13" r="1.2" />
                <circle cx="15" cy="13" r="1.2" />
                <path d="M9 17 Q 12 20, 15 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
                <circle cx="8" cy="23" r="2.5" />
                <circle cx="16" cy="23" r="2.5" />
                <text x="28" y="21" fontFamily="var(--font-sans), sans-serif" fontWeight="bold" fontSize="17" letterSpacing="-0.03em">waze</text>
              </svg>
            </div>

            {/* Telegram */}
            <div style={{ margin: "0 3.5rem", color: isDarkMode ? "#a1a1aa" : "#475569", display: "flex", alignItems: "center" }}>
              <svg viewBox="0 0 110 32" height="26" fill="currentColor">
                <path d="M12 4 L2 9 L8 13 L18 6 L11 15 L17 19 Z" />
                <text x="26" y="22" fontFamily="var(--font-sans), sans-serif" fontWeight="bold" fontSize="15" letterSpacing="-0.02em">Telegram</text>
              </svg>
            </div>

            {/* Next.js */}
            <div style={{ margin: "0 3.5rem", color: isDarkMode ? "#a1a1aa" : "#475569", display: "flex", alignItems: "center" }}>
              <svg viewBox="0 0 85 32" height="26" fill="currentColor">
                <text x="0" y="22" fontFamily="var(--font-sans), sans-serif" fontWeight="900" fontSize="18" letterSpacing="-0.06em">Next.js</text>
              </svg>
            </div>

            {/* Prisma */}
            <div style={{ margin: "0 3.5rem", color: isDarkMode ? "#a1a1aa" : "#475569", display: "flex", alignItems: "center" }}>
              <svg viewBox="0 0 95 32" height="26" fill="currentColor">
                <path d="M2 16 L12 4 L22 16 L12 28 Z" fill="none" stroke="currentColor" strokeWidth="2.5" />
                <text x="30" y="22" fontFamily="var(--font-sans), sans-serif" fontWeight="800" fontSize="15" letterSpacing="-0.03em">prisma</text>
              </svg>
            </div>
          </Marquee>
        </div>
      </section>

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
            bottom: "-60px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "90%",
            height: "180px",
            background: isDarkMode ? "rgba(253, 224, 71, 0.35)" : "rgba(254, 240, 138, 0.35)",
            filter: "blur(60px)",
            borderRadius: "100px",
            zIndex: -1,
            transition: "background 0.4s ease",
          }}
        />

        {/* High-Fidelity Safari Mockup Preview */}
        <Safari
          url="www.cloudbridge.in"
          imageSrc="/telegram.png"
          width={1203}
          height={753}
          className="dark"
          style={{
            width: "100%",
            height: "auto",
            borderRadius: "16px",
            boxShadow: isDarkMode
              ? "0 0 50px rgba(253, 223, 71, 0.28), 0 20px 50px rgba(0, 0, 0, 0.9)"
              : "0 0 0px rgba(0, 0, 0, 0.02), 0 8px 30px rgba(0, 0, 0, 0.06), 0 30px 60px rgba(0, 0, 0, 0.08)",
            transition: "all 0.4s ease",
          }}
        />
      </section>

      {/* High-Fidelity Mobile Showcase Section */}
      <section
        id="mobile-section"
        style={{
          width: "100%",
          maxWidth: "1200px",
          margin: "8rem auto 10rem auto",
          padding: "0 2rem",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "4rem",
          zIndex: 5,
          position: "relative",
          flexWrap: "wrap",
        }}
      >
        {/* Left Column: Context, Features & Action buttons */}
        <div
          style={{
            flex: "1 1 450px",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            textAlign: "left",
            gap: "1.5rem",
          }}
        >
          <h2
            style={{
              fontSize: "3rem",
              fontWeight: "800",
              lineHeight: "1.15",
              color: isDarkMode ? "#ffffff" : "#0f172a",
              letterSpacing: "-0.03em",
            }}
          >
            CloudBridge in Your Pocket
          </h2>
          <p
            style={{
              fontSize: "1.15rem",
              lineHeight: "1.6",
              color: isDarkMode ? "#a1a1aa" : "#475569",
              maxWidth: "500px",
              margin: 0,
            }}
          >
            Manage your folders, monitor active background upload workers, and stream your high-fidelity files directly to any device—all fully optimized for your phone.
          </p>

          {/* Badge & Action Buttons */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              flexWrap: "wrap",
              marginTop: "1rem",
            }}
          >
            {/* App Store Button */}
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.6rem",
                backgroundColor: isDarkMode ? "rgba(255, 255, 255, 0.05)" : "#0f172a",
                border: isDarkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "none",
                borderRadius: "12px",
                padding: "0.6rem 1.1rem",
                color: "#ffffff",
                textDecoration: "none",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.backgroundColor = isDarkMode ? "rgba(255, 255, 255, 0.1)" : "#1e293b";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.backgroundColor = isDarkMode ? "rgba(255, 255, 255, 0.05)" : "#0f172a";
              }}
            >
              <svg style={{ width: "1.4rem", height: "1.4rem" }} fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.2.67-2.92 1.49-.62.71-1.16 1.85-1.01 2.96 1.11.09 2.27-.58 2.94-1.39z" />
              </svg>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: "1.1" }}>
                <span style={{ fontSize: "0.65rem", textTransform: "uppercase", opacity: 0.6, letterSpacing: "0.05em" }}>Not Available on the</span>
                <span style={{ fontSize: "0.95rem", fontWeight: "600" }}>App Store</span>
              </div>
            </a>

            {/* Google Play Button */}
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.6rem",
                backgroundColor: isDarkMode ? "rgba(255, 255, 255, 0.05)" : "#0f172a",
                border: isDarkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "none",
                borderRadius: "12px",
                padding: "0.6rem 1.1rem",
                color: "#ffffff",
                textDecoration: "none",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.backgroundColor = isDarkMode ? "rgba(255, 255, 255, 0.1)" : "#1e293b";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.backgroundColor = isDarkMode ? "rgba(255, 255, 255, 0.05)" : "#0f172a";
              }}
            >
              <svg style={{ width: "1.4rem", height: "1.4rem" }} fill="currentColor" viewBox="0 0 24 24">
                <path d="M5.25 3.062c-.172.176-.25.46-.25.828v16.22c0 .367.078.652.25.828l.062.062 9.176-9.175V11.75l-9.176-9.176-.062.088zm10.15 8.328l2.916-2.916c.324-.184.535-.53.535-.924s-.21-.74-.535-.924l-2.915-2.916-.076.076 2.378 2.378H12.75v2.774h2.576l-2.376 2.376.075.076zM11.75 3.03l-7.39 7.39 7.39 7.39V3.031z" />
              </svg>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: "1.1" }}>
                <span style={{ fontSize: "0.65rem", textTransform: "uppercase", opacity: 0.6, letterSpacing: "0.05em" }}>Not Available on the</span>
                <span style={{ fontSize: "0.95rem", fontWeight: "600" }}>Google Play</span>
              </div>
            </a>

            {/* Pill Browse Storage Button */}
            {/* <Link
              href="/dashboard"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.55rem",
                backgroundColor: "#fde047",
                color: "#000000",
                padding: "0.75rem 1.35rem",
                borderRadius: "9999px",
                fontWeight: "600",
                fontSize: "0.95rem",
                textDecoration: "none",
                boxShadow: "0 4px 14px rgba(253, 224, 71, 0.4)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.03) translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(253, 224, 71, 0.6)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1) translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 14px rgba(253, 224, 71, 0.4)";
              }}
            >
              <svg style={{ width: "1.15rem", height: "1.15rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Launch Dashboard</span>
            </Link> */}
          </div>
        </div>

        {/* Right Column: High-Fidelity 3-iPhone Mockup Showcase */}
        <div
          style={{
            flex: "1 1 500px",
            height: "600px",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto",
            width: "100%",
            maxWidth: "600px",
          }}
        >
          {/* Left iPhone - Back-left screen */}
          <div
            style={{
              position: "absolute",
              left: "57%",
              top: "50%",
              zIndex: 1,
              transform: "translate(-100%, -48%) scale(0.5)",
              transformOrigin: "center center",
              opacity: 0.85,
              transition: "transform 0.4s ease, opacity 0.4s ease",
            }}
          >
            <Iphone15Pro
              width={433}
              height={882}
              src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&h=1600&fit=crop"
              // mode={isDarkMode ? "dark" : "light"}
              mode={"dark"}
            />
          </div>

          {/* Right iPhone - Back-right screen */}
          <div
            style={{
              position: "absolute",
              // left: "50%",
              right: "-20%",
              top: "50%",
              zIndex: 1,
              transform: "translate(0%, -48%) scale(0.5)",
              transformOrigin: "center center",
              opacity: 0.85,
              transition: "transform 0.4s ease, opacity 0.4s ease",
            }}
          >
            <Iphone15Pro
              width={433}
              height={882}
              src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&h=1600&fit=crop"
              // mode={isDarkMode ? "dark" : "light"}
              mode={"dark"}
            />
          </div>

          {/* Center iPhone - Foreground center screen */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              zIndex: 2,
              transform: "translate(-50%, -50%) scale(0.58)",
              transformOrigin: "center center",
              filter: isDarkMode ? "drop-shadow(0 25px 50px rgba(0,0,0,0.9))" : "drop-shadow(0 25px 40px rgba(0,0,0,0.2))",
              transition: "transform 0.4s ease",
            }}
          >
            <Iphone15Pro
              width={433}
              height={882}
              src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&h=1600&fit=crop"
              // mode={isDarkMode ? "dark" : "light"}
              mode={"dark"}
            />
          </div>
        </div>
      </section>

      {/* Statistics Section: CloudBridge in Numbers */}
      <section
        id="numbers"
        style={{
          width: "100%",
          padding: "6rem 2rem",
          background: isDarkMode ? "#09090b" : "#fafaf9",
          borderTop: isDarkMode ? "1px solid rgba(255, 255, 255, 0.05)" : "1px solid rgba(0, 0, 0, 0.05)",
          borderBottom: isDarkMode ? "1px solid rgba(255, 255, 255, 0.05)" : "1px solid rgba(0, 0, 0, 0.05)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          transition: "all 0.4s ease",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Dynamic Ambient Yellow Glow */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "60%",
            height: "75%",
            background: isDarkMode
              ? "radial-gradient(circle, rgba(250, 204, 21, 0.12) 0%, rgba(250, 204, 21, 0.04) 40%, rgba(250, 204, 21, 0) 70%)"
              : "radial-gradient(circle, rgba(253, 224, 71, 0.38) 0%, rgba(253, 224, 71, 0.12) 40%, rgba(253, 224, 71, 0) 70%)",
            filter: "blur(60px)",
            pointerEvents: "none",
            zIndex: 0,
            opacity: 0.85,
            transition: "all 0.5s ease",
          }}
          className="animate-pulse"
        />

        <h2 
          style={{ 
            fontSize: "2.5rem", 
            fontWeight: 800, 
            marginBottom: "0.75rem", 
            letterSpacing: "-0.03em",
            color: isDarkMode ? "#ffffff" : "#0f172a",
            position: "relative",
            zIndex: 1
          }}
        >
          Cloud <span style={{ color: "#facc15" }}>Bridge</span> in Numbers
        </h2>
        <p 
          style={{ 
            fontSize: "1.05rem", 
            color: isDarkMode ? "#a1a1aa" : "#475569", 
            maxWidth: "600px", 
            margin: "0 auto 4.5rem auto", 
            fontWeight: 500,
            lineHeight: "1.5",
            position: "relative",
            zIndex: 1
          }}
        >
          Building a trusted decentralized sync ecosystem for developers and teams.
        </p>

        <div 
          style={{ 
            display: "flex", 
            flexWrap: "wrap", 
            justifyContent: "center", 
            gap: "4rem", 
            maxWidth: "1100px", 
            width: "100%",
            position: "relative",
            zIndex: 1
          }}
        >
          {/* Dynamic ambient yellow grid highlights */}
      <div
        style={{
          position: "absolute",
          // top: "-15%",
          // left: "50%",
          transform: "translateX(-50%)",
          width: "200px",
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
          {/* Stat 1 */}
          <div style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ fontSize: "3.5rem", fontWeight: 800, color: "#facc15", letterSpacing: "-0.02em", lineHeight: "1" }}>
              <CountingNumber number={3} inView={true} fromNumber={100}  />+
            </div>
            <div style={{ fontSize: "1.05rem", fontWeight: 700, color: isDarkMode ? "#f4f4f5" : "#0f172a", marginTop: "0.25rem" }}>Connected Accounts</div>
            {/* <div style={{ fontSize: "0.8rem", color: isDarkMode ? "#71717a" : "#64748b", fontWeight: 500 }}>Drive, Telegram & more</div> */}
          </div>
          
          {/* Stat 2 */}
          <div style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ fontSize: "3.5rem", fontWeight: 800, color: "#facc15", letterSpacing: "-0.02em", lineHeight: "1" }}>
              <CountingNumber number={25} inView={true} />+
            </div>
            <div style={{ fontSize: "1.05rem", fontWeight: 700, color: isDarkMode ? "#f4f4f5" : "#0f172a", marginTop: "0.25rem" }}>Active Syncs</div>
            {/* <div style={{ fontSize: "0.8rem", color: isDarkMode ? "#71717a" : "#64748b", fontWeight: 500 }}>Synchronized daily</div> */}
          </div>


          {/* Stat 3 */}
          <div style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ fontSize: "3.5rem", fontWeight: 800, color: "#facc15", letterSpacing: "-0.02em", lineHeight: "1" }}>
              <CountingNumber number={100} inView={true} /> GB
            </div>
            <div style={{ fontSize: "1.05rem", fontWeight: 700, color: isDarkMode ? "#f4f4f5" : "#0f172a", marginTop: "0.25rem" }}>Overall Bandwidth</div>
            {/* <div style={{ fontSize: "0.8rem", color: isDarkMode ? "#71717a" : "#64748b", fontWeight: 500 }}>High-fidelity transfer</div> */}
          </div>

          {/* Stat 4 */}
          <div style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ fontSize: "3.5rem", fontWeight: 800, color: "#facc15", letterSpacing: "-0.02em", lineHeight: "1" }}>
              <CountingNumber number={50} decimalPlaces={0} inView={true} />%
            </div>
            <div style={{ fontSize: "1.05rem", fontWeight: 700, color: isDarkMode ? "#f4f4f5" : "#0f172a", marginTop: "0.25rem" }}>System Uptime</div>
            {/* <div style={{ fontSize: "0.8rem", color: isDarkMode ? "#71717a" : "#64748b", fontWeight: 500 }}>Zero-packet-loss SLA</div> */}
          </div>
        </div>
      </section>
    </div>
  );
}
