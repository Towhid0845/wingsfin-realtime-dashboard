import React, { useRef, useEffect, useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
  registerables,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { buildColorArrays, formatTime, COLORS } from "../utils/chartUtils";

ChartJS.register(...registerables);


// Blinking dot plugin – animates the last valid data point.
const blinkingDotPlugin = {
  id: "blinkingDot",
  afterDraw(chart) {
    const ds = chart.data.datasets[0];
    if (!ds) return;
    const data = ds.data;
    // Find last non-null point
    let lastIdx = -1;
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i] !== null) { lastIdx = i; break; }
    }
    if (lastIdx < 0) return;

    const meta = chart.getDatasetMeta(0);
    const point = meta.data[lastIdx];
    if (!point) return;

    const { ctx } = chart;
    const color = ds.pointBackgroundColor?.[lastIdx] ?? COLORS.above;

    // Pulsing ring
    const pulse = (Date.now() % 1500) / 1500; // 0..1 cycle
    const ringRadius = 6 + pulse * 10;
    const ringAlpha = 1 - pulse;

    ctx.save();
    ctx.beginPath();
    ctx.arc(point.x, point.y, ringRadius, 0, Math.PI * 2);
    ctx.strokeStyle = color.replace(")", `, ${ringAlpha})`).replace("rgb", "rgba").replace("#", "");
    // Parse hex colour and add alpha
    ctx.strokeStyle = hexToRgba(color, ringAlpha);
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Solid centre dot
    ctx.beginPath();
    ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  },
};

function hexToRgba(hex, alpha) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

ChartJS.register(blinkingDotPlugin);

export default function RealTimeChart({ series, yesterdayClose, title, unit = "" }) {
  const chartRef = useRef(null);
  const animationRef = useRef(null);

  // Force re-render every 50ms for the blinking animation
  useEffect(() => {
    const tick = () => {
      if (chartRef.current) {
        chartRef.current.draw();
      }
      animationRef.current = requestAnimationFrame(tick);
    };
    animationRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationRef.current);
  }, []);

  const labels = useMemo(() => series.map((p) => formatTime(p.minuteMs)), [series]);
  const values = useMemo(() => series.map((p) => p.value), [series]);
  const colors = useMemo(
    () => buildColorArrays(series, yesterdayClose),
    [series, yesterdayClose]
  );

  const data = {
    labels,
    datasets: [
      {
        label: title,
        data: values,
        borderColor: (ctx) => {
          // Segment colouring: colour each line segment by the destination point colour
          const idx = ctx.p1DataIndex ?? 0;
          return colors[idx] ?? COLORS.above;
        },
        borderWidth: 2,
        pointBackgroundColor: colors,
        pointBorderColor: colors,
        pointRadius: (ctx) => {
          // Slightly larger for non-null points; last point handled by plugin
          const idx = ctx.dataIndex;
          if (idx === values.length - 1) return 0; // drawn by plugin
          return values[idx] !== null ? 3 : 0;
        },
        pointHoverRadius: 6,
        tension: 0.3,
        spanGaps: false, // Don't connect across nulls
        segment: {
          borderColor: (ctx) => {
            const idx = ctx.p1DataIndex ?? 0;
            return colors[idx] ?? COLORS.above;
          },
        },
      },
      // Yesterday close reference line
      {
        label: "Yesterday Close",
        data: series.map(() => yesterdayClose),
        borderColor: COLORS.reference,
        borderWidth: 1.5,
        borderDash: [6, 4],
        pointRadius: 0,
        pointHoverRadius: 0,
        tension: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false, // we handle animation via rAF for blink
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(15,23,42,0.92)",
        titleColor: "#94a3b8",
        bodyColor: "#e2e8f0",
        borderColor: "rgba(255,255,255,0.1)",
        borderWidth: 1,
        padding: 10,
        callbacks: {
          title: (items) => formatTime(series[items[0]?.dataIndex]?.minuteMs),
          label: (item) => {
            if (item.datasetIndex === 1) return `Ref: ${yesterdayClose}`;
            const v = item.raw;
            return v !== null ? `${title}: ${v?.toFixed(2)}${unit}` : "No data";
          },
          labelColor: (item) => ({
            borderColor: colors[item.dataIndex] ?? COLORS.above,
            backgroundColor: colors[item.dataIndex] ?? COLORS.above,
            borderRadius: 3,
          }),
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: COLORS.text,
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 10,
          font: { size: 11 },
        },
        grid: {
          color: COLORS.gridLine,
          drawTicks: false,
        },
        border: { color: "rgba(255,255,255,0.15)" },
      },
      y: {
        ticks: {
          color: COLORS.text,
          font: { size: 11 },
          callback: (v) => `${v?.toFixed(2)}${unit}`,
        },
        grid: {
          color: COLORS.gridLine,
          drawTicks: false,
        },
        border: { color: "rgba(255,255,255,0.15)" },
      },
    },
  };

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <Line ref={chartRef} data={data} options={options} />
    </div>
  );
}
