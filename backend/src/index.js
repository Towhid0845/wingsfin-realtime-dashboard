"use strict";

require("dotenv").config();
const http = require("http");
const { createApp } = require("./app");
const { testConnection } = require("./db/pool");
const { seedAll } = require("./db/seeder");
const { setupWebSocket } = require("./websocket/wsServer");
const simulator = require("./simulators/dataSimulator");

const PORT = parseInt(process.env.PORT ?? "4000", 10);

async function main() {
  // 1. Verify DB
  await testConnection();

  // 2. Seed historical data
  await seedAll();

  // 3. HTTP + WS server
  const app = createApp();
  const server = http.createServer(app);
  setupWebSocket(server);

  // 4. Start simulator
  simulator.start();

  server.listen(PORT, () => {
    console.log(`[Server] Listening on http://0.0.0.0:${PORT}`);
    console.log(`[Server] WebSocket on ws://0.0.0.0:${PORT}/ws`);
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    console.log(`[Server] ${signal} received – shutting down`);
    simulator.stop();
    server.close(() => process.exit(0));
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  console.error("[Server] Fatal startup error:", err);
  process.exit(1);
});
