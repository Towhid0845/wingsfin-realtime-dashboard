"use strict";

require("dotenv").config();
const http = require("http");
const { createApp } = require("./app");
const { dbConnection } = require("./db/pool");
const { seedAll } = require("./db/seeder");
const { setupWebSocket } = require("./websocket/wsServer");
const simulator = require("./simulators/dataSimulator");

const PORT = parseInt(process.env.PORT ?? "4000", 10);

async function main() {
  await dbConnection(); // Verify DB connection before starting server
  await seedAll(); // Seed DB with initial data for the current session

  const app = createApp();
  const server = http.createServer(app);
  setupWebSocket(server); // WebSocket shares the same HTTP server

  simulator.start(); // Start simulating live data updates 

  server.listen(PORT, () => {
    console.log(`[Server] Listening on http://0.0.0.0:${PORT}`);
    console.log(`[Server] WebSocket on ws://0.0.0.0:${PORT}/ws`);
  });

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
