"use strict";

const { query } = require("./pool");

// ─── Index ────────────────────────────────────────────────────────────────────

/**
 * Fetch all index snapshots in [fromMs, toMs] ordered by time ASC.
 */
async function getIndexHistory(indexId, fromMs, toMs) {
  const res = await query(
    `SELECT time, capital_value, percentage_change_from_yesterday_close, yesterday_close_value
     FROM index_snapshots
     WHERE index_id = $1 AND time >= $2 AND time <= $3
     ORDER BY time ASC`,
    [indexId, fromMs, toMs]
  );
  return res.rows;
}

/**
 * Get the latest index snapshot.
 */
async function getLatestIndex(indexId) {
  const res = await query(
    `SELECT time, capital_value, percentage_change_from_yesterday_close, yesterday_close_value
     FROM index_snapshots
     WHERE index_id = $1
     ORDER BY time DESC
     LIMIT 1`,
    [indexId]
  );
  return res.rows[0] ?? null;
}

/**
 * Insert one index snapshot.
 */
async function insertIndexSnapshot(row) {
  await query(
    `INSERT INTO index_snapshots
       (index_id, time, capital_value, percentage_change_from_yesterday_close, yesterday_close_value)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      row.index_id,
      row.time,
      row.capital_value,
      row.percentage_change_from_yesterday_close_value,
      row.yesterday_close_value,
    ]
  );
}

// ─── Stock ────────────────────────────────────────────────────────────────────

/**
 * Fetch all stock snapshots in [fromMs, toMs] ordered by time ASC.
 */
async function getStockHistory(tradeCode, fromMs, toMs) {
  const res = await query(
    `SELECT time, close_price, yesterday_close_price
     FROM stock_snapshots
     WHERE trade_code = $1 AND time >= $2 AND time <= $3
     ORDER BY time ASC`,
    [tradeCode, fromMs, toMs]
  );
  return res.rows;
}

/**
 * Get the latest stock snapshot.
 */
async function getLatestStock(tradeCode) {
  const res = await query(
    `SELECT time, close_price, yesterday_close_price
     FROM stock_snapshots
     WHERE trade_code = $1
     ORDER BY time DESC
     LIMIT 1`,
    [tradeCode]
  );
  return res.rows[0] ?? null;
}

/**
 * Insert one stock snapshot.
 */
async function insertStockSnapshot(row) {
  await query(
    `INSERT INTO stock_snapshots
       (trade_code, time, close_price, yesterday_close_price)
     VALUES ($1, $2, $3, $4)`,
    [row.trade_code, row.time, row.close_price, row.yesterday_close_price]
  );
}

module.exports = {
  getIndexHistory,
  getLatestIndex,
  insertIndexSnapshot,
  getStockHistory,
  getLatestStock,
  insertStockSnapshot,
};
