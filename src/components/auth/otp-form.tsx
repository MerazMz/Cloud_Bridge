"use client";

import { useState, useRef, KeyboardEvent, ClipboardEvent, FormEvent, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/components/ui/toast";
import Image from "next/image";

/**
 * Premium OTP verification card component with individual digit inputs.
 */
export function OtpForm() {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(45);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
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

  // 45-second countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleResend = async () => {
    if (timeLeft > 0 || loading) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        showToast("error", data.message || "Failed to resend code.");
        return;
      }

      showToast("success", "A new code has been sent to your Telegram app.");
      setTimeLeft(45);
      setDigits(["", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch {
      showToast("error", "Failed to resend. Please check your network.");
    } finally {
      setLoading(false);
    }
  };

  const code = digits.join("");

  const verifyOtpCode = async (otpCode: string) => {
    if (loading || isSuccess) return;
    setLoading(true);
    setIsError(false);
    setIsSuccess(false);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, code: otpCode }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        showToast("error", data.message || "Verification failed.");
        setIsError(true);
        // Reset error state after shake animation completes so it can shake again
        setTimeout(() => setIsError(false), 500);
        setDigits(["", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        return;
      }

      setIsSuccess(true);
      showToast("success", "Verification successful!");

      // Pause for a brief 600ms so user can enjoy the beautiful green success state
      setTimeout(() => {
        if (data.data?.requires2FA) {
          showToast("info", "Two-factor authentication required.");
          const params = new URLSearchParams({ phone: phoneNumber });
          router.push(`/verify-password?${params.toString()}`);
        } else {
          showToast("success", "Login successful!");
          router.push("/dashboard");
        }
      }, 600);
    } catch {
      showToast("error", "Network error. Please try again.");
      setIsError(true);
      setTimeout(() => setIsError(false), 500);
    } finally {
      setLoading(false);
    }
  };

  // Automatic submission when 5th digit is entered
  useEffect(() => {
    if (code.length === 5 && !loading && !isSuccess && !isError) {
      verifyOtpCode(code);
    }
  }, [code, loading, isSuccess, isError]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (code.length < 5) {
      showToast("error", "Please enter the complete 5-digit verification code.");
      return;
    }

    await verifyOtpCode(code);
  };

  return (
    <div
      className="animate-fade-in"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-default)",
        borderRadius: "1.75rem",
        padding: "2.5rem 2rem",
        boxShadow: "0 20px 40px -15px rgba(255, 122, 0, 0.05), 0 15px 25px -5px rgba(0, 0, 0, 0.02)",
        width: "100%",
        maxWidth: "440px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      {/* Dynamic focus and glow CSS styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        .otp-input-slot {
          width: 3.5rem;
          height: 4.1rem;
          text-align: center;
          font-size: 1.5rem;
          font-weight: 800;
          background: var(--bg-secondary);
          border: 1.5px solid var(--border-default);
          border-radius: 0.8rem;
          color: var(--text-primary);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          outline: none;
        }

        .otp-input-slot:focus {
          border-color: #FFA800;
          box-shadow: 0 0 0 4px rgba(255, 168, 0, 0.12);
          background: var(--bg-card);
          transform: translateY(-1px);
        }

        .otp-input-slot.success-state {
          border-color: #10B981 !important;
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.15) !important;
          background: var(--bg-card);
        }

        .otp-input-slot.error-state {
          border-color: #EF4444 !important;
          box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.15) !important;
          background: var(--bg-card);
        }

        @keyframes otp-shake {
          0%, 100% { transform: translateX(0); }
          15%, 45%, 75% { transform: translateX(-6px); }
          30%, 60%, 90% { transform: translateX(6px); }
        }

        .shake-effect {
          animation: otp-shake 0.45s cubic-bezier(.36,.07,.19,.97) both;
        }

        .verify-otp-btn {
          width: 100%;
          height: 48px;
          border-radius: 0.8rem;
          background: linear-gradient(135deg, #FFA800 0%, #FF7A00 100%);
          color: #ffffff;
          font-weight: 700;
          font-size: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          border: none;
          cursor: pointer;
          boxShadow: 0 4px 15px rgba(255, 122, 0, 0.25);
          transition: all 0.2s ease;
          margin-top: 0.5rem;
        }

        .verify-otp-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(255, 122, 0, 0.32);
        }

        .verify-otp-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .verify-otp-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 520px) {
          .otp-card-lock-wrapper {
            right: -20px !important;
            bottom: -50px !important;
            transform: scale(0.8);
          }
        }
      ` }} />

      {/* Gold Shield Visual with Floating diamond Sparkles */}
      <div
        style={{
          position: "relative",
          width: "90px",
          height: "90px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "1.25rem",
        }}
      >
        {/* Sparkle 1 (top-left 4-pointed star) */}
        <div style={{ position: "absolute", top: "4px", left: "-10px", color: "#FFA800" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" />
          </svg>
        </div>
        {/* Sparkle 2 (bottom-left 4-pointed star) */}
        <div style={{ position: "absolute", bottom: "16px", left: "-8px", color: "#FFA800" }}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" />
          </svg>
        </div>
        {/* Sparkle 3 (top-right 4-pointed star) */}
        <div style={{ position: "absolute", top: "10px", right: "-12px", color: "#FFA800" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" />
          </svg>
        </div>
        {/* Sparkle 4 (bottom-right diamond sparkle) */}
        <div style={{ position: "absolute", bottom: "14px", right: "-6px", color: "#FFA800" }}>
          <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" />
          </svg>
        </div>

        {/* Double circular badge visual */}
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(255, 168, 0, 0.04) 0%, rgba(255, 122, 0, 0.08) 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "62px",
              height: "62px",
              borderRadius: "50%",
              backgroundColor: "var(--bg-card)",
              border: "1.5px solid rgba(255, 168, 0, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 18px rgba(255, 168, 0, 0.05), inset 0 2px 4px var(--bg-card)",
            }}
          >
            {/* Shield & Lock inside */}
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FFA800"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                filter: "drop-shadow(0 2px 4px rgba(255, 168, 0, 0.15))"
              }}
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <rect x="9" y="11" width="6" height="5" rx="1.2" ry="1.2" fill="#FFA800" stroke="#FFA800" strokeWidth="1" />
              <path d="M10.5 11V9.5a1.5 1.5 0 0 1 3 0V11" stroke="#FFA800" strokeWidth="1.2" />
            </svg>
          </div>
        </div>
      </div>

      {/* Header Info */}
      <h3
        style={{
          fontSize: "1.55rem",
          fontWeight: 850,
          color: "var(--text-primary)",
          letterSpacing: "-0.035em",
          marginBottom: "0.35rem",
          textAlign: "center",
        }}
      >
        Verify your number
      </h3>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "0.25rem", fontWeight: 500, textAlign: "center" }}>
        We've sent a 5-digit OTP to
      </p>

      {/* Phone and Change option */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          marginBottom: "1.75rem",
        }}
      >
        <span style={{ fontWeight: 800, color: "var(--text-primary)", fontSize: "1.05rem", letterSpacing: "-0.01em" }}>
          {phoneNumber}
        </span>
        <button
          onClick={() => {
            const params = new URLSearchParams({ phone: phoneNumber });
            router.push(`/login?${params.toString()}`);
          }}
          disabled={loading}
          style={{
            background: "none",
            border: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.25rem",
            color: "#FFA800",
            fontWeight: 800,
            fontSize: "0.875rem",
            cursor: "pointer",
            outline: "none",
            padding: "0.2rem 0.4rem",
            borderRadius: "0.4rem",
            transition: "all 0.15s ease",
          }}
          className="pencil-change-link"
        >
          {/* Pencil Icon */}
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          <span style={{ textDecoration: "underline", textUnderlineOffset: "2px" }}>Change</span>
        </button>
      </div>

      {/* Code Input Form */}
      <form onSubmit={handleSubmit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {/* 5-Digit Inputs Container */}
        <div 
          className={isError ? "shake-effect" : ""}
          style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", width: "100%" }}
        >
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={index === 0 ? handlePaste : undefined}
              disabled={loading}
              autoFocus={index === 0}
              aria-label={`Digit ${index + 1}`}
              className={`otp-input-slot ${isSuccess ? "success-state" : ""} ${isError ? "error-state" : ""}`}
            />
          ))}
        </div>

        {/* Resend OTP timer & Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.6rem",
            width: "100%",
            fontSize: "0.875rem",
            color: "var(--text-secondary)",
            fontWeight: 500,
          }}
        >
          <span>Didn't receive the code?</span>

          {timeLeft > 0 ? (
            <span
              style={{
                display: "inline-block",
                padding: "0.2rem 0.6rem",
                borderRadius: "15px",
                backgroundColor: "rgba(255, 168, 0, 0.08)",
                color: "#FFA800",
                fontWeight: 800,
                fontSize: "0.8rem",
                letterSpacing: "0.02em",
              }}
            >
              {formatTime(timeLeft)}
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={loading}
              style={{
                background: "none",
                border: "none",
                color: "#FFA800",
                fontWeight: 800,
                cursor: "pointer",
                padding: 0,
                fontSize: "0.875rem",
                outline: "none",
                textDecoration: "underline",
                textUnderlineOffset: "2px",
              }}
            >
              Resend OTP
            </button>
          )}
        </div>

        {/* Verify Submit Button */}
        <button
          type="submit"
          disabled={loading || code.length < 5}
          className="verify-otp-btn"
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
              <span>Verifying...</span>
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
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <polyline points="9 11 11 13 15 9" />
              </svg>
              <span>Verify OTP</span>
            </>
          )}
        </button>
      </form>

      {/* 3D lock overlapping bottom-right corner exactly like the mockup */}
      <div 
        className="otp-card-lock-wrapper"
        style={{
          position: "absolute",
          right: "-140px",
          bottom: "-90px",
          zIndex: 20,
          pointerEvents: "none",
          transition: "all 0.3s ease",
        }}
      >
        <Image
          src="/lock.png"
          alt="CloudBridge 3D Lock illustration"
          width={230}
          height={230}
          priority
          style={{ objectFit: "contain" }}
        />
        <Image
          src="/telegram.png"
          alt="Telegram Icon"
          width={200}
          height={200}
          priority
          style={{ objectFit: "contain", position: "absolute", right: "23px", bottom: "500px",  }}
        />
      </div>
    </div>
  );
}
