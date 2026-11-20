import { describe, expect, it } from "vitest";
import { pollInterval } from "./useLiveQuotes";

describe("pollInterval", () => {
  it("never polls faster than 15s and stays under ~50 symbols a minute", () => {
    expect(pollInterval(1)).toBe(15_000);
    expect(pollInterval(12)).toBe(15_000);
    expect(pollInterval(30)).toBe(36_000);
    for (const n of [1, 10, 25, 40, 60]) expect((n * 60_000) / pollInterval(n)).toBeLessThanOrEqual(50);
  });
});
