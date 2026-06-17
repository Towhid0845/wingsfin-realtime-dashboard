"use strict";

// DB connection pool and query helper using pg library

const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.POSTGRES_HOST ?? "localhost",
  port: parseInt(process.env.POSTGRES_PORT ?? "5432", 10),
  database: process.env.POSTGRES_DB ?? "wingsfin",
  user: process.env.POSTGRES_USER ?? "wingsfin",
  password: process.env.POSTGRES_PASSWORD ?? "wingsfin123",
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (err) => {
  console.error("[DB] Unexpected pool error:", err.message);
});

async function query(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

async function dbConnection() {
  const res = await query("SELECT NOW() AS now");
  console.log("[DB] Connected –", res.rows[0].now);
}

module.exports = { pool, query, dbConnection };
