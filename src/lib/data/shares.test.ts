import { describe, expect, it } from "vitest";
import { reconcileShares, splitFactorSince, splitLabel } from "./shares";

const sndkSplit = [{ date: "2026-11-20", ratio: 8 }];
const base = { marketCap: null, price: null, splits: sndkSplit, today: "2026-11-25" };

describe("splitFactorSince", () => {
  it("multiplies splits after the date only", () => {
    const splits = [
      { date: "2020-08-31", ratio: 4 },
      { date: "2024-06-10", ratio: 10 },
    ];
    expect(splitFactorSince(splits, "2019-01-01")).toBe(40);
    expect(splitFactorSince(splits, "2021-01-01")).toBe(10);
    expect(splitFactorSince(splits, "2024-06-10")).toBe(1);
  });
});

describe("reconcileShares", () => {
  it("adjusts a pre-split SEC count for the split (SanDisk 8-for-1)", () => {
    const r = reconcileShares({ ...base, yahooShares: null, secShares: 142.3e6, secAsOf: "2026-10-24" });
    expect(r.shares).toBeCloseTo(1138.4e6, -5);
    expect(r.source).toBe("sec");
    expect(r.adjustedFrom).toBe(142.3e6);
    expect(splitLabel(r.split!)).toBe("8-for-1");
  });

  it("fixes a Yahoo count that hasn't caught up with the split", () => {
    const r = reconcileShares({ ...base, yahooShares: 142.5e6, secShares: 142.3e6, secAsOf: "2026-10-24" });
    expect(r.shares).toBeCloseTo(1140e6, -5);
    expect(r.adjustedFrom).toBe(142.5e6);
  });

  it("leaves a Yahoo count that already reflects the split", () => {
    const r = reconcileShares({ ...base, yahooShares: 1138.3e6, secShares: 142.3e6, secAsOf: "2026-10-24" });
    expect(r.shares).toBe(1138.3e6);
    expect(r.adjustedFrom).toBeNull();
  });

  it("uses market cap / price when there is no SEC count", () => {
    const r = reconcileShares({ ...base, yahooShares: 142.5e6, secShares: null, secAsOf: null, marketCap: 76.9e9, price: 67.6 });
    expect(r.shares).toBeCloseTo(1140e6, -5);
  });

  it("does nothing without a recent split", () => {
    const r = reconcileShares({ ...base, splits: [{ date: "2020-08-31", ratio: 4 }], yahooShares: 15e9, secShares: 15.1e9, secAsOf: "2026-10-20" });
    expect(r.shares).toBe(15e9);
    expect(r.adjustedFrom).toBeNull();
  });

  it("handles reverse splits", () => {
    const r = reconcileShares({ ...base, splits: [{ date: "2026-09-01", ratio: 0.1 }], yahooShares: 500e6, secShares: 500e6, secAsOf: "2026-08-01" });
    expect(r.shares).toBeCloseTo(50e6, -3);
    expect(splitLabel(r.split!)).toBe("1-for-10");
  });
});
