"use strict";

const { buildMinuteSeries, floorToMinute } = require("../src/services/chartService");

describe("chartService", () => {
  const BASE = Math.floor(1_700_000_000_000 / 60_000) * 60_000;
  const MIN = 60_000;

  const sessionOpen = floorToMinute(BASE);
  const sessionClose = sessionOpen + 60 * MIN;
  const now = sessionOpen + 15 * MIN;

  describe("floorToMinute", () => {
    it("floors to the start of the minute", () => {
      expect(floorToMinute(BASE + 45_000)).toBe(floorToMinute(BASE));
    });
    it("returns the same value if already on a minute boundary", () => {
      const aligned = Math.floor(BASE / MIN) * MIN;
      expect(floorToMinute(aligned)).toBe(aligned);
    });
  });

  describe("buildMinuteSeries", () => {
    it("returns entries for each minute from open to current minute", () => {
      const series = buildMinuteSeries([], sessionOpen, sessionClose, now);
      expect(series).toHaveLength(16); // minutes 0..15 inclusive
      expect(series[0].minuteMs).toBe(sessionOpen);
    });

    it("carries forward last known value when no tick in a minute", () => {
      const ticks = [{ time: sessionOpen + 500, value: 100 }];
      const series = buildMinuteSeries(ticks, sessionOpen, sessionClose, now);
      expect(series.every((s) => s.value === 100)).toBe(true);
    });

    it("picks latest tick when multiple arrive in the same minute", () => {
      const ticks = [
        { time: sessionOpen + 10_000, value: 50 },
        { time: sessionOpen + 50_000, value: 75 },
      ];
      const series = buildMinuteSeries(ticks, sessionOpen, sessionClose, now);
      expect(series[0].value).toBe(75);
    });

    it("starts from first minute that has data, no leading nulls", () => {
      const ticks = [{ time: sessionOpen + 5 * MIN + 100, value: 200 }];
      const series = buildMinuteSeries(ticks, sessionOpen, sessionClose, now);
      // series starts at minute 5, not minute 0 — no leading nulls
      expect(series[0].minuteMs).toBe(sessionOpen + 5 * MIN);
      expect(series[0].value).toBe(200);
      // carry forward from minute 5 onwards
      expect(series[1].value).toBe(200);
      expect(series[2].value).toBe(200);
      // total entries: minutes 5..15 = 11
      expect(series).toHaveLength(11);
    });

    it("does not include future minutes beyond now", () => {
      const series = buildMinuteSeries([], sessionOpen, sessionClose, now);
      const lastMinuteMs = series[series.length - 1].minuteMs;
      expect(lastMinuteMs).toBeLessThanOrEqual(floorToMinute(now));
    });

    it("handles empty ticks gracefully", () => {
      const series = buildMinuteSeries([], sessionOpen, sessionClose, now);
      expect(series.every((s) => s.value === null)).toBe(true);
    });

    it("updates value correctly across minute boundaries", () => {
      const ticks = [
        { time: sessionOpen + 30_000, value: 10 },
        { time: sessionOpen + MIN + 5_000, value: 20 },
        { time: sessionOpen + 3 * MIN + 1_000, value: 30 },
      ];
      const series = buildMinuteSeries(ticks, sessionOpen, sessionClose, now);
      expect(series[0].value).toBe(10);
      expect(series[1].value).toBe(20);
      expect(series[2].value).toBe(20); // carry-forward
      expect(series[3].value).toBe(30);
    });
  });
});