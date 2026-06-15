import { getPointColor, buildColorArrays, formatTime, mergeLiveTick, COLORS } from "../../src/utils/chartUtils";

describe("chartUtils", () => {
  describe("getPointColor", () => {
    it("returns above colour when value > yesterdayClose", () => {
      expect(getPointColor(100, 90)).toBe(COLORS.above);
    });
    it("returns below colour when value < yesterdayClose", () => {
      expect(getPointColor(80, 90)).toBe(COLORS.below);
    });
    it("returns equal colour when value === yesterdayClose", () => {
      expect(getPointColor(90, 90)).toBe(COLORS.equal);
    });
    it("returns equal colour for null value", () => {
      expect(getPointColor(null, 90)).toBe(COLORS.equal);
    });
  });

  describe("buildColorArrays", () => {
    it("returns array matching series length", () => {
      const series = [
        { minuteMs: 1000, value: 100 },
        { minuteMs: 2000, value: 80 },
        { minuteMs: 3000, value: 90 },
      ];
      const colors = buildColorArrays(series, 90);
      expect(colors).toHaveLength(3);
      expect(colors[0]).toBe(COLORS.above);
      expect(colors[1]).toBe(COLORS.below);
      expect(colors[2]).toBe(COLORS.equal);
    });
  });

  describe("formatTime", () => {
    it("returns HH:MM formatted string", () => {
      // Fixed epoch for noon UTC
      const ms = new Date("2024-01-15T12:30:00Z").getTime();
      const result = formatTime(ms);
      // Just check it looks like HH:MM
      expect(result).toMatch(/^\d{2}:\d{2}$/);
    });
    it("returns empty string for falsy input", () => {
      expect(formatTime(0)).toBe("");
      expect(formatTime(null)).toBe("");
    });
  });

  describe("mergeLiveTick", () => {
    const MIN = 60_000;
    const base = Math.floor(Date.now() / MIN) * MIN;

    it("appends first tick to empty series", () => {
      const series = [];
      mergeLiveTick(series, base + 1000, 100, base);
      expect(series).toHaveLength(1);
      expect(series[0].value).toBe(100);
    });

    it("overwrites value in same minute with latest", () => {
      const series = [{ minuteMs: base, value: 100 }];
      mergeLiveTick(series, base + 5000, 110, base);
      expect(series).toHaveLength(1);
      expect(series[0].value).toBe(110);
    });

    it("appends new minute and carries forward", () => {
      const series = [{ minuteMs: base, value: 100 }];
      mergeLiveTick(series, base + MIN + 1000, 120, base);
      expect(series).toHaveLength(2);
      expect(series[1].value).toBe(120);
    });

    it("fills skipped minutes with carry-forward values", () => {
      const series = [{ minuteMs: base, value: 50 }];
      mergeLiveTick(series, base + 3 * MIN + 1000, 70, base);
      // Should have 4 entries: base, base+1, base+2, base+3
      expect(series).toHaveLength(4);
      expect(series[1].value).toBe(50); // carry-forward
      expect(series[2].value).toBe(50); // carry-forward
      expect(series[3].value).toBe(70); // new tick
    });
  });
});
