"use strict";

/**
 * Seeds historical data from the start of the current market session
 * up to (now - 1 minute) with intentionally non-uniform intervals to
 * simulate real-world data arrival patterns.
 */

const { query } = require("./pool");
const { getMarketSession } = require("../config/market");

const DSEX_YESTERDAY_CLOSE = 5200.0;
const GP_YESTERDAY_CLOSE = 238.88;

/** Random integer between min and max (inclusive) */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Random float with dp decimal places */
function randFloat(min, max, dp = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(dp));
}

/**
 * Generate a realistic random walk.
 * Returns an array of { time, value } with non-uniform time gaps.
 */
function generateRandomWalk(startTime, endTime, startValue, maxDelta) {
  const points = [];
  let t = startTime;
  let value = startValue;

  while (t < endTime) {
    // Non-uniform gap: between 5s and 90s (real-world: ticks come irregularly)
    const gapMs = randInt(5_000, 90_000);
    t += gapMs;
    if (t >= endTime) break;

    // Random delta (can be positive or negative)
    const delta = randFloat(-maxDelta, maxDelta, 2);
    value = parseFloat((value + delta).toFixed(4));

    points.push({ time: t, value });
  }

  return points;
}

async function seedIndexData(indexId = "DSEX", yesterdayClose = DSEX_YESTERDAY_CLOSE) {
  const session = getMarketSession();
  const seedEnd = Date.now() - 60_000; // up to 1 min ago

  if (session.open >= seedEnd) {
    console.log("[Seeder] Session too new – skipping index seed");
    return 0;
  }

  // Clear existing seed data for this session window
  await query(
    `DELETE FROM index_snapshots
     WHERE index_id = $1 AND time >= $2 AND time <= $3`,
    [indexId, session.open, seedEnd]
  );

  const points = generateRandomWalk(session.open, seedEnd, yesterdayClose, 100);

  if (points.length === 0) return 0;

  const values = points.map((p, i) => {
    const pct = parseFloat(
      (((p.value - yesterdayClose) / yesterdayClose) * 100).toFixed(4)
    );
    return `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`;
  });

  const flat = points.flatMap((p) => [
    indexId,
    p.time,
    p.value,
    parseFloat((((p.value - yesterdayClose) / yesterdayClose) * 100).toFixed(4)),
    yesterdayClose,
  ]);

  await query(
    `INSERT INTO index_snapshots
       (index_id, time, capital_value, percentage_change_from_yesterday_close, yesterday_close_value)
     VALUES ${values.join(",")}`,
    flat
  );

  console.log(`[Seeder] Seeded ${points.length} index rows for ${indexId}`);
  return points.length;
}

async function seedStockData(tradeCode = "GP", yesterdayClose = GP_YESTERDAY_CLOSE) {
  const session = getMarketSession();
  const seedEnd = Date.now() - 60_000;

  if (session.open >= seedEnd) {
    console.log("[Seeder] Session too new – skipping stock seed");
    return 0;
  }

  await query(
    `DELETE FROM stock_snapshots
     WHERE trade_code = $1 AND time >= $2 AND time <= $3`,
    [tradeCode, session.open, seedEnd]
  );

  const points = generateRandomWalk(session.open, seedEnd, yesterdayClose, 1);

  if (points.length === 0) return 0;

  const values = points.map((p, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`);
  const flat = points.flatMap((p) => [tradeCode, p.time, p.value, yesterdayClose]);

  await query(
    `INSERT INTO stock_snapshots
       (trade_code, time, close_price, yesterday_close_price)
     VALUES ${values.join(",")}`,
    flat
  );

  console.log(`[Seeder] Seeded ${points.length} stock rows for ${tradeCode}`);
  return points.length;
}

async function seedAll() {
  console.log("[Seeder] Starting historical data seed...");
  await Promise.all([seedIndexData(), seedStockData()]);
  console.log("[Seeder] Seed complete.");
}

module.exports = { seedAll, seedIndexData, seedStockData };
