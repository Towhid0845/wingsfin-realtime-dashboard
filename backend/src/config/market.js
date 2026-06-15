"use strict";

/**
 * Market configuration.
 *
 * DEMO_MODE=true  → a rolling window of DEMO_SESSION_DURATION_MINUTES is used
 *                   so you can always see a live session regardless of clock time.
 * DEMO_MODE=false → real DSE hours in MARKET_TIMEZONE are respected.
 */

const DEMO_MODE = process.env.DEMO_MODE === "true";
const DEMO_DURATION_MS =
  parseInt(process.env.DEMO_SESSION_DURATION_MINUTES ?? "30", 10) * 60 * 1000;

const MARKET_OPEN_HOUR = parseInt(process.env.MARKET_OPEN_HOUR ?? "10", 10);
const MARKET_OPEN_MINUTE = parseInt(process.env.MARKET_OPEN_MINUTE ?? "0", 10);
const MARKET_CLOSE_HOUR = parseInt(process.env.MARKET_CLOSE_HOUR ?? "14", 10);
const MARKET_CLOSE_MINUTE = parseInt(process.env.MARKET_CLOSE_MINUTE ?? "30", 10);
const MARKET_TIMEZONE = process.env.MARKET_TIMEZONE ?? "Asia/Dhaka";

/** Returns the current market session { open: ms, close: ms, isOpen: bool } */
function getMarketSession() {
  const now = Date.now();

  if (DEMO_MODE) {
    // Rolling window: session started DEMO_DURATION_MS ago, closes now+small buffer
    // We anchor the session start to the nearest clean minute in the past so the
    // chart x-axis always starts on a round minute.
    const sessionStart = now - DEMO_DURATION_MS;
    const sessionClose = sessionStart + DEMO_DURATION_MS;
    return {
      open: sessionStart,
      close: sessionClose,
      isOpen: true,
      isDemo: true,
    };
  }

  // Real market hours ─ evaluate in MARKET_TIMEZONE
  const nowInTz = new Date(
    new Date().toLocaleString("en-US", { timeZone: MARKET_TIMEZONE })
  );

  const open = new Date(nowInTz);
  open.setHours(MARKET_OPEN_HOUR, MARKET_OPEN_MINUTE, 0, 0);

  const close = new Date(nowInTz);
  close.setHours(MARKET_CLOSE_HOUR, MARKET_CLOSE_MINUTE, 0, 0);

  // Weekday check: DSE is open Sun–Thu (0=Sun,1=Mon,...,4=Thu,5=Fri,6=Sat)
  const day = nowInTz.getDay();
  const isWeekday = day >= 0 && day <= 4;
  const isOpen =
    isWeekday &&
    nowInTz.getTime() >= open.getTime() &&
    nowInTz.getTime() < close.getTime();

  return {
    open: open.getTime(),
    close: close.getTime(),
    isOpen,
    isDemo: false,
  };
}

module.exports = {
  getMarketSession,
  DEMO_MODE,
  DEMO_DURATION_MS,
  MARKET_TIMEZONE,
};
