"use strict";

const { EventEmitter } = require("events");
const { insertIndexSnapshot, insertStockSnapshot } = require("../db/repository");
const { getMarketSession } = require("../config/market");

const MIN_MS = parseInt(process.env.SIM_MIN_INTERVAL_MS ?? "500", 10);
const MAX_MS = parseInt(process.env.SIM_MAX_INTERVAL_MS ?? "3000", 10);

const DSEX_YESTERDAY_CLOSE = 5200.0;
const GP_YESTERDAY_CLOSE = 238.88;

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min, max, dp = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(dp));
}

class DataSimulator extends EventEmitter {
  constructor() {
    super();
    this._indexValue = DSEX_YESTERDAY_CLOSE;
    this._stockValue = GP_YESTERDAY_CLOSE;
    this._indexTimer = null;
    this._stockTimer = null;
    this._running = false;
  }

  start() {
    if (this._running) return;
    this._running = true;
    console.log("[Simulator] Started");
    this._scheduleIndex();
    this._scheduleStock();
  }

  stop() {
    this._running = false;
    if (this._indexTimer) clearTimeout(this._indexTimer);
    if (this._stockTimer) clearTimeout(this._stockTimer);
    console.log("[Simulator] Stopped");
  }

  _scheduleIndex() {
    if (!this._running) return;
    const delay = randInt(MIN_MS, MAX_MS);
    this._indexTimer = setTimeout(async () => {
      const session = getMarketSession();
      if (!session.isOpen) {
        // Market closed – keep ticking but don't persist or emit
        this._scheduleIndex();
        return;
      }

      // Random walk: ±100 from yesterday close, clamped
      const delta = randFloat(-5, 5, 2);
      this._indexValue = parseFloat(
        Math.max(
          DSEX_YESTERDAY_CLOSE - 100,
          Math.min(DSEX_YESTERDAY_CLOSE + 100, this._indexValue + delta)
        ).toFixed(4)
      );

      const pct = parseFloat(
        (((this._indexValue - DSEX_YESTERDAY_CLOSE) / DSEX_YESTERDAY_CLOSE) * 100).toFixed(4)
      );

      const payload = {
        index_id: "DSEX",
        time: Date.now(),
        capital_value: this._indexValue,
        percentage_change_from_yesterday_close_value: pct,
        yesterday_close_value: DSEX_YESTERDAY_CLOSE,
      };

      try {
        await insertIndexSnapshot(payload);
        this.emit("index_update", payload);
      } catch (err) {
        console.error("[Simulator] index insert error:", err.message);
      }

      this._scheduleIndex();
    }, delay);
  }

  _scheduleStock() {
    if (!this._running) return;
    const delay = randInt(MIN_MS, MAX_MS);
    this._stockTimer = setTimeout(async () => {
      const session = getMarketSession();
      if (!session.isOpen) {
        this._scheduleStock();
        return;
      }

      // Random walk: ±1 from yesterday close, clamped
      const delta = randFloat(-0.1, 0.1, 2);
      this._stockValue = parseFloat(
        Math.max(
          GP_YESTERDAY_CLOSE - 1,
          Math.min(GP_YESTERDAY_CLOSE + 1, this._stockValue + delta)
        ).toFixed(4)
      );

      const payload = {
        trade_code: "GP",
        time: Date.now(),
        close_price: this._stockValue,
        yesterday_close_price: GP_YESTERDAY_CLOSE,
      };

      try {
        await insertStockSnapshot(payload);
        this.emit("stock_update", payload);
      } catch (err) {
        console.error("[Simulator] stock insert error:", err.message);
      }

      this._scheduleStock();
    }, delay);
  }
}

const simulator = new DataSimulator();
module.exports = simulator;
