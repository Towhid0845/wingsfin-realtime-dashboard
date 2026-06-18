"use strict";

// It strips everything below the minute boundary.
function floorToMinute(ms) {
  return Math.floor(ms / 60_000) * 60_000;
}

// Build minute series from DB rows
function buildMinuteSeries(ticks, sessionOpenMs, sessionCloseMs, nowMs) {
  const openMinute = floorToMinute(sessionOpenMs);
  const closeMinute = floorToMinute(sessionCloseMs);
  const currentMinute = floorToMinute(nowMs);
  const lastMinute = Math.min(closeMinute, currentMinute);

  const buckets = new Map();
  for (const tick of ticks) {
    // const ms = typeof tick.time === "bigint" ? Number(tick.time) : Number(tick.time);
    const ms = Number(tick.time);
    const minute = floorToMinute(ms);
    const val = tick.value ?? tick.capital_value ?? tick.close_price;
    // Latest tick in bucket wins
    if (!buckets.has(minute) || ms > buckets.get(minute).ms) {
      buckets.set(minute, { ms, value: parseFloat(val) });
    }
  }

  // Walk minute-by-minute, carrying forward last known value
  const firstTickMinute = ticks.length > 0
    ? floorToMinute(Number(ticks[0].time))
    : openMinute;
  const startMinute = Math.max(openMinute, firstTickMinute);
  const series = [];
  let lastKnown = null;

  for (let m = startMinute; m <= lastMinute; m += 60_000) {
    if (buckets.has(m)) {
      lastKnown = buckets.get(m).value;
    }
    series.push({ minuteMs: m, value: lastKnown });
  }

  return series;
}

// Build index series from DB rows.
function buildIndexSeries(rows, sessionOpenMs, sessionCloseMs, nowMs) {
  const ticks = rows.map((r) => ({
    time: Number(r.time),
    value: parseFloat(r.capital_value),
  }));
  return buildMinuteSeries(ticks, sessionOpenMs, sessionCloseMs, nowMs);
}

// Build stock series from DB rows
function buildStockSeries(rows, sessionOpenMs, sessionCloseMs, nowMs) {
  const ticks = rows.map((r) => ({
    time: Number(r.time),
    value: parseFloat(r.close_price),
  }));
  return buildMinuteSeries(ticks, sessionOpenMs, sessionCloseMs, nowMs);
}

module.exports = { buildMinuteSeries, buildIndexSeries, buildStockSeries, floorToMinute };
