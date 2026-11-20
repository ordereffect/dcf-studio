"use client";
import { useEffect, useState } from "react";
import clsx from "clsx";
import type { LiveQuote } from "@/lib/data/live";
import { signedPct } from "@/lib/format";

const ago = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
};

/** Where a price came from and how fresh it is: a pulsing dot for Finnhub's real-time feed. */
export function LiveBadge({ q, showChange = true }: { q: LiveQuote; showChange?: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);
  const realtime = q.source === "finnhub";
  const fresh = q.time != null && now - q.time < 5 * 60_000;
  return (
    <div
      className="num flex items-center gap-1.5 text-[11.5px] text-faint"
      title={realtime ? "Real-time last trade from Finnhub" : "Yahoo Finance quote, may be delayed"}
    >
      <span className={clsx("size-1.5 rounded-full", realtime && fresh ? "animate-pulse bg-up" : "bg-faint")} aria-hidden />
      <span>{realtime ? (fresh ? "LIVE" : "LAST") : "DELAYED"}</span>
      {showChange && q.changePct != null && (
        <span className={q.changePct >= 0 ? "text-up" : "text-down"}>{signedPct(q.changePct, 2)}</span>
      )}
      {q.time != null && <span>· {ago(now - q.time)}</span>}
    </div>
  );
}
