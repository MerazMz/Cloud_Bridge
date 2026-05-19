import type { Metadata } from "next";
import { Suspense } from "react";
import { OtpForm } from "@/components/auth/otp-form";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export const metadata: Metadata = {
  title: "Verify Code — CloudBridge",
  description: "Enter the verification code sent to your Telegram app.",
};

export default function VerifyOtpPage() {
  return (
    <div>
      <div style={{ marginBottom: "1.5rem", textAlign: "center" }}>
        <h2
          style={{
            fontSize: "1.25rem",
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: "0.5rem",
          }}
        >
          Verification Code
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          Check your Telegram app for the code.
        </p>
      </div>

      <Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}>
        <OtpForm />
      </Suspense>
    </div>
  );
}
