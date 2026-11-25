"use client";
import type { CompanyData } from "@/lib/dcf/types";

const KEY = (t: string) => `dcf:fresh:${t.toUpperCase()}`;
const KEEP_MS = 24 * 3600_000;

/** The latest data a Refresh fetched for this ticker, if it's newer than a day. */
function lastFresh(ticker: string): CompanyData | null {
  try {
    const raw = localStorage.getItem(KEY(ticker));
    if (!raw) return null;
    const c = JSON.parse(raw) as CompanyData;
    if (Date.now() - Date.parse(c.fetchedAt) > KEEP_MS) {
      localStorage.removeItem(KEY(ticker));
      return null;
    }
    return c;
  } catch {
    return null;
  }
}

/**
 * Company data from /api/company. Normal loads may come from the shared CDN cache (up to an
 * hour or so old). `fresh` skips every cache and goes back to SEC and Yahoo; its result is kept
 * in this browser for a day so a reload doesn't fall back to the older cached copy.
 */
export async function fetchCompany(ticker: string, opts: { fresh?: boolean } = {}): Promise<CompanyData> {
  const url = `/api/company/${encodeURIComponent(ticker)}${opts.fresh ? `?fresh=${Date.now()}` : ""}`;
  const r = await fetch(url, opts.fresh ? { cache: "no-store" } : undefined);
  const j = await r.json();
  if (!r.ok) throw new Error(j.error ?? "Lookup failed");
  const c = j as CompanyData;
  if (opts.fresh) {
    try {
      localStorage.setItem(KEY(ticker), JSON.stringify(c));
    } catch {}
    return c;
  }
  const kept = lastFresh(ticker);
  return kept && kept.fetchedAt > c.fetchedAt ? kept : c;
}
