"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Safari } from "@/components/ui/safari";
import Iphone15Pro from "@/components/ui/iphone";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import Marquee from "react-fast-marquee";
import { CountingNumber } from "@/components/animate-ui/primitives/texts/counting-number";
import { Meteors } from "@/components/ui/meteors"

const faqs = [
  {
    question: "What is CloudBridge?",
    answer: "CloudBridge is a high-performance decentralized cloud bridge that lets you secure, upload, and organize your files using your own Telegram Account. Enjoy completely free, unlimited file storage at scale."
  },
  {
    question: "Is CloudBridge free to use?",
    answer: "Yes! CloudBridge leverages Telegram's MTProto cloud network which provides uncapped free storage for files up to 2GB each. We do not charge any storage or hosting fees."
  },
  {
    question: "How do I upload and manage my files?",
    answer: "You can upload and organize your files via custom folders (Founder's Office, Tech, Media, etc.) directly in the CloudBridge dashboard. All files are automatically bridged to your private Telegram storage channel."
  },
  {
    question: "How secure is my data?",
    answer: "All uploads are routed through secure, private channels on your own Telegram account. Your data remains fully under your own control, and we never have access to your private files."
  }
];

const fileIcons = [
  { name: "PDF", src: "/icons/PDF.png" },
  { name: "PNG", src: "/icons/PNG.png" },
  { name: "DOC", src: "/icons/DOC.png" },
  { name: "JPG", src: "/icons/JPG.png" },
  { name: "ZIP", src: "/icons/ZIP.png" },
  { name: "XLS", src: "/icons/XLS.png" },
  { name: "PPTX", src: "/icons/PPTX.png" },
  { name: "TXT", src: "/icons/TXT.png" },
  { name: "MP3", src: "/audio.png" },
  { name: "MP4", src: "/icons/MP4.png" },
  { name: "RAR", src: "/icons/RAR.png" },
  { name: "GIF", src: "/icons/GIF.png" },
  { name: "EXE", src: "/icons/EXE.png" },
];

