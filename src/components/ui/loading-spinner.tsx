"use client";

/**
 * Loading spinner component with optional label.
 */

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  label?: string;
}

const sizeMap = {
  sm: "w-4 h-4 border-2",
  md: "w-6 h-6 border-2",
  lg: "w-10 h-10 border-3",
};

export function LoadingSpinner({ size = "md", label }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center justify-center gap-3">
      <div
        className={`${sizeMap[size]} rounded-full border-t-transparent animate-spin`}
        style={{
          borderColor: "var(--border-default)",
          borderTopColor: "transparent",
          borderRightColor: "var(--color-primary)",
        }}
        role="status"
        aria-label={label || "Loading"}
      />
      {label && (
        <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          {label}
        </span>
      )}
    </div>
  );
}
