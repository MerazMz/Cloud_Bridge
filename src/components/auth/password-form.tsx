"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/components/ui/toast";

/**
 * Two-factor authentication password form.
 */
export function PasswordForm() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const phoneNumber = searchParams.get("phone") || "";

  useEffect(() => {
    if (!phoneNumber) {
      router.replace("/login");
    }
  }, [phoneNumber, router]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!password.trim()) {
      showToast("error", "Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        showToast("error", data.message || "Verification failed.");
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
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background: "rgba(245, 158, 11, 0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 0.75rem",
            fontSize: "1.75rem",
          }}
        >
          🔐
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          Your account has two-factor authentication enabled.
          <br />
          Enter your cloud password to continue.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <label
          htmlFor="cloud-password"
          style={{
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "var(--text-secondary)",
          }}
        >
          Cloud Password
        </label>
        <div style={{ position: "relative" }}>
          <input
            id="cloud-password"
            type={showPassword ? "text" : "password"}
            className="input-field"
            placeholder="Enter your Telegram cloud password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            autoFocus
            autoComplete="current-password"
            required
            style={{ paddingRight: "3rem" }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: "absolute",
              right: "0.75rem",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "0.25rem",
              fontSize: "0.85rem",
            }}
            tabIndex={-1}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      <button
        type="submit"
        className="btn btn-primary"
        disabled={loading || !password.trim()}
        style={{ width: "100%" }}
      >
        {loading ? (
          <LoadingSpinner size="sm" label="Verifying..." />
        ) : (
          <>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            Verify Password
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
        ← Start over
      </button>
    </form>
  );
}
