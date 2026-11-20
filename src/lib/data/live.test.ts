import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const yahooQuote = vi.fn();
vi.mock("yahoo-finance2", () => ({
  default: class {
    quote = yahooQuote;
  },
}));

const fhOk = (c: number, dp: number) =>
  new Response(JSON.stringify({ c, d: 1, dp, pc: c - 1, t: 1_763_000_000 }), { status: 200 });

describe("fetchLiveQuotes", () => {
  beforeEach(() => {
    vi.resetModules();
    yahooQuote.mockReset();
    yahooQuote.mockResolvedValue([
      { symbol: "BRK-B", regularMarketPrice: 480, regularMarketChange: 2, regularMarketChangePercent: 0.5, regularMarketPreviousClose: 478 },
    ]);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("uses Finnhub when a key is set and falls back to Yahoo for symbols it can't answer", async () => {
    vi.stubEnv("FINNHUB_API_KEY", "k");
    const fetchMock = vi.fn(async (url: string) =>
      url.includes("AAPL") ? fhOk(230, 1.5) : new Response(JSON.stringify({ c: 0, d: null, dp: null }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { fetchLiveQuotes } = await import("./live");
    const [a, b] = await fetchLiveQuotes(["AAPL", "BRK.B"]);
    expect(a).toMatchObject({ ticker: "AAPL", price: 230, changePct: 0.015, source: "finnhub" });
    expect(b).toMatchObject({ ticker: "BRK.B", price: 480, changePct: 0.005, source: "yahoo" });
    expect(yahooQuote).toHaveBeenCalledWith(["BRK-B"], { return: "array" });
    // The key travels in a header, never in the URL.
    expect(String(fetchMock.mock.calls[0][0])).not.toContain("token");
  });

  it("stops calling Finnhub for a minute after a 429", async () => {
    vi.stubEnv("FINNHUB_API_KEY", "k");
    const fetchMock = vi.fn(async () => new Response("", { status: 429 }));
    vi.stubGlobal("fetch", fetchMock);
    yahooQuote.mockResolvedValue([{ symbol: "MSFT", regularMarketPrice: 400, regularMarketChangePercent: -1 }]);
    const { fetchLiveQuotes } = await import("./live");
    const [m] = await fetchLiveQuotes(["MSFT"]);
    expect(m.source).toBe("yahoo");
    yahooQuote.mockResolvedValue([{ symbol: "NVDA", regularMarketPrice: 150 }]);
    await fetchLiveQuotes(["NVDA"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("goes straight to Yahoo without a key", async () => {
    vi.stubEnv("FINNHUB_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    yahooQuote.mockResolvedValue([{ symbol: "KO", regularMarketPrice: 63 }]);
    const { fetchLiveQuotes } = await import("./live");
    const [k] = await fetchLiveQuotes(["KO"]);
    expect(k).toMatchObject({ price: 63, source: "yahoo" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
