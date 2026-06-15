import React, { useState, useEffect } from "react";
import ChartPanel from "./components/ChartPanel";
import MarketClosed from "./components/MarketClosed";
import { useMarketData } from "./hooks/useMarketData";
import { startWebSocket, stopWebSocket } from "./services/websocket";
import "./index.css";

const CHART_OPTIONS = [
  { value: "index", label: "Index (DSEX)" },
  { value: "stock", label: "Stock (GP)" },
];

function LiveIndicator() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span className="live-dot" />
      <span style={{ fontSize: "0.75rem", color: "#22c55e", fontWeight: 600 }}>
        LIVE
      </span>
    </div>
  );
}

export default function App() {
  const [chartType, setChartType] = useState("index");
  const { series, yesterdayClose, session, loading, error, latestValue } =
    useMarketData(chartType);

  // Start WebSocket on mount
  useEffect(() => {
    startWebSocket();
    return () => stopWebSocket();
  }, []);

  const isMarketOpen = session?.isOpen ?? true; // optimistically open until we know

  const chartMeta =
    chartType === "index"
      ? { title: "DSEX Index", subtitle: "Dhaka Stock Exchange Index", unit: "" }
      : { title: "GP Stock", subtitle: "Grameenphone Ltd.", unit: " ৳" };

  return (
    <div className="app-root">
      {/* Top bar */}
      <header className="top-bar">
        <div className="brand">
          <span className="brand-icon">📈</span>
          <span className="brand-name">WingsFin</span>
          <span className="brand-sub">Real-Time Market Dashboard</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {isMarketOpen && <LiveIndicator />}
          {session?.isDemo && (
            <span
              style={{
                background: "rgba(115,39,245,0.2)",
                color: "#a78bfa",
                borderRadius: 6,
                padding: "2px 10px",
                fontSize: "0.72rem",
                fontWeight: 600,
                letterSpacing: "0.05em",
              }}
            >
              DEMO
            </span>
          )}
        </div>
      </header>

      <main className="main-content">
        {/* Chart type selector */}
        <div className="controls-row">
          <label
            htmlFor="chart-select"
            style={{ color: "#94a3b8", fontSize: "0.85rem", fontWeight: 500 }}
          >
            Chart Type
          </label>
          <select
            id="chart-select"
            className="chart-select"
            value={chartType}
            onChange={(e) => setChartType(e.target.value)}
          >
            {CHART_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Market status */}
        {!isMarketOpen && !loading ? (
          <MarketClosed session={session} />
        ) : (
          <ChartPanel
            title={chartMeta.title}
            subtitle={chartMeta.subtitle}
            series={series}
            yesterdayClose={yesterdayClose}
            loading={loading}
            error={error}
            latestValue={latestValue}
            unit={chartMeta.unit}
          />
        )}

        {/* Session info footer */}
        {session && (
          <div className="session-info">
            <span>
              Session:{" "}
              {new Date(session.open).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              –{" "}
              {new Date(session.close).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span style={{ color: "#334155" }}>•</span>
            <span>{series.length} minute(s) plotted</span>
          </div>
        )}
      </main>
    </div>
  );
}
