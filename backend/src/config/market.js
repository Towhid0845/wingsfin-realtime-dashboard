"use strict";

// demo mode: session is always open and lasts for DEMO_SESSION_DURATION_MINUTES minutes from server start
// set DEMO_MODE=false to use real DSE hours (10am-2:30pm)
const DEMO_MODE = process.env.DEMO_MODE === "true";
const DEMO_DURATION_MS =
  parseInt(process.env.DEMO_SESSION_DURATION_MINUTES ?? "30", 10) * 60 * 1000;

const MARKET_OPEN_HOUR = parseInt(process.env.MARKET_OPEN_HOUR ?? "10", 10);
const MARKET_OPEN_MINUTE = parseInt(process.env.MARKET_OPEN_MINUTE ?? "0", 10);
const MARKET_CLOSE_HOUR = parseInt(process.env.MARKET_CLOSE_HOUR ?? "14", 10);
const MARKET_CLOSE_MINUTE = parseInt(process.env.MARKET_CLOSE_MINUTE ?? "30", 10);
const MARKET_TIMEZONE = process.env.MARKET_TIMEZONE ?? "Asia/Dhaka";

function getMarketSession() {
  const now = Date.now();  

  if (DEMO_MODE) {
    const sessionStart = now - DEMO_DURATION_MS;
    const sessionClose = sessionStart + DEMO_DURATION_MS;
    return {
      open: sessionStart,
      close: sessionClose,
      isOpen: true,
      isDemo: true,
    };
  }

  // Calculate market open/close times in the specified timezone
  const nowInTz = new Date(
    new Date().toLocaleString("en-US", { timeZone: MARKET_TIMEZONE })
  );

  const open = new Date(nowInTz);
  open.setHours(MARKET_OPEN_HOUR, MARKET_OPEN_MINUTE, 0, 0);

  const close = new Date(nowInTz);
  close.setHours(MARKET_CLOSE_HOUR, MARKET_CLOSE_MINUTE, 0, 0);

  // Weekday check: DSE is open Sun–Thu (0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat)
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
