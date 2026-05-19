"use client";

import { useState, useRef, KeyboardEvent, ClipboardEvent, FormEvent, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/components/ui/toast";

/**
 * OTP verification form with individual digit inputs.
 */
export function OtpForm() {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const phoneNumber = searchParams.get("phone") || "";

  useEffect(() => {
    if (!phoneNumber) {
      router.replace("/login");
    }
  }, [phoneNumber, router]);

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);

    // Auto-focus next input
    if (value && index < digits.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 5);
    if (!pasted) return;

    const newDigits = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);

    // Focus the next empty or last input
    const nextEmpty = newDigits.findIndex((d) => !d);
    const focusIndex = nextEmpty === -1 ? digits.length - 1 : nextEmpty;
    inputRefs.current[focusIndex]?.focus();
  };

  const code = digits.join("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (code.length < 5) {
      showToast("error", "Please enter the complete verification code.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, code }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        showToast("error", data.message || "Verification failed.");
        setDigits(["", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        return;
      }

      // Check if 2FA is required
      if (data.data?.requires2FA) {
        showToast("info", "Two-factor authentication required.");
        const params = new URLSearchParams({ phone: phoneNumber });
        router.push(`/verify-password?${params.toString()}`);
        return;
      }

      showToast("success", "Login successful!");
      router.push("/dashboard");
    } catch {
      showToast("error", "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "0.25rem" }}>
          Enter the code sent to
        </p>
        <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "1.1rem" }}>
          {phoneNumber}
        </p>
      </div>

      <div className="otp-container">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            className={`otp-digit ${digit ? "filled" : ""}`}
            value={digit}
            onChange={(e) => handleDigitChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={index === 0 ? handlePaste : undefined}
            disabled={loading}
            autoFocus={index === 0}
            aria-label={`Digit ${index + 1}`}
          />
        ))}
      </div>

      <button
        type="submit"
        className="btn btn-primary"
        disabled={loading || code.length < 5}
        style={{ width: "100%" }}
      >
        {loading ? (
          <LoadingSpinner size="sm" label="Verifying..." />
        ) : (
          <>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
            Verify Code
          </>
        )}
      </button>

      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => router.push("/login")}
        disabled={loading}
        style={{ width: "100%" }}
      >
        ← Use different number
      </button>
    </form>
  );
}
