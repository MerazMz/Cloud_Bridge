"use client";

interface StorageUsageDonutProps {
  donutGradient: string;
  totalStorage: number;
  imagesSize: number;
  documentsSize: number;
  mediaSize: number;
  otherSize: number;
  formatBytes: (bytes: number) => string;
  totalUsedPercent: number;
}

export function StorageUsageDonut({
  donutGradient,
  totalStorage,
  imagesSize,
  documentsSize,
  mediaSize,
  otherSize,
  formatBytes,
  totalUsedPercent,
}: StorageUsageDonutProps) {
  // Compute precise storage percentage
  const limitBytes = 100 * 1024 * 1024 * 1024; // 100 GB
  const exactPercent = (totalStorage / limitBytes) * 100;
  
  let percentText = "0%";
  if (totalStorage > 0) {
    if (exactPercent < 0.01) {
      percentText = "<0.01%";
    } else {
      percentText = exactPercent.toFixed(exactPercent < 0.1 ? 2 : 1) + "%";
    }
  }

  return (
    <div
      className="glass-card"
      style={{
        padding: "1.15rem",
        borderRadius: "14px",
        border: "1px solid var(--border-default)",
        background: "var(--bg-card)",
        display: "flex",
        flexDirection: "column",
        gap: "0.85rem",
        height: "100%",
      }}
    >
      <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.015em" }}>Storage Overview</h3>
      <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flex: 1 }}>
        {/* Donut Chart */}
        <div
          style={{
            width: "105px",
            height: "105px",
            borderRadius: "50%",
            background: donutGradient,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            flexShrink: 0,
            boxShadow: "inset 0 2px 8px rgba(0, 0, 0, 0.04)",
          }}
        >
          <div
            style={{
              width: "70px",
              height: "70px",
              borderRadius: "50%",
              background: "var(--bg-card)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1,
              gap: "0.08rem",
            }}
          >
            <span style={{ fontSize: "1rem", fontWeight: 800, color: "#F59E0B", letterSpacing: "-0.02em" }}>
              {percentText}
            </span>
            <span style={{ fontSize: "0.62rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "-0.01em" }}>
              {formatBytes(totalStorage)}
            </span>
          </div>
        </div>

        {/* Legend listing */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#a855f7" }} />
              <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 600 }}>Images</span>
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-primary)", fontWeight: 700 }}>{formatBytes(imagesSize)}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#3b82f6" }} />
              <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 600 }}>Documents</span>
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-primary)", fontWeight: 700 }}>{formatBytes(documentsSize)}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }} />
              <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 600 }}>Media</span>
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-primary)", fontWeight: 700 }}>{formatBytes(mediaSize)}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f59e0b" }} />
              <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 600 }}>Others</span>
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-primary)", fontWeight: 700 }}>{formatBytes(otherSize)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
