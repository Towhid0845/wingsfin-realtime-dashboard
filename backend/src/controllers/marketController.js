"use strict";

const { getMarketSession } = require("../config/market");

async function getStatus(req, res) {
  try {
    const session = getMarketSession();
    res.json({ success: true, data: session });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { getStatus };
