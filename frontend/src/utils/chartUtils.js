export const COLORS = {
  above: "#7327F5",
  below: "#F52738",
  equal: "#EE27F5",
  reference: "#888888",
  gridLine: "rgba(255,255,255,0.08)",
  text: "#e2e8f0",
};


// Returns the point colour based on value vs yesterday's close.
export function getPointColor(value, yesterdayClose) {
  if (value === null || yesterdayClose === null) return COLORS.equal;
  if (value > yesterdayClose) return COLORS.above;
  if (value < yesterdayClose) return COLORS.below;
  return COLORS.equal;
}

// Builds per-point background and border colour arrays for Chart.js.
export function buildColorArrays(series, yesterdayClose) {
  return series.map((pt) => getPointColor(pt.value, yesterdayClose));
}

// Format epoch ms → "HH:MM" for x-axis labels.
export function formatTime(ms) {
  if (!ms) return "";
  const d = new Date(ms);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// Merge an incoming live tick into the existing series (mutates in place).
// Follows the rules:
//   - Floor the tick's time to the current minute.
//   - If the minute already exists, overwrite with the new value (latest wins).
//   - If a new minute has started, append it.
//   - Carry-forward for any skipped minutes (shouldn't happen with live ticks but defensive).
//   - Returns the updated series (same reference).
 
export function mergeLiveTick(series, tickMs, value, sessionOpenMs) {
  const MIN = 60_000;
  const tickMinute = Math.floor(tickMs / MIN) * MIN;

  if (series.length === 0) {
    series.push({ minuteMs: tickMinute, value });
    return series;
  }

  const last = series[series.length - 1];

  if (tickMinute === last.minuteMs) {
    // Same minute – latest value wins
    last.value = value;
  } else if (tickMinute > last.minuteMs) {
    // Advance to new minute(s), carry-forward as needed
    for (let m = last.minuteMs + MIN; m <= tickMinute; m += MIN) {
      series.push({ minuteMs: m, value: m === tickMinute ? value : last.value });
    }
  }
  // Ignore ticks from the past (shouldn't happen normally)
  return series;
}
