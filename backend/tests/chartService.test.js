"use strict";

const { buildMinuteSeries, floorToMinute } = require("../src/services/chartService");

describe("chartService", () => {
  const BASE = Math.floor(1_700_000_000_000 / 60_000) * 60_000; // aligned to minute // arbitrary epoch ms aligned to minute
  const MIN = 60_000;

  const sessionOpen = floorToMinute(BASE);
  const sessionClose = sessionOpen + 60 * MIN; // 60 min session
  const now = sessionOpen + 15 * MIN; // 15 min in

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
      // All minutes from 0..15 should be 100
      expect(series.every((s) => s.value === 100)).toBe(true);
    });

    it("picks latest tick when multiple arrive in the same minute", () => {
      const ticks = [
        { time: sessionOpen + 10_000, value: 50 },
        { time: sessionOpen + 50_000, value: 75 }, // latest in minute 0
      ];
      const series = buildMinuteSeries(ticks, sessionOpen, sessionClose, now);
      expect(series[0].value).toBe(75);
    });

    it("values are null before first known tick", () => {
      const ticks = [{ time: sessionOpen + 5 * MIN + 100, value: 200 }];
      const series = buildMinuteSeries(ticks, sessionOpen, sessionClose, now);
      // First 5 minutes have no data → null
      expect(series[0].value).toBeNull();
      expect(series[4].value).toBeNull();
      // Minute 5 and beyond carry forward 200
      expect(series[5].value).toBe(200);
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
        { time: sessionOpen + 30_000, value: 10 },   // minute 0
        { time: sessionOpen + MIN + 5_000, value: 20 }, // minute 1
        { time: sessionOpen + 3 * MIN + 1_000, value: 30 }, // minute 3 (minute 2 has no tick)
      ];
      const series = buildMinuteSeries(ticks, sessionOpen, sessionClose, now);
      expect(series[0].value).toBe(10);
      expect(series[1].value).toBe(20);
      expect(series[2].value).toBe(20); // carry-forward
      expect(series[3].value).toBe(30);
    });
  });
});
