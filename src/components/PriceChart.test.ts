import { describe, expect, it } from "vitest";
import { tradingViewSymbol } from "./PriceChart";

describe("tradingViewSymbol", () => {
  it("maps Yahoo exchange names to TradingView prefixes", () => {
    expect(tradingViewSymbol("AAPL", "NasdaqGS")).toBe("NASDAQ:AAPL");
    expect(tradingViewSymbol("KO", "NYSE")).toBe("NYSE:KO");
    expect(tradingViewSymbol("SPY", "NYSEArca")).toBe("AMEX:SPY");
    expect(tradingViewSymbol("BRK.B", undefined)).toBe("BRK.B");
  });
});
