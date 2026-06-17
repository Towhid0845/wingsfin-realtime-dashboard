"use strict";

const { getIndexHistory, getLatestIndex } = require("../db/repository");
const { buildIndexSeries } = require("../services/chartService");
const { getMarketSession } = require("../config/market");


// Returns a bucketed 1-min series for the current session.
async function getHistory(req, res) {
  try {
    const { indexId } = req.params;
    const session = getMarketSession();
    const now = Date.now();

    const rows = await getIndexHistory(indexId, session.open, now);
    const series = buildIndexSeries(rows, session.open, session.close, now);

    // Grab yesterday close from latest row (or DB)
    const latest = rows[rows.length - 1] ?? null;
    const yesterdayClose = latest
      ? parseFloat(latest.yesterday_close_value)
      : null;

    res.json({
      success: true,
      data: {
        indexId,
        session,
        yesterdayClose,
        series,
      },
    });
  } catch (err) {
    console.error("[IndexController]", err);
    res.status(500).json({ success: false, error: err.message });
  }
}

async function getLatest(req, res) {
  try {
    const { indexId } = req.params;
    const row = await getLatestIndex(indexId);
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { getHistory, getLatest };
