"use client";
import { useSyncExternalStore } from "react";

/**
 * The followed-stocks list. It lives in this browser's localStorage; a sync link
 * (/watchlist?add=AAPL,MSFT) carries it to another device or browser.
 */
const KEY = "dcf:watchlist";
const EVENT = "dcf:watchlist-change";
const EMPTY: string[] = [];

export const TICKER_RE = /^[A-Z0-9.\-^]{1,12}$/;

export function normalizeTickers(xs: Iterable<string>): string[] {
  const out: string[] = [];
  for (const x of xs) {
    const t = x.trim().toUpperCase();
    if (t && TICKER_RE.test(t) && !out.includes(t)) out.push(t);
  }
  return out;
}

let cacheRaw: string | null | undefined;
let cacheList: string[] = EMPTY;

function read(): string[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw === cacheRaw) return cacheList;
  cacheRaw = raw;
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    cacheList = Array.isArray(parsed) ? normalizeTickers(parsed.map(String)) : EMPTY;
  } catch {
    cacheList = EMPTY;
  }
  return cacheList;
}

function write(list: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage blocked: nothing we can keep */
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => e.key === KEY && cb();
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", onStorage); // other tabs
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useWatchlist(): string[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function follow(ticker: string) {
  const t = ticker.toUpperCase();
  const list = read();
  if (!list.includes(t)) write([...list, t]);
}

export function unfollow(ticker: string) {
  const t = ticker.toUpperCase();
  write(read().filter((x) => x !== t));
}

/** Add tickers to the list, keeping its order; returns how many were new. */
export function mergeIntoWatchlist(tickers: string[]): number {
  const list = read();
  const fresh = normalizeTickers(tickers).filter((t) => !list.includes(t));
  if (fresh.length) write([...list, ...fresh]);
  return fresh.length;
}

export function moveInWatchlist(ticker: string, dir: -1 | 1) {
  const list = [...read()];
  const i = list.indexOf(ticker);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  write(list);
}
