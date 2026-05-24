"use client";

interface OrganizerViewProps {
  imagesCount: number;
  imagesSize: number;
  documentsCount: number;
  documentsSize: number;
  mediaCount: number;
  mediaSize: number;
  othersCount: number;
  othersSize: number;
  formatBytes: (bytes: number) => string;
  setSelectedFolderCategory: (category: string | null) => void;
}

export const OrganizerView = ({
  imagesCount,
  imagesSize,
  documentsCount,
  documentsSize,
  mediaCount,
  mediaSize,
  othersCount,
  othersSize,
  formatBytes,
  setSelectedFolderCategory,
}: OrganizerViewProps) => {
  return (
    <section
      className="animate-fade-in"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "1.25rem",
        width: "100%",
      }}
    >
      {/* Images Folder */}
      <div
        onClick={() => setSelectedFolderCategory("images")}
        className="glass-card card-hover"
        style={{
          padding: "1.65rem 1.5rem",
          borderRadius: "16px",
          border: "1px solid var(--border-default)",
          background: "var(--bg-card)",
          display: "flex",
          flexDirection: "column",
          gap: "0.85rem",
          cursor: "pointer",
          transition: "all 0.22s ease",
          boxShadow: "var(--glass-shadow)",
        }}
      >
        <div
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, rgba(255, 168, 0, 0.06) 0%, rgba(255, 122, 0, 0.12) 100%)",
            border: "1px solid rgba(255, 168, 0, 0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FFA800"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
          <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.015em" }}>
            Images
          </span>
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 500 }}>
            {imagesCount} files • {formatBytes(imagesSize)}
          </span>
        </div>
      </div>

      {/* Documents Folder */}
      <div
        onClick={() => setSelectedFolderCategory("documents")}
        className="glass-card card-hover"
        style={{
          padding: "1.65rem 1.5rem",
          borderRadius: "16px",
          border: "1px solid var(--border-default)",
          background: "var(--bg-card)",
          display: "flex",
          flexDirection: "column",
          gap: "0.85rem",
          cursor: "pointer",
          transition: "all 0.22s ease",
          boxShadow: "var(--glass-shadow)",
        }}
      >
        <div
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, rgba(255, 168, 0, 0.06) 0%, rgba(255, 122, 0, 0.12) 100%)",
            border: "1px solid rgba(255, 168, 0, 0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FFA800"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
          <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.015em" }}>
            Documents
          </span>
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 500 }}>
            {documentsCount} files • {formatBytes(documentsSize)}
          </span>
        </div>
      </div>

      {/* Media Folder */}
      <div
        onClick={() => setSelectedFolderCategory("media")}
        className="glass-card card-hover"
        style={{
          padding: "1.65rem 1.5rem",
          borderRadius: "16px",
          border: "1px solid var(--border-default)",
          background: "var(--bg-card)",
          display: "flex",
          flexDirection: "column",
          gap: "0.85rem",
          cursor: "pointer",
          transition: "all 0.22s ease",
          boxShadow: "var(--glass-shadow)",
        }}
      >
        <div
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, rgba(255, 168, 0, 0.06) 0%, rgba(255, 122, 0, 0.12) 100%)",
            border: "1px solid rgba(255, 168, 0, 0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FFA800"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
          <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.015em" }}>
            Audio & Video
          </span>
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 500 }}>
            {mediaCount} files • {formatBytes(mediaSize)}
          </span>
        </div>
      </div>

      {/* Others Folder */}
      <div
        onClick={() => setSelectedFolderCategory("others")}
        className="glass-card card-hover"
        style={{
          padding: "1.65rem 1.5rem",
          borderRadius: "16px",
          border: "1px solid var(--border-default)",
          background: "var(--bg-card)",
          display: "flex",
          flexDirection: "column",
          gap: "0.85rem",
          cursor: "pointer",
          transition: "all 0.22s ease",
          boxShadow: "var(--glass-shadow)",
        }}
      >
        <div
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, rgba(255, 168, 0, 0.06) 0%, rgba(255, 122, 0, 0.12) 100%)",
            border: "1px solid rgba(255, 168, 0, 0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FFA800"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
            <polygon points="12 22.08 12 12 3 6.92 3 17.08 12 22.08" />
            <polygon points="12 22.08 21 17.08 21 6.92 12 12 12 22.08" />
            <polygon points="12 12 21 6.92 12 1.84 3 6.92 12 12" />
          </svg>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
          <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.015em" }}>
            Archives & Others
          </span>
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 500 }}>
            {othersCount} files • {formatBytes(othersSize)}
          </span>
        </div>
      </div>
    </section>
  );
};
