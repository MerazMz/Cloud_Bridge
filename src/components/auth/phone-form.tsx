"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/components/ui/toast";

/**
 * Phone number input form for initiating Telegram login.
 */
export function PhoneForm() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const phone = phoneNumber.trim();
    if (!phone.startsWith("+")) {
      showToast("error", "Phone number must include country code (e.g., +91)");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phone }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        showToast("error", data.message || "Failed to send verification code.");
        return;
      }

      showToast("success", "Verification code sent to your Telegram app.");

      // Navigate to OTP verification page with phone number
      const params = new URLSearchParams({ phone });
      router.push(`/verify-otp?${params.toString()}`);
    } catch {
      showToast("error", "Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <label
          htmlFor="phone-number"
          style={{
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "var(--text-secondary)",
          }}
        >
          Phone Number
        </label>
        <input
          id="phone-number"
          type="tel"
          className="input-field"
          placeholder="+919999999999"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          disabled={loading}
          autoFocus
          autoComplete="tel"
          required
        />
        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
          Enter your Telegram phone number with country code
        </p>
      </div>

      <button
        type="submit"
        className="btn btn-primary"
        disabled={loading || !phoneNumber.trim()}
        style={{ width: "100%", position: "relative" }}
      >
        {loading ? (
          <LoadingSpinner size="sm" label="Sending..." />
        ) : (
          <>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
            Send Verification Code
          </>
        )}
      </button>
    </form>
  );
}
