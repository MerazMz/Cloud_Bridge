"use client";

interface MetricsGridProps {
  totalStorage: number;
  totalFilesCount: number;
  imagesCount: number;
  documentsCount: number;
  imagesPercent: number;
  documentsPercent: number;
  totalUsedPercent: number;
  formatBytes: (bytes: number) => string;
}

export function MetricsGrid({
  totalStorage,
  totalFilesCount,
  imagesCount,
  documentsCount,
  imagesPercent,
  documentsPercent,
  totalUsedPercent,
  formatBytes,
}: MetricsGridProps) {
  return (
    <section style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.9rem", width: "100%" }}>
      {/* Total Storage */}
      <div className="glass-card" style={{ padding: "1.15rem", borderRadius: "14px", border: "1px solid var(--border-default)", background: "var(--bg-card)", display: "flex", flexDirection: "column", gap: "0.5rem", position: "relative" }}>
        <button style={{ position: "absolute", top: "0.75rem", right: "0.75rem", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "1rem", fontWeight: 700 }}>•••</button>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(245, 158, 11, 0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", color: "#F59E0B", flexShrink: 0 }}>
            <svg style={{ width: "1.15rem", height: "1.15rem", color: "#F59E0B" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
            <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 600 }}>Total Storage</span>
            <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>{formatBytes(totalStorage)}</span>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 500 }}>of 100 GB used</span>
          </div>
        </div>
        <div style={{ marginTop: "0.15rem" }}>
          <div style={{ width: "100%", height: "4px", background: "var(--bg-secondary)", borderRadius: "9999px", overflow: "hidden" }}>
            <div style={{ width: `${totalUsedPercent}%`, height: "100%", background: "#F59E0B", borderRadius: "9999px" }} />
          </div>
          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 500, marginTop: "0.6rem", display: "flex", justifyContent: "flex-end" }}>{totalUsedPercent}% used</span>
        </div>
      </div>

      {/* Total Files */}
      <div className="glass-card" style={{ padding: "1.15rem", borderRadius: "14px", border: "1px solid var(--border-default)", background: "var(--bg-card)", display: "flex", flexDirection: "column", gap: "0.5rem", position: "relative" }}>
        <button style={{ position: "absolute", top: "0.75rem", right: "0.75rem", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "1rem", fontWeight: 700 }}>•••</button>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(245, 158, 11, 0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", color: "#F59E0B", flexShrink: 0 }}>
            <svg style={{ width: "1.15rem", height: "1.15rem", color: "#F59E0B" }} viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
            <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 600 }}>Total Files</span>
            <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>{totalFilesCount.toLocaleString()}</span>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 500 }}>Across all folders</span>
          </div>
        </div>
        <div style={{ marginTop: "0.15rem" }}>
          <div style={{ width: "100%", height: "4px", background: "var(--bg-secondary)", borderRadius: "9999px", overflow: "hidden" }}>
            <div style={{ width: "100%", height: "100%", background: "#F59E0B", borderRadius: "9999px" }} />
          </div>
          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 500, marginTop: "0.6rem", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
            <svg style={{ width: "0.75rem", height: "0.75rem", marginRight: "0.2rem" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Updated 1 min ago
          </span>
        </div>
      </div>

      {/* Images */}
      <div className="glass-card" style={{ padding: "1.15rem", borderRadius: "14px", border: "1px solid var(--border-default)", background: "var(--bg-card)", display: "flex", flexDirection: "column", gap: "0.5rem", position: "relative" }}>
        <button style={{ position: "absolute", top: "0.75rem", right: "0.75rem", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "1rem", fontWeight: 700 }}>•••</button>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(245, 158, 11, 0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", color: "#F59E0B", flexShrink: 0 }}>
            <svg style={{ width: "1.15rem", height: "1.15rem", color: "#F59E0B" }} viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
            <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 600 }}>Images</span>
            <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>{imagesCount.toLocaleString()}</span>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 500 }}>{imagesPercent}% of your files</span>
          </div>
        </div>
        <div style={{ marginTop: "0.15rem" }}>
          <div style={{ width: "100%", height: "4px", background: "var(--bg-secondary)", borderRadius: "9999px", overflow: "hidden" }}>
            <div style={{ width: `${imagesPercent}%`, height: "100%", background: "#F59E0B", borderRadius: "9999px" }} />
          </div>
          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 500, marginTop: "0.6rem", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
            <svg style={{ width: "0.75rem", height: "0.75rem", marginRight: "0.2rem" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Updated 1 min ago
          </span>
        </div>
      </div>

      {/* Documents */}
      <div className="glass-card" style={{ padding: "1.15rem", borderRadius: "14px", border: "1px solid var(--border-default)", background: "var(--bg-card)", display: "flex", flexDirection: "column", gap: "0.5rem", position: "relative" }}>
        <button style={{ position: "absolute", top: "0.75rem", right: "0.75rem", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "1rem", fontWeight: 700 }}>•••</button>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(245, 158, 11, 0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", color: "#F59E0B", flexShrink: 0 }}>
            <svg style={{ width: "1.15rem", height: "1.15rem", color: "#F59E0B" }} viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
            <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 600 }}>Documents</span>
            <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>{documentsCount.toLocaleString()}</span>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 500 }}>{documentsPercent}% of your files</span>
          </div>
        </div>
        <div style={{ marginTop: "0.15rem" }}>
          <div style={{ width: "100%", height: "4px", background: "var(--bg-secondary)", borderRadius: "9999px", overflow: "hidden" }}>
            <div style={{ width: `${documentsPercent}%`, height: "100%", background: "#F59E0B", borderRadius: "9999px" }} />
          </div>
          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 500, marginTop: "0.6rem", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
            <svg style={{ width: "0.75rem", height: "0.75rem", marginRight: "0.2rem" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Updated 1 min ago
          </span>
        </div>
      </div>
    </section>
  );
}
