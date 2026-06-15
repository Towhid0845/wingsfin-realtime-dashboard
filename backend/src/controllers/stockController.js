"use strict";

const { getStockHistory, getLatestStock } = require("../db/repository");
const { buildStockSeries } = require("../services/chartService");
const { getMarketSession } = require("../config/market");

/**
 * GET /api/stock/:tradeCode/history
 */
async function getHistory(req, res) {
  try {
    const { tradeCode } = req.params;
    const session = getMarketSession();
    const now = Date.now();

    const rows = await getStockHistory(tradeCode, session.open, now);
    const series = buildStockSeries(rows, session.open, session.close, now);

    const latest = rows[rows.length - 1] ?? null;
    const yesterdayClose = latest
      ? parseFloat(latest.yesterday_close_price)
      : null;

    res.json({
      success: true,
      data: {
        tradeCode,
        session,
        yesterdayClose,
        series,
      },
    });
  } catch (err) {
    console.error("[StockController]", err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/stock/:tradeCode/latest
 */
async function getLatest(req, res) {
  try {
    const { tradeCode } = req.params;
    const row = await getLatestStock(tradeCode);
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { getHistory, getLatest };
