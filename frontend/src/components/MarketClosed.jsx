import React from "react";

export default function MarketClosed({ session }) {
  const fmt = (ms) =>
    ms
      ? new Date(ms).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : "--";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column", 
        alignItems: "center",
        justifyContent: "center",
        minHeight: 420,
        gap: 16,
        padding: 40,
        background: "rgb(15, 23, 42)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        backdropFilter: "blur(12px)",
        textAlign: "center",
      }}
    >
      <h2
        style={{
          color: "#f1f5f9",
          margin: 0,
          fontSize: "1.5rem",
          fontWeight: 700,
        }}
      >
        Market is Closed
      </h2>
      <p style={{ color: "#64748b", margin: 0, maxWidth: 380 }}>
        Live charts are only displayed during market hours. The next session
        opens when the market is active.
      </p>
      {session && (
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            borderRadius: 8,
            padding: "12px 20px",
            color: "#94a3b8",
            fontSize: "0.85rem",
          }}
        >
          Session window: {fmt(session.open)} – {fmt(session.close)}
        </div>
      )}
      {session?.isDemo && (
        <div
          style={{
            background: "rgba(115,39,245,0.12)",
            border: "1px solid rgba(115,39,245,0.3)",
            borderRadius: 8,
            padding: "8px 16px",
            color: "#a78bfa",
            fontSize: "0.8rem",
          }}
        >
          💡 Demo mode is active. Set DEMO_MODE=true in .env to keep the market
          always open for testing.
        </div>
      )}
    </div>
  );
}
