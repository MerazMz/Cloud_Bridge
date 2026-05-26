"use client";

import { useState, FormEvent, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

const COUNTRIES = [
  { code: "+91", name: "India", flag: "🇮🇳" },
  { code: "+1", name: "USA / Canada", flag: "🇺🇸" },
  { code: "+44", name: "United Kingdom", flag: "🇬🇧" },
  { code: "+971", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "+65", name: "Singapore", flag: "🇸🇬" },
];

interface PhoneFormProps {
  onToggleMethod?: (method: "phone" | "qr") => void;
}

export function PhoneForm({ onToggleMethod }: PhoneFormProps) {
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [localNumber, setLocalNumber] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<"phone" | null>(null);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [btnHovered, setBtnHovered] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { showToast } = useToast();

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

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    router.prefetch("/verify-otp");
  }, [router]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const cleanNumber = localNumber.trim().replace(/\s+/g, "");
    if (!cleanNumber) {
      showToast("error", "Please enter a valid mobile number.");
      return;
    }

    const fullPhoneNumber = `${country.code}${cleanNumber}`;
    setLoading(true);

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: fullPhoneNumber }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        showToast("error", data.message || "Failed to send verification code.");
        return;
      }

      showToast("success", "Verification code sent to your Telegram app.");

      // Navigate to OTP verification page with phone number
      const params = new URLSearchParams({ phone: fullPhoneNumber });
      router.push(`/verify-otp?${params.toString()}`);
    } catch {
      showToast("error", "Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        animation: "fade-in 0.4s ease-out forwards",
      }}
    >
      {/* Centered Telegram Circular Logo */}
      <img
        src="/qrImage.png"
        alt="Telegram Logo"
        style={{
          width: "100px",
          height: "100px",
          borderRadius: "50%",
          objectFit: "contain",
          marginBottom: "1.5rem",
        }}
      />

      {/* Title & Description */}
      <h2
        style={{
          fontSize: "1.75rem",
          fontWeight: 500,
          color: isDarkTheme ? "#FFFFFF" : "#000000",
          textAlign: "center",
          margin: "0 0 0.5rem 0",
          fontFamily: "var(--font-outfit), var(--font-sans), system-ui, -apple-system, sans-serif",
          letterSpacing: "-0.01em",
        }}
      >
        Sign in to CloudBridge
      </h2>
      <p
        style={{
          fontSize: "0.95rem",
          color: isDarkTheme ? "#AAAAAA" : "#555555",
          textAlign: "center",
          margin: "0 0 2rem 0",
          lineHeight: "1.45",
          maxWidth: "320px",
          fontFamily: "var(--font-outfit), var(--font-sans), system-ui, -apple-system, sans-serif",
        }}
      >
        Please confirm your country code and enter your phone number.
      </p>

      {/* Form Block */}
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: "340px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Country Selector with Outline Label */}
        <div
          ref={dropdownRef}
          style={{
            position: "relative",
            width: "100%",
            marginBottom: "1.5rem",
          }}
        >
          <label
            style={{
              position: "absolute",
              top: "-8px",
              left: "12px",
              background: isDarkTheme ? "#121215" : "#FFFDF9",
              padding: "0 4px",
              fontSize: "0.75rem",
              fontWeight: 600,
              color: dropdownOpen ? (isDarkTheme ? "#fbbf24" : "#d97706") : (isDarkTheme ? "#888888" : "#666666"),
              zIndex: 2,
              fontFamily: "var(--font-outfit), var(--font-sans), system-ui, sans-serif",
              transition: "color 0.2s ease",
            }}
          >
            Country
          </label>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            disabled={loading}
            style={{
              width: "100%",
              height: "56px",
              borderRadius: "0.75rem",
              border: `1.5px solid ${dropdownOpen ? (isDarkTheme ? "#fbbf24" : "#d97706") : (isDarkTheme ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.15)")}`,
              background: "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 1rem",
              fontSize: "1rem",
              fontWeight: 500,
              color: isDarkTheme ? "#FFFFFF" : "#000000",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.2s ease",
              outline: "none",
              fontFamily: "var(--font-outfit), var(--font-sans), system-ui, sans-serif",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.1rem" }}>{country.flag}</span>
              <span>{country.name}</span>
            </span>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                color: isDarkTheme ? "#888888" : "#666666",
                transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {/* Custom Dropdown List */}
          {dropdownOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 0.4rem)",
                left: 0,
                right: 0,
                zIndex: 50,
                background: isDarkTheme ? "#1E1E1E" : "#FFFFFF",
                border: isDarkTheme ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
                borderRadius: "0.75rem",
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
                padding: "0.4rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.2rem",
                maxHeight: "220px",
                overflowY: "auto",
              }}
            >
              {COUNTRIES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    setCountry(c);
                    setDropdownOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    padding: "0.7rem 0.8rem",
                    borderRadius: "0.5rem",
                    background: country.code === c.code ? (isDarkTheme ? "rgba(255, 168, 0, 0.12)" : "rgba(255, 168, 0, 0.08)") : "transparent",
                    border: "none",
                    textAlign: "left",
                    fontSize: "0.95rem",
                    fontWeight: country.code === c.code ? 600 : 500,
                    color: country.code === c.code ? (isDarkTheme ? "#fbbf24" : "#d97706") : (isDarkTheme ? "#FFFFFF" : "#000000"),
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    width: "100%",
                  }}
                >
                  <span style={{ fontSize: "1.2rem" }}>{c.flag}</span>
                  <span style={{ flex: 1 }}>{c.name}</span>
                  <span style={{ color: isDarkTheme ? "#888888" : "#666666", fontSize: "0.85rem" }}>{c.code}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Phone Input with Outline Label */}
        <div
          style={{
            position: "relative",
            width: "100%",
            marginBottom: "2rem",
          }}
        >
          <label
            style={{
              position: "absolute",
              top: "-8px",
              left: "12px",
              background: isDarkTheme ? "#121215" : "#FFFDF9",
              padding: "0 4px",
              fontSize: "0.75rem",
              fontWeight: 600,
              color: focusedInput === "phone" ? (isDarkTheme ? "#fbbf24" : "#d97706") : (isDarkTheme ? "#888888" : "#666666"),
              zIndex: 2,
              fontFamily: "var(--font-outfit), var(--font-sans), system-ui, sans-serif",
              transition: "color 0.2s ease",
            }}
          >
            Phone Number
          </label>
          <div
            style={{
              width: "100%",
              height: "56px",
              borderRadius: "0.75rem",
              border: `1.5px solid ${focusedInput === "phone" ? (isDarkTheme ? "#fbbf24" : "#d97706") : (isDarkTheme ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.15)")}`,
              background: "transparent",
              display: "flex",
              alignItems: "center",
              padding: "0 1rem",
              transition: "all 0.2s ease",
            }}
          >
            <span
              style={{
                fontSize: "1rem",
                fontWeight: 600,
                color: isDarkTheme ? "#FFFFFF" : "#000000",
                marginRight: "0.5rem",
                fontFamily: "var(--font-outfit), var(--font-sans), system-ui, sans-serif",
              }}
            >
              {country.code}
            </span>
            <input
              type="tel"
              placeholder="------ ------"
              value={localNumber}
              onFocus={() => setFocusedInput("phone")}
              onBlur={() => setFocusedInput(null)}
              onChange={(e) => setLocalNumber(e.target.value.replace(/\D/g, ""))}
              disabled={loading}
              required
              autoFocus
              style={{
                flex: 1,
                border: "none",
                background: "transparent",
                fontSize: "1rem",
                fontWeight: 500,
                color: isDarkTheme ? "#FFFFFF" : "#000000",
                outline: "none",
                letterSpacing: "0.05em",
                fontFamily: "var(--font-outfit), var(--font-sans), system-ui, sans-serif",
              }}
            />
          </div>
        </div>

        {/* Primary NEXT Button */}
        <button
          type="submit"
          disabled={loading || !localNumber.trim()}
          onMouseEnter={() => setBtnHovered(true)}
          onMouseLeave={() => setBtnHovered(false)}
          style={{
            width: "100%",
            height: "56px",
            borderRadius: "0.75rem",
            background: btnHovered ? "#eab308" : "linear-gradient(135deg, #facc15, #eab308)",
            color: "#0f172a",
            fontWeight: 800,
            fontSize: "0.95rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            border: "1px solid rgba(234, 179, 8, 0.4)",
            cursor: "pointer",
            boxShadow: "0 4px 15px rgba(234, 179, 8, 0.25)",
            transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            fontFamily: "var(--font-outfit), var(--font-sans), system-ui, sans-serif",
            opacity: !localNumber.trim() ? 0.6 : 1,
          }}
        >
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
              <div
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  border: "2px solid rgba(15, 23, 42, 0.35)",
                  borderTopColor: "#0f172a",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              <span>Loading...</span>
            </div>
          ) : (
            <span>Send OTP</span>
          )}
        </button>

        {/* Subtle legal disclaimer */}
        <p
          style={{
            fontSize: "0.72rem",
            color: isDarkTheme ? "#666666" : "#999999",
            textAlign: "center",
            marginTop: "1.25rem",
            lineHeight: "1.4",
            maxWidth: "280px",
            fontFamily: "var(--font-outfit), var(--font-sans), system-ui, sans-serif",
          }}
        >
          By clicking, you agree to our Terms of Service and Privacy Policy.
        </p>

        {/* Toggler back to QR Login */}
        {onToggleMethod && (
          <button
            type="button"
            onClick={() => onToggleMethod("qr")}
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
              marginTop: "2rem",
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
            LOG IN BY QR CODE
          </button>
        )}
      </form>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}
