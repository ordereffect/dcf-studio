import { describe, expect, it } from "vitest";
import { DEMO_COMPANY } from "./demo";
import { deriveAssumptions } from "./dcf/defaults";
import { dataBase, restoreAssumptions } from "./restore";

const before = { ...DEMO_COMPANY, sharesOutstanding: 142e6 };
const after = { ...DEMO_COMPANY, sharesOutstanding: 1136e6, lastSplit: { date: "2026-11-20", ratio: 8 } };

describe("restoreAssumptions", () => {
  it("takes the post-split share count in a model saved before the split", () => {
    const old = deriveAssumptions(before);
    const saved = { assumptions: { ...old, revenueGrowth: 0.3 }, base: dataBase(old), savedAt: "2026-11-01T00:00:00Z" };
    const { assumptions } = restoreAssumptions(after, saved);
    expect(assumptions.sharesOutstanding).toBe(1136e6);
    expect(assumptions.revenueGrowth).toBe(0.3); // your judgment stays
  });

  it("refreshes data in old saves that don't record their base", () => {
    const old = deriveAssumptions(before);
    const { assumptions } = restoreAssumptions(after, { assumptions: { ...old, targetMargin: 0.4 }, savedAt: "2026-11-01T00:00:00Z" });
    expect(assumptions.sharesOutstanding).toBe(1136e6);
    expect(assumptions.targetMargin).toBe(0.4);
  });

  it("keeps a value you typed yourself", () => {
    const old = deriveAssumptions(after);
    const saved = { assumptions: { ...old, beta: 1.7, cash: 5e9 }, base: dataBase(old), savedAt: "2026-11-22T00:00:00Z" };
    const fresh = { ...after, beta: 1.2 };
    const { assumptions } = restoreAssumptions(fresh, saved);
    expect(assumptions.beta).toBe(1.7);
    expect(assumptions.cash).toBe(5e9);
  });

  it("drops a share count you typed before a split", () => {
    const old = deriveAssumptions(before);
    const saved = { assumptions: { ...old, sharesOutstanding: 150e6 }, base: dataBase(old), savedAt: "2026-11-01T00:00:00Z" };
    expect(restoreAssumptions(after, saved).assumptions.sharesOutstanding).toBe(1136e6);
  });

  it("keeps a share count typed after the split", () => {
    const old = deriveAssumptions(after);
    const saved = { assumptions: { ...old, sharesOutstanding: 1200e6 }, base: dataBase(old), savedAt: "2026-11-24T00:00:00Z" };
    expect(restoreAssumptions(after, saved).assumptions.sharesOutstanding).toBe(1200e6);
  });
});
