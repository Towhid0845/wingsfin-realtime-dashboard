"use strict";

describe("market config", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore env + clear module cache so config re-evaluates
    Object.assign(process.env, originalEnv);
    jest.resetModules();
  });

  it("returns isOpen=true and isDemo=true in DEMO_MODE", () => {
    process.env.DEMO_MODE = "true";
    process.env.DEMO_SESSION_DURATION_MINUTES = "30";
    const { getMarketSession } = require("../src/config/market");
    const session = getMarketSession();
    expect(session.isOpen).toBe(true);
    expect(session.isDemo).toBe(true);
  });

  it("demo session open < now < close", () => {
    process.env.DEMO_MODE = "true";
    process.env.DEMO_SESSION_DURATION_MINUTES = "30";
    const { getMarketSession } = require("../src/config/market");
    const now = Date.now();
    const session = getMarketSession();
    expect(session.open).toBeLessThan(now);
    expect(session.close).toBeGreaterThanOrEqual(now);
  });

  it("demo session duration matches configured minutes", () => {
    process.env.DEMO_MODE = "true";
    process.env.DEMO_SESSION_DURATION_MINUTES = "45";
    const { getMarketSession } = require("../src/config/market");
    const session = getMarketSession();
    const durationMs = session.close - session.open;
    expect(durationMs).toBe(45 * 60 * 1000);
  });

  it("non-demo mode returns isDemo=false", () => {
    process.env.DEMO_MODE = "false";
    const { getMarketSession } = require("../src/config/market");
    const session = getMarketSession();
    expect(session.isDemo).toBe(false);
  });
});
