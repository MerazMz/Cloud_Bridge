import type { Metadata } from "next";
import { Suspense } from "react";
import { PasswordForm } from "@/components/auth/password-form";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export const metadata: Metadata = {
  title: "Two-Factor Auth — CloudBridge",
  description: "Enter your Telegram cloud password to continue.",
};

export default function VerifyPasswordPage() {
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
          Two-Factor Authentication
        </h2>
      </div>

      <Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}>
        <PasswordForm />
      </Suspense>
    </div>
  );
}
