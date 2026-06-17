import React from "react";
import RealTimeChart from "./RealTimeChart";
import { COLORS } from "../utils/chartUtils";

function LatestBadge({ value, yesterdayClose, unit }) {
  if (value === null || value === undefined) return null;
  const color =
    value > yesterdayClose
      ? COLORS.above
      : value < yesterdayClose
      ? COLORS.below
      : COLORS.equal;
  const sign = value > yesterdayClose ? "▲" : value < yesterdayClose ? "▼" : "●";
  const diff = (value - yesterdayClose).toFixed(2);

  return (
    <div style={{ textAlign: "right" }}>
      <div
        style={{
          fontSize: "1.6rem",
          fontWeight: 700,
          color,
          lineHeight: 1,
        }}
      >
        {value.toFixed(2)}
        {unit}
      </div>
      <div style={{ fontSize: "0.8rem", color, marginTop: 2 }}>
        {sign} {diff > 0 ? "+" : ""}{diff}{unit}
      </div>
    </div>
  );
}

export default function ChartPanel({
  title,
  subtitle,
  series,
  yesterdayClose,
  loading,
  error,
  latestValue,
  unit = "",
}) {
  return (
    <div
      style={{
        background: "rgba(15,23,42,0.7)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: "20px 24px",
        backdropFilter: "blur(12px)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "#f1f5f9" }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 2 }}>
              {subtitle}
            </div>
          )}
          {yesterdayClose !== null && (
            <div style={{ fontSize: "0.75rem", color: "#475569", marginTop: 3 }}>
              Yesterday's Close:{" "}
              <span style={{ color: COLORS.reference }}>
                {yesterdayClose?.toFixed(2)}{unit}
              </span>
            </div>
          )}
        </div>
        <LatestBadge
          value={latestValue}
          yesterdayClose={yesterdayClose}
          unit={unit}
        />
      </div>

      {/* Chart area */}
      <div style={{ height: 320, position: "relative" }}>
        {loading && (
          <div style={overlayStyle}>
            <Spinner />
            <span style={{ color: "#64748b", fontSize: "0.85rem" }}>
              Loading market data…
            </span>
          </div>
        )}
        {!loading && error && ( 
          <div style={overlayStyle}>
            <span style={{ color: COLORS.below }}>⚠ {error}</span>
          </div>
        )}
        {!loading && !error && (
          <RealTimeChart
            series={series}
            yesterdayClose={yesterdayClose}
            title={title}
            unit={unit}
          />
        )}
      </div>

      {/* Legend row */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {[
          { color: COLORS.above, label: "Above close" },
          { color: COLORS.below, label: "Below close" },
          { color: COLORS.equal, label: "At close" },
          { color: COLORS.reference, label: "Yesterday close", dashed: true },
        ].map(({ color, label, dashed }) => (
          <div
            key={label}
            style={{ display: "flex", alignItems: "center", gap: 5 }}
          >
            <svg width={24} height={4}>
              <line
                x1={0}
                y1={2}
                x2={24}
                y2={2}
                stroke={color}
                strokeWidth={2}
                strokeDasharray={dashed ? "4 3" : undefined}
              />
            </svg>
            <span style={{ fontSize: "0.72rem", color: "#64748b" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const overlayStyle = {
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
};

function Spinner() {
  return (
    <div
      style={{
        width: 28,
        height: 28,
        border: "3px solid rgba(255,255,255,0.1)",
        borderTop: `3px solid ${COLORS.above}`,
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }}
    />
  );
}
