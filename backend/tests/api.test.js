"use strict";

/**
 * API integration tests.
 * DB calls are mocked – no real Postgres required in CI.
 */

process.env.DEMO_MODE = "true";
process.env.DEMO_SESSION_DURATION_MINUTES = "30";
process.env.NODE_ENV = "test";

jest.mock("../src/db/pool", () => ({
  query: jest.fn(),
  dbConnection: jest.fn().mockResolvedValue(true),
}));

jest.mock("../src/db/repository", () => ({
  getIndexHistory: jest.fn().mockResolvedValue([]),
  getLatestIndex: jest.fn().mockResolvedValue(null),
  getStockHistory: jest.fn().mockResolvedValue([]),
  getLatestStock: jest.fn().mockResolvedValue(null),
}));

const request = require("supertest");
const { createApp } = require("../src/app");

const app = createApp();

describe("GET /api/health", () => {
  it("returns 200 with status ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(typeof res.body.ts).toBe("number");
  });
});

describe("GET /api/market/status", () => {
  it("returns 200 with session info", async () => {
    const res = await request(app).get("/api/market/status");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.isOpen).toBe("boolean");
    expect(typeof res.body.data.open).toBe("number");
    expect(typeof res.body.data.close).toBe("number");
  });

  it("returns isDemo=true in demo mode", async () => {
    const res = await request(app).get("/api/market/status");
    expect(res.body.data.isDemo).toBe(true);
  });
});

describe("GET /api/index/:indexId/history", () => {
  it("returns 200 with series array", async () => {
    const res = await request(app).get("/api/index/DSEX/history");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.series)).toBe(true);
    expect(res.body.data.indexId).toBe("DSEX");
  });

  it("series contains minuteMs and value fields", async () => {
    const res = await request(app).get("/api/index/DSEX/history");
    const series = res.body.data.series;
    if (series.length > 0) {
      expect(series[0]).toHaveProperty("minuteMs");
      expect(series[0]).toHaveProperty("value");
    }
  });
});

describe("GET /api/index/:indexId/latest", () => {
  it("returns 200 with null data when no rows", async () => {
    const res = await request(app).get("/api/index/DSEX/latest");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeNull();
  });
});

describe("GET /api/stock/:tradeCode/history", () => {
  it("returns 200 with series array", async () => {
    const res = await request(app).get("/api/stock/GP/history");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.series)).toBe(true);
    expect(res.body.data.tradeCode).toBe("GP");
  });
});

describe("GET /api/stock/:tradeCode/latest", () => {
  it("returns 200 with null data when no rows", async () => {
    const res = await request(app).get("/api/stock/GP/latest");
    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });
});

describe("404 handling", () => {
  it("returns 404 for unknown routes", async () => {
    const res = await request(app).get("/api/nonexistent");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
