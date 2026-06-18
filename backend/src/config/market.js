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
  // const nowInTz = new Date(
  //   new Date().toLocaleString("en-US", { timeZone: MARKET_TIMEZONE })
  // );

  // const open = new Date(nowInTz);
  // open.setHours(MARKET_OPEN_HOUR, MARKET_OPEN_MINUTE, 0, 0);

  // const close = new Date(nowInTz);
  // close.setHours(MARKET_CLOSE_HOUR, MARKET_CLOSE_MINUTE, 0, 0);

  // // Weekday check: DSE is open Sun–Thu (0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat)
  // const day = nowInTz.getDay();
  // const isWeekday = day >= 0 && day <= 4;
  // const isOpen =
  //   isWeekday &&
  //   nowInTz.getTime() >= open.getTime() &&
  //   nowInTz.getTime() < close.getTime();

  // return {
  //   open: open.getTime(),
  //   close: close.getTime(),
  //   isOpen,
  //   isDemo: false,
  // };
  
  // more reliable: use Intl.DateTimeFormat to get current time parts in Dhaka tz
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: MARKET_TIMEZONE,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date());
  const get = (type) => parseInt(parts.find(p => p.type === type).value, 10);

  const year = get("year");
  const month = get("month") - 1; // JS months are 0-indexed
  const day = get("day");
  const currentHour = get("hour");
  const currentMinute = get("minute");

  // build open/close as UTC timestamps for today in Dhaka tz
  // offset for Asia/Dhaka is UTC+6 (no DST)
  const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;

  const openUTC = Date.UTC(year, month, day, MARKET_OPEN_HOUR, MARKET_OPEN_MINUTE, 0) - DHAKA_OFFSET_MS;
  const closeUTC = Date.UTC(year, month, day, MARKET_CLOSE_HOUR, MARKET_CLOSE_MINUTE, 0) - DHAKA_OFFSET_MS;

  const dayOfWeek = new Date(openUTC).getUTCDay(); // 0=Sun ... 6=Sat
  // DSE open Sun(0) to Thu(4)
  const isWeekday = dayOfWeek >= 0 && dayOfWeek <= 4;
  const isOpen = isWeekday && now >= openUTC && now < closeUTC;

  return {
    open: openUTC,
    close: closeUTC,
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
