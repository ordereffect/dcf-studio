"use client";
import { useEffect, useState } from "react";
import type { LiveQuote } from "@/lib/data/live";

/**
 * Polls /api/live while the tab is visible. The interval grows with the list so a big
 * watchlist stays under Finnhub's free 60 calls a minute: about 50 symbols a minute, never faster than 15s.
 */
export function pollInterval(n: number) {
  return Math.max(15_000, Math.ceil((n * 60_000) / 50));
}

export function useLiveQuotes(tickers: string[]): Record<string, LiveQuote> {
  const [quotes, setQuotes] = useState<Record<string, LiveQuote>>({});
  const key = tickers.filter((t) => t && t !== "DEMO").join(",");

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const n = key.split(",").length;
    const load = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const r = await fetch(`/api/live?symbols=${encodeURIComponent(key)}`);
        if (!r.ok) return;
        const rows = (await r.json()) as LiveQuote[];
        if (!cancelled) setQuotes((prev) => ({ ...prev, ...Object.fromEntries(rows.filter((q) => q.price != null).map((q) => [q.ticker, q])) }));
      } catch {
        /* keep the last good prices */
      }
    };
    load();
    const id = setInterval(load, pollInterval(n));
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [key]);

  return quotes;
}