export default function RootPage() {
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(null);

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

      {/* Left Custom SVG Grid Pattern */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "40vw",
          maxWidth: "600px",
          height: "1000px",
          opacity: isDarkMode ? 0.35 : 0.22,
          pointerEvents: "none",
          zIndex: 0,
          transition: "opacity 0.4s ease",
        }}
      >
        <svg width="100%" height="100%" viewBox="0 0 800 1000" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dot-grid-left" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="currentColor" />
            </pattern>
            <linearGradient id="line-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.8} />
              <stop offset="50%" stopColor="#d97706" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#d97706" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="line-grad-2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity={0} />
              <stop offset="50%" stopColor="#facc15" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#d97706" stopOpacity={0.8} />
            </linearGradient>
            <radialGradient id="mask-grad-left" cx="0%" cy="30%" r="80%">
              <stop offset="0%" stopColor="black" stopOpacity={1} />
              <stop offset="50%" stopColor="black" stopOpacity={0.5} />
              <stop offset="100%" stopColor="black" stopOpacity={0} />
            </radialGradient>
            <mask id="pattern-mask-left">
              <rect width="800" height="1000" fill="url(#mask-grad-left)" />
            </mask>
          </defs>

          <rect
            width="800"
            height="1000"
            fill="url(#dot-grid-left)"
            mask="url(#pattern-mask-left)"
            style={{ color: isDarkMode ? "rgba(251, 191, 36, 0.2)" : "rgba(217, 119, 6, 0.15)" }}
          />

          <g mask="url(#pattern-mask-left)">
            <path d="M-50,150 L200,150 L350,300 L500,300 L600,400" stroke="url(#line-grad-1)" strokeWidth={1.5} strokeDasharray="4,4" />
            <path d="M100,50 L250,200 L250,450 L400,600 L550,600" stroke="url(#line-grad-2)" strokeWidth={2} />
            <path d="M-20,400 L150,400 L250,500 L150,600 L300,750" stroke="url(#line-grad-1)" strokeWidth={1.5} />
            <path d="M300,200 L450,200 L550,100" stroke="url(#line-grad-2)" strokeWidth={1} />

            {/* Glowing nodes with pulsing glow rings */}
            <circle cx="200" cy="150" r="4" fill="#fbbf24" />
            <circle cx="200" cy="150" r="10" stroke="#fbbf24" strokeWidth={1.5} opacity={0.5}>
              <animate attributeName="r" values="4;14;4" dur="3s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0;0.8" dur="3s" repeatCount="indefinite" />
            </circle>

            <circle cx="350" cy="300" r="5" fill="#d97706" />
            <circle cx="350" cy="300" r="12" stroke="#d97706" strokeWidth={1} opacity={0.4}>
              <animate attributeName="r" values="5;18;5" dur="4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.6;0;0.6" dur="4s" repeatCount="indefinite" />
            </circle>

            <circle cx="250" cy="450" r="4" fill="#fbbf24" />
            <circle cx="250" cy="450" r="10" stroke="#fbbf24" strokeWidth={1.5} opacity={0.5}>
              <animate attributeName="r" values="4;12;4" dur="2.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0;0.8" dur="2.5s" repeatCount="indefinite" />
            </circle>

            <circle cx="400" cy="600" r="6" fill="#fbbf24" />
            <circle cx="400" cy="600" r="16" stroke="#fbbf24" strokeWidth={1.5} opacity={0.6}>
              <animate attributeName="r" values="6;20;6" dur="3.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0;0.8" dur="3.5s" repeatCount="indefinite" />
            </circle>

            {/* Rotated decorative squares at major intersections */}
            <rect x="195" y="145" width="10" height="10" rx="2" fill="none" stroke="#fbbf24" strokeWidth={1} opacity={0.3} transform="rotate(45, 200, 150)" />
            <rect x="345" y="295" width="10" height="10" rx="2" fill="none" stroke="#d97706" strokeWidth={1} opacity={0.3} transform="rotate(45, 350, 300)" />

            {/* Spinning decorative hexagons (data blocks) */}
            <path d="M 445 191.34 L 455 196.34 L 455 208.66 L 445 213.66 L 435 208.66 L 435 196.34 Z" fill="none" stroke="#fbbf24" strokeWidth={1.5} opacity={0.6}>
              <animateTransform attributeName="transform" type="rotate" from="0 445 202.5" to="360 445 202.5" dur="10s" repeatCount="indefinite" />
            </path>
            <path d="M 145 391.34 L 155 396.34 L 155 408.66 L 145 413.66 L 135 408.66 L 135 396.34 Z" fill="none" stroke="#d97706" strokeWidth={1} opacity={0.5}>
              <animateTransform attributeName="transform" type="rotate" from="360 145 402.5" to="0 145 402.5" dur="12s" repeatCount="indefinite" />
            </path>
          </g>
        </svg>
      </div>

      {/* Right Custom SVG Grid Pattern */}
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          width: "40vw",
          maxWidth: "600px",
          height: "1000px",
          opacity: isDarkMode ? 0.35 : 0.22,
          pointerEvents: "none",
          zIndex: 0,
          transition: "opacity 0.4s ease",
        }}
      >
        <svg width="100%" height="100%" viewBox="0 0 800 1000" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dot-grid-right" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="currentColor" />
            </pattern>
            <linearGradient id="line-grad-right-1" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.8} />
              <stop offset="50%" stopColor="#d97706" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#d97706" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="line-grad-right-2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity={0} />
              <stop offset="50%" stopColor="#facc15" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#d97706" stopOpacity={0.8} />
            </linearGradient>
            <radialGradient id="mask-grad-right" cx="100%" cy="30%" r="80%">
              <stop offset="0%" stopColor="black" stopOpacity={1} />
              <stop offset="50%" stopColor="black" stopOpacity={0.5} />
              <stop offset="100%" stopColor="black" stopOpacity={0} />
            </radialGradient>
            <mask id="pattern-mask-right">
              <rect width="800" height="1000" fill="url(#mask-grad-right)" />
            </mask>
          </defs>

          <rect
            width="800"
            height="1000"
            fill="url(#dot-grid-right)"
            mask="url(#pattern-mask-right)"
            style={{ color: isDarkMode ? "rgba(251, 191, 36, 0.2)" : "rgba(217, 119, 6, 0.15)" }}
          />

          <g mask="url(#pattern-mask-right)">
            <path d="M850,150 L600,150 L450,300 L300,300 L200,400" stroke="url(#line-grad-right-1)" strokeWidth={1.5} strokeDasharray="4,4" />
            <path d="M700,50 L550,200 L550,450 L400,600 L250,600" stroke="url(#line-grad-right-2)" strokeWidth={2} />
            <path d="M820,400 L650,400 L550,500 L650,600 L500,750" stroke="url(#line-grad-right-1)" strokeWidth={1.5} />
            <path d="M500,200 L350,200 L250,100" stroke="url(#line-grad-right-2)" strokeWidth={1} />

            {/* Glowing nodes with pulsing glow rings */}
            <circle cx="600" cy="150" r="4" fill="#fbbf24" />
            <circle cx="600" cy="150" r="10" stroke="#fbbf24" strokeWidth={1.5} opacity={0.5}>
              <animate attributeName="r" values="4;14;4" dur="3s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0;0.8" dur="3s" repeatCount="indefinite" />
            </circle>

            <circle cx="450" cy="300" r="5" fill="#d97706" />
            <circle cx="450" cy="300" r="12" stroke="#d97706" strokeWidth={1} opacity={0.4}>
              <animate attributeName="r" values="5;18;5" dur="4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.6;0;0.6" dur="4s" repeatCount="indefinite" />
            </circle>

            <circle cx="550" cy="450" r="4" fill="#fbbf24" />
            <circle cx="550" cy="450" r="10" stroke="#fbbf24" strokeWidth={1.5} opacity={0.5}>
              <animate attributeName="r" values="4;12;4" dur="2.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0;0.8" dur="2.5s" repeatCount="indefinite" />
            </circle>

            <circle cx="400" cy="600" r="6" fill="#fbbf24" />
            <circle cx="400" cy="600" r="16" stroke="#fbbf24" strokeWidth={1.5} opacity={0.6}>
              <animate attributeName="r" values="6;20;6" dur="3.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0;0.8" dur="3.5s" repeatCount="indefinite" />
            </circle>

            {/* Rotated decorative squares at major intersections */}
            <rect x="595" y="145" width="10" height="10" rx="2" fill="none" stroke="#fbbf24" strokeWidth={1} opacity={0.3} transform="rotate(45, 600, 150)" />
            <rect x="445" y="295" width="10" height="10" rx="2" fill="none" stroke="#d97706" strokeWidth={1} opacity={0.3} transform="rotate(45, 450, 300)" />

            {/* Spinning decorative hexagons (data blocks) */}
            <path d="M 355 191.34 L 365 196.34 L 365 208.66 L 355 213.66 L 345 208.66 L 345 196.34 Z" fill="none" stroke="#fbbf24" strokeWidth={1.5} opacity={0.6}>
              <animateTransform attributeName="transform" type="rotate" from="0 355 202.5" to="360 355 202.5" dur="10s" repeatCount="indefinite" />
            </path>
            <path d="M 655 391.34 L 665 396.34 L 665 408.66 L 655 413.66 L 645 408.66 L 645 396.34 Z" fill="none" stroke="#d97706" strokeWidth={1} opacity={0.5}>
              <animateTransform attributeName="transform" type="rotate" from="360 655 402.5" to="0 655 402.5" dur="12s" repeatCount="indefinite" />
            </path>
          </g>
        </svg>
      </div>

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

      {/* Supported File Formats Marquee */}
      <section
        style={{
          width: "60%",
          padding: "3rem 0",
          background: isDarkMode ? "rgba(9, 9, 11, 0.4)" : "rgba(250, 250, 249, 0.4)",
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
        <div style={{ width: "100%", opacity: 0.8 }}>
          <Marquee
            speed={40}
            gradient={true}

            gradientWidth={150}
            gradientColor={isDarkMode ? "#09090b" : "#fafaf9"}
            pauseOnHover={false}
          >
            {fileIcons.map((icon, idx) => (
              <div
                key={idx}
                style={{
                  margin: "0 1.5rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.65rem",
                  // background: isDarkMode ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)",
                  // border: isDarkMode ? "1px solid rgba(255, 255, 255, 0.08)" : "0.2px solid rgba(0, 0, 0, 0.08)",
                  padding: "0.6rem 1.4rem",
                  borderRadius: "9999px",
                  boxShadow: isDarkMode ? "0 4px 20px rgba(0,0,0,0.2)" : "0 4px 15px rgba(0,0,0,0.02)",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  cursor: "default",
                }}
              // onMouseEnter={(e) => {
              //   e.currentTarget.style.transform = "scale(1.05)";
              //   e.currentTarget.style.background = isDarkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)";
              //   e.currentTarget.style.borderColor = isDarkMode ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.15)";
              // }}
              // onMouseLeave={(e) => {
              //   e.currentTarget.style.transform = "scale(1)";
              //   e.currentTarget.style.background = isDarkMode ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)";
              //   e.currentTarget.style.borderColor = isDarkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)";
              // }}
              >
                <img
                  src={icon.src}
                  alt={icon.name}
                  style={{
                    width: "24px",
                    height: "24px",
                    objectFit: "contain",
                  }}
                />
                <span
                  style={{
                    fontFamily: "var(--font-sans), sans-serif",
                    fontWeight: "700",
                    fontSize: "0.92rem",
                    color: isDarkMode ? "#f4f4f5" : "#18181b",
                    letterSpacing: "0.03em",
                  }}
                >
                  {icon.name}
                </span>
              </div>
            ))}
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
        {/* Even glow around mockup */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "110%",
            height: "110%",
            background: isDarkMode
              ? "radial-gradient(circle, rgba(253,224,71,0.30) 0%, rgba(253,224,71,0.16) 45%, transparent 75%)"
              : "radial-gradient(circle, rgba(254,240,138,0.18) 0%, rgba(254,240,138,0.10) 45%, transparent 75%)",
            filter: "blur(40px)",
            borderRadius: "32px",
            zIndex: -1,
            pointerEvents: "none",
            opacity: 1,
            transition: "all 0.4s ease",
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
              ? "0 0 0 1px rgba(253,223,71,0.10), 0 0 28px rgba(253,223,71,0.18), 0 0 50px rgba(253,223,71,0.10)"
              : "0 0 0 1px rgba(0,0,0,0.04), 0 0 18px rgba(0,0,0,0.08)",
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
              <CountingNumber number={3} inView={true} fromNumber={100} />+
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

      {/* FAQ Section */}
      <section
        id="faq"
        style={{
          width: "100%",
          padding: "6rem 2rem",
          background: isDarkMode ? "#09090b" : "#fafaf9",
          borderTop: isDarkMode ? "1px solid rgba(255, 255, 255, 0.05)" : "1px solid rgba(0, 0, 0, 0.05)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          transition: "all 0.4s ease",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Dynamic Soft Yellow Ambient Glow behind FAQ */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "50%",
            height: "60%",
            background: isDarkMode
              ? "radial-gradient(circle, rgba(250, 204, 21, 0.06) 0%, rgba(250, 204, 21, 0.01) 50%, rgba(250, 204, 21, 0) 70%)"
              : "radial-gradient(circle, rgba(253, 224, 71, 0.2) 0%, rgba(253, 224, 71, 0.05) 50%, rgba(253, 224, 71, 0) 70%)",
            filter: "blur(80px)",
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
          Frequently Asked Questions
        </h2>
        <p
          style={{
            fontSize: "1.05rem",
            color: isDarkMode ? "#a1a1aa" : "#475569",
            maxWidth: "600px",
            margin: "0 auto 3rem auto",
            fontWeight: 500,
            lineHeight: "1.5",
            position: "relative",
            zIndex: 1
          }}
        >
          Quick answers to common questions
        </p>

        {/* Accordion Box */}
        <div
          style={{
            width: "100%",
            maxWidth: "720px",
            borderRadius: "1rem",
            border: isDarkMode ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.08)",
            background: isDarkMode ? "rgba(18, 18, 20, 0.5)" : "rgba(255, 255, 255, 0.5)",
            backdropFilter: "blur(12px)",
            overflow: "hidden",
            position: "relative",
            zIndex: 1,
            boxShadow: isDarkMode
              ? "0 4px 30px rgba(0, 0, 0, 0.2)"
              : "0 4px 30px rgba(0, 0, 0, 0.02)",
            textAlign: "left",
            padding: "0.5rem 0",
          }}
        >
          {faqs.map((faq, index) => {
            const isOpen = activeFaqIndex === index;
            return (
              <div
                key={index}
                style={{
                  borderBottom: index === faqs.length - 1 ? "none" : (isDarkMode ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.08)"),
                  transition: "all 0.3s ease",
                }}
              >
                <button
                  onClick={() => setActiveFaqIndex(isOpen ? null : index)}
                  style={{
                    width: "100%",
                    padding: "1.25rem 1.75rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    outline: "none",
                    textAlign: "left",
                  }}
                >
                  <span
                    style={{
                      fontSize: "1rem",
                      fontWeight: 600,
                      color: isDarkMode ? "#f4f4f5" : "#1e293b",
                      transition: "color 0.2s ease",
                    }}
                  >
                    {faq.question}
                  </span>
                  <svg
                    style={{
                      width: "1.1rem",
                      height: "1.1rem",
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      color: isDarkMode ? "#71717a" : "#94a3b8",
                      flexShrink: 0,
                      marginLeft: "1rem",
                    }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <div
                  style={{
                    maxHeight: isOpen ? "160px" : "0px",
                    overflow: "hidden",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    opacity: isOpen ? 1 : 0,
                    padding: "0 1.75rem",
                  }}
                >
                  <p
                    style={{
                      paddingBottom: "1.25rem",
                      color: isDarkMode ? "#a1a1aa" : "#475569",
                      fontSize: "0.92rem",
                      lineHeight: "1.6",
                      margin: 0,
                    }}
                  >
                    {faq.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* View all FAQs Link */}
        <div style={{ marginTop: "2rem", position: "relative", zIndex: 1 }}>
          <Link
            href="#faq"
            style={{
              fontSize: "0.95rem",
              fontWeight: 700,
              color: "#facc15",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#eab308";
              e.currentTarget.style.transform = "translateX(3px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#facc15";
              e.currentTarget.style.transform = "translateX(0)";
            }}
          >
            <span>View all FAQs</span>
            <svg
              style={{ width: "0.9rem", height: "0.9rem", strokeWidth: 3 }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Premium Footer Section */}
      <footer
        style={{
          width: "100%",
          background: isDarkMode ? "rgba(9, 9, 11, 0.85)" : "rgba(255, 255, 255, 0.85)",
          backdropFilter: "blur(20px)",
          borderTop: isDarkMode ? "1px solid rgba(253, 224, 71, 0.08)" : "1px solid rgba(234, 179, 8, 0.1)",
          padding: "5rem 2rem 2.5rem 2rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          zIndex: 5,
          position: "relative",
          transition: "all 0.4s ease",
          overflow: "hidden"
        }}
      >
        <Meteors  />
        {/* Soft yellow ambient glow in the footer background */}
        <div
          style={{
            position: "absolute",
            bottom: "0",
            left: "50%",
            transform: "translateX(-50%)",
            width: "500px",
            height: "150px",
            background: isDarkMode
              ? "radial-gradient(circle, rgba(253, 224, 71, 0.04) 0%, transparent 80%)"
              : "radial-gradient(circle, rgba(253, 224, 71, 0.08) 0%, transparent 80%)",
            filter: "blur(40px)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        <div
          style={{
            width: "100%",
            maxWidth: "1100px",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: "3rem",
            marginBottom: "4rem",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Logo & Description Column */}
          <div style={{ flex: "1 1 320px", display: "flex", flexDirection: "column", gap: "1.2rem" }}>
            <Link
              href="/"
              style={{
                fontSize: "1.5rem",
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
            <p
              style={{
                fontSize: "0.92rem",
                lineHeight: "1.6",
                color: isDarkMode ? "#a1a1aa" : "#475569",
                maxWidth: "300px",
                fontWeight: 500,
              }}
            >
              High-performance decentralized cloud bridge leveraging Telegram's secure MTProto network.
              Unlimited, uncapped storage under your absolute control.
            </p>
            {/* Social Icons / Badges */}
            <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
              {/* Telegram Channel */}
              <a
                href="https://t.me"
                target="_blank"
                rel="noreferrer"
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: isDarkMode ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.03)",
                  border: isDarkMode ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: isDarkMode ? "#a1a1aa" : "#475569",
                  transition: "all 0.2s ease",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#facc15";
                  e.currentTarget.style.borderColor = "#facc15";
                  e.currentTarget.style.background = isDarkMode ? "rgba(250, 204, 21, 0.05)" : "rgba(250, 204, 21, 0.08)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = isDarkMode ? "#a1a1aa" : "#475569";
                  e.currentTarget.style.borderColor = isDarkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)";
                  e.currentTarget.style.background = isDarkMode ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.03)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <svg style={{ width: "1.1rem", height: "1.1rem" }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.35-.49.96-.75 3.78-1.64 6.3-2.73 7.55-3.26 3.58-1.51 4.32-1.78 4.81-1.79.11 0 .35.03.5.16.13.12.17.28.19.39.02.07.02.21 0 .29z" />
                </svg>
              </a>

              {/* GitHub */}
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: isDarkMode ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.03)",
                  border: isDarkMode ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: isDarkMode ? "#a1a1aa" : "#475569",
                  transition: "all 0.2s ease",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#facc15";
                  e.currentTarget.style.borderColor = "#facc15";
                  e.currentTarget.style.background = isDarkMode ? "rgba(250, 204, 21, 0.05)" : "rgba(250, 204, 21, 0.08)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = isDarkMode ? "#a1a1aa" : "#475569";
                  e.currentTarget.style.borderColor = isDarkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)";
                  e.currentTarget.style.background = isDarkMode ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.03)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <svg style={{ width: "1.1rem", height: "1.1rem" }} fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.167 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
              </a>

              {/* Twitter / X */}
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noreferrer"
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: isDarkMode ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.03)",
                  border: isDarkMode ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: isDarkMode ? "#a1a1aa" : "#475569",
                  transition: "all 0.2s ease",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#facc15";
                  e.currentTarget.style.borderColor = "#facc15";
                  e.currentTarget.style.background = isDarkMode ? "rgba(250, 204, 21, 0.05)" : "rgba(250, 204, 21, 0.08)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = isDarkMode ? "#a1a1aa" : "#475569";
                  e.currentTarget.style.borderColor = isDarkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)";
                  e.currentTarget.style.background = isDarkMode ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.03)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <svg style={{ width: "1rem", height: "1rem" }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Links Column 1: Product */}
          <div style={{ flex: "1 1 140px", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: isDarkMode ? "#f4f4f5" : "#1e293b", letterSpacing: "0.03em" }}>Product</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {["Features", "Storage", "Security", "Pricing"].map((link) => (
                <Link
                  key={link}
                  href="#features"
                  style={{
                    fontSize: "0.88rem",
                    color: isDarkMode ? "#a1a1aa" : "#475569",
                    textDecoration: "none",
                    fontWeight: 600,
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#facc15";
                    e.currentTarget.style.transform = "translateX(2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = isDarkMode ? "#a1a1aa" : "#475569";
                    e.currentTarget.style.transform = "translateX(0)";
                  }}
                >
                  {link}
                </Link>
              ))}
            </div>
          </div>

          {/* Links Column 2: Resources */}
          <div style={{ flex: "1 1 140px", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: isDarkMode ? "#f4f4f5" : "#1e293b", letterSpacing: "0.03em" }}>Resources</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {["Documentation", "API Reference", "System Status", "Support"].map((link) => (
                <a
                  key={link}
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  style={{
                    fontSize: "0.88rem",
                    color: isDarkMode ? "#a1a1aa" : "#475569",
                    textDecoration: "none",
                    fontWeight: 600,
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#facc15";
                    e.currentTarget.style.transform = "translateX(2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = isDarkMode ? "#a1a1aa" : "#475569";
                    e.currentTarget.style.transform = "translateX(0)";
                  }}
                >
                  {link}
                </a>
              ))}
            </div>
          </div>

          {/* Links Column 3: Legal */}
          <div style={{ flex: "1 1 140px", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: isDarkMode ? "#f4f4f5" : "#1e293b", letterSpacing: "0.03em" }}>Legal</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {["Privacy Policy", "Terms of Service", "Cookie Settings", "SLA Agreements"].map((link) => (
                <a
                  key={link}
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  style={{
                    fontSize: "0.88rem",
                    color: isDarkMode ? "#a1a1aa" : "#475569",
                    textDecoration: "none",
                    fontWeight: 600,
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#facc15";
                    e.currentTarget.style.transform = "translateX(2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = isDarkMode ? "#a1a1aa" : "#475569";
                    e.currentTarget.style.transform = "translateX(0)";
                  }}
                >
                  {link}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            width: "100%",
            maxWidth: "1100px",
            height: "1px",
            background: isDarkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
            marginBottom: "2rem",
            position: "relative",
            zIndex: 1,
          }}
        />

        {/* Bottom Bar */}
        <div
          style={{
            width: "100%",
            maxWidth: "1100px",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1.5rem",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div style={{ fontSize: "0.88rem", color: isDarkMode ? "#71717a" : "#64748b", fontWeight: 500 }}>
            © 2026 CloudBridge. All rights reserved. Built for unlimited speed and scale.
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: isDarkMode ? "rgba(254, 240, 138, 0.05)" : "rgba(254, 240, 138, 0.35)",
              border: isDarkMode ? "1px solid rgba(253, 224, 71, 0.1)" : "1px solid rgba(234, 179, 8, 0.2)",
              padding: "0.4rem 0.9rem",
              borderRadius: "9999px",
              fontSize: "0.78rem",
              fontWeight: 700,
              color: isDarkMode ? "#fef08a" : "#854d0e",
            }}
          >
            <span>Made with 💛 for Telegram Developers</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
