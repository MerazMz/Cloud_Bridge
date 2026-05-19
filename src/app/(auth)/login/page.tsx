import type { Metadata } from "next";
import { PhoneForm } from "@/components/auth/phone-form";

export const metadata: Metadata = {
  title: "Login — CloudBridge",
  description: "Sign in to CloudBridge with your Telegram account.",
};

export default function LoginPage() {
  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2
          style={{
            fontSize: "1.25rem",
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: "0.5rem",
          }}
        >
          Sign in to CloudBridge
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          Enter your Telegram phone number to receive a verification code.
        </p>
      </div>

      <PhoneForm />
    </div>
  );
}
