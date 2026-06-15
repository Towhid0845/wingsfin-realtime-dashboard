"use strict";

/**
 * WebSocket server.
 *
 * Each client connects and sends:
 *   { type: "subscribe", channel: "index" | "stock" }
 *
 * Server pushes:
 *   { type: "index_update", payload: { ... } }
 *   { type: "stock_update", payload: { ... } }
 *   { type: "market_status", payload: { isOpen, open, close, isDemo } }
 *   { type: "heartbeat" }
 */

const { WebSocketServer, WebSocket } = require("ws");
const { getMarketSession } = require("../config/market");
const simulator = require("../simulators/dataSimulator");

const HEARTBEAT_INTERVAL_MS = 15_000;
const MARKET_STATUS_INTERVAL_MS = 10_000;

function send(ws, data) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function broadcast(wss, data) {
  wss.clients.forEach((client) => send(client, data));
}

function setupWebSocket(server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  // ── Simulator → broadcast ────────────────────────────────────────
  simulator.on("index_update", (payload) => {
    broadcast(wss, { type: "index_update", payload });
  });

  simulator.on("stock_update", (payload) => {
    broadcast(wss, { type: "stock_update", payload });
  });

  // ── Periodic market-status push ──────────────────────────────────
  const marketInterval = setInterval(() => {
    broadcast(wss, { type: "market_status", payload: getMarketSession() });
  }, MARKET_STATUS_INTERVAL_MS);

  // ── Per-client setup ─────────────────────────────────────────────
  wss.on("connection", (ws, req) => {
    console.log(`[WS] Client connected from ${req.socket.remoteAddress}`);

    // Send market status immediately on connect
    send(ws, { type: "market_status", payload: getMarketSession() });

    // Heartbeat to keep connection alive through proxies
    ws.isAlive = true;
    ws.on("pong", () => { ws.isAlive = true; });

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        // Currently we accept subscribe messages but don't do per-channel
        // filtering – all clients get all updates (efficient for this use case).
        if (msg.type === "subscribe") {
          console.log(`[WS] Client subscribed to ${msg.channel}`);
        }
      } catch (_) {
        // ignore malformed frames
      }
    });

    ws.on("close", () => {
      console.log("[WS] Client disconnected");
    });

    ws.on("error", (err) => {
      console.error("[WS] Client error:", err.message);
    });
  });

  // ── Heartbeat ping ───────────────────────────────────────────────
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, HEARTBEAT_INTERVAL_MS);

  wss.on("close", () => {
    clearInterval(pingInterval);
    clearInterval(marketInterval);
  });

  console.log("[WS] WebSocket server ready at /ws");
  return wss;
}

module.exports = { setupWebSocket };
