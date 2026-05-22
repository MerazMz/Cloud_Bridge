"use client";

import { useState, FormEvent, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/components/ui/toast";

const COUNTRIES = [
  { code: "+91", name: "India", flag: "🇮🇳" },
  { code: "+1", name: "USA / Canada", flag: "🇺🇸" },
  { code: "+44", name: "United Kingdom", flag: "🇬🇧" },
  { code: "+971", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "+65", name: "Singapore", flag: "🇸🇬" },
];

/**
 * Highly compact Phone number input form for initiating Telegram login.
 */
export function PhoneForm() {
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [localNumber, setLocalNumber] = useState("");
  const [agree, setAgree] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { showToast } = useToast();

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

  // Prefetch /verify-otp route for instantaneous transition
  useEffect(() => {
    router.prefetch("/verify-otp");
  }, [router]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!agree) {
      showToast("error", "You must agree to the Terms of Service and Privacy Policy.");
      return;
    }

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
      className="animate-fade-in"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-default)",
        borderRadius: "1.25rem",
        padding: "1.5rem",
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.02)",
        width: "100%",
        maxWidth: "100%",
      }}
    >
      {/* Header Inside Card */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "1.25rem",
        }}
      >
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            backgroundColor: "rgba(245, 158, 11, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {/* Phone Icon */}
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        </div>

        <div style={{ flex: 1 }}>
          <h3
            style={{
              fontSize: "1.1rem",
              fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: "0.15rem",
              letterSpacing: "-0.025em",
            }}
          >
            Enter your mobile number
          </h3>
          <p
            style={{
              fontSize: "0.825rem",
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              flexWrap: "wrap",
            }}
          >
            We'll send you a 5-digit OTP to verify your account
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ display: "inline-block" }}
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </p>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {/* Country Code and Phone input field */}
        <div style={{ display: "flex", gap: "0.5rem", position: "relative" }}>
          {/* Country Dropdown */}
          <div ref={dropdownRef} style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              disabled={loading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.6rem 0.75rem",
                height: "44px",
                border: "1px solid var(--border-default)",
                borderRadius: "0.65rem",
                background: "var(--bg-card)",
                fontSize: "0.95rem",
                fontWeight: 600,
                color: "var(--text-primary)",
                cursor: "pointer",
                outline: "none",
                transition: "all 0.2s ease",
              }}
            >
              <span style={{ fontSize: "1rem" }}>{country.flag}</span>
              <span>{country.code}</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  color: "var(--text-muted)",
                  transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease",
                }}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {dropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 0.4rem)",
                  left: 0,
                  zIndex: 50,
                  width: "220px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "0.65rem",
                  boxShadow: "0 8px 20px rgba(0, 0, 0, 0.08)",
                  padding: "0.4rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.2rem",
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
                      padding: "0.5rem 0.7rem",
                      borderRadius: "0.4rem",
                      background: country.code === c.code ? "rgba(245, 158, 11, 0.08)" : "transparent",
                      border: "none",
                      textAlign: "left",
                      fontSize: "0.9rem",
                      fontWeight: country.code === c.code ? 600 : 500,
                      color: country.code === c.code ? "#F59E0B" : "var(--text-secondary)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      width: "100%",
                    }}
                  >
                    <span style={{ fontSize: "1.1rem" }}>{c.flag}</span>
                    <span style={{ flex: 1 }}>{c.name}</span>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{c.code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Number Input */}
          <div style={{ flex: 1 }}>
            <input
              type="tel"
              placeholder="Enter mobile number"
              value={localNumber}
              onChange={(e) => setLocalNumber(e.target.value.replace(/\D/g, ""))}
              disabled={loading}
              required
              autoFocus
              style={{
                width: "100%",
                height: "44px",
                padding: "0.6rem 1rem",
                border: "1px solid var(--border-default)",
                borderRadius: "0.65rem",
                background: "var(--bg-card)",
                color: "var(--text-primary)",
                fontSize: "0.95rem",
                fontWeight: 500,
                outline: "none",
                transition: "all 0.2s ease",
              }}
              className="phone-input-field"
            />
          </div>
        </div>

        {/* Checkbox agreement */}
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.6rem",
            cursor: "pointer",
            userSelect: "none",
            marginTop: "0.15rem",
          }}
        >
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            disabled={loading}
            style={{ display: "none" }}
          />
          <div
            style={{
              width: "18px",
              height: "18px",
              borderRadius: "4px",
              border: agree ? "none" : "1.75px solid var(--border-default)",
              background: agree ? "linear-gradient(135deg, #FFA800 0%, #FF7A00 100%)" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginTop: "2px",
              flexShrink: 0,
              transition: "all 0.2s ease",
            }}
          >
            {agree && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
            I agree to the{" "}
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              style={{ color: "#FFA800", fontWeight: 600, textDecoration: "none" }}
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              style={{ color: "#FFA800", fontWeight: 600, textDecoration: "none" }}
            >
              Privacy Policy
            </a>
          </span>
        </label>

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading || !localNumber.trim()}
          style={{
            width: "100%",
            height: "44px",
            borderRadius: "0.65rem",
            background: "linear-gradient(135deg, #FFA800 0%, #FF7A00 100%)",
            color: "#ffffff",
            fontWeight: 700,
            fontSize: "0.95rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 3px 12px rgba(255, 122, 0, 0.2)",
            transition: "all 0.2s ease",
            marginTop: "0.25rem",
          }}
          className="send-otp-btn"
        >
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
              <div
                style={{
                  width: "16px",
                  height: "16px",
                  borderRadius: "50%",
                  border: "2px solid rgba(255, 255, 255, 0.35)",
                  borderTopColor: "#ffffff",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              <span>Sending...</span>
            </div>
          ) : (
            <>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ transform: "rotate(45deg) translate(-2px, 2px)" }}
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              Send OTP
            </>
          )}
        </button>

        {/* Secure Text badge inside card */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.4rem",
            marginTop: "0.25rem",
            color: "var(--text-muted)",
            fontSize: "0.775rem",
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span>Your number is safe with us. We never share it.</span>
        </div>
      </form>
    </div>
  );
}
