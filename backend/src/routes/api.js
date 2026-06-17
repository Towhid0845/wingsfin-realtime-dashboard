"use strict";

const { Router } = require("express");
const marketController = require("../controllers/marketController");
const indexController = require("../controllers/indexController");
const stockController = require("../controllers/stockController");

const router = Router();

router.get("/health", (req, res) => res.json({ status: "ok", ts: Date.now() }));
router.get("/market/status", marketController.getStatus);
router.get("/index/:indexId/history", indexController.getHistory);
router.get("/index/:indexId/latest", indexController.getLatest);
router.get("/stock/:tradeCode/history", stockController.getHistory);
router.get("/stock/:tradeCode/latest", stockController.getLatest);

module.exports = router;
