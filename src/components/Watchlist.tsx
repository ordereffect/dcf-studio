"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Link2, RefreshCw, Star, X } from "lucide-react";
import { mergeIntoWatchlist, moveInWatchlist, normalizeTickers, unfollow, useWatchlist } from "@/lib/watchlist";
import { loadSavedModel } from "@/lib/store";
import { runDcf } from "@/lib/dcf/engine";
import { deriveAssumptions } from "@/lib/dcf/defaults";
import type { CompanyData } from "@/lib/dcf/types";
import { DEMO_COMPANY } from "@/lib/demo";
import type { WatchQuote } from "@/lib/data/quotes";
import { money, pct, signedPct } from "@/lib/format";
import { TickerSearch } from "./TickerSearch";
import { useLiveQuotes } from "@/lib/useLiveQuotes";
import type { LiveQuote } from "@/lib/data/live";
import { ThemeToggle } from "./ThemeToggle";

/** Base-case value per share: your saved model if you edited one here, else the defaults derived from filings. */
interface DcfCell {
  value: number | null;
  source: "yours" | "default";
  currency: string;
}

// Prices stream from /api/live; the slower fundamentals (targets, P/E, dates) refresh every 5 minutes.
const REFRESH_MS = 5 * 60_000;

const blankQuote = (ticker: string): WatchQuote => ({
  ticker,
  name: null,
  currency: null,
  price: null,
  changePct: null,
  preMarketChangePct: null,
  postMarketChangePct: null,
  trailingPE: null,
  forwardPE: null,
  targetMeanPrice: null,
  analystCount: null,
  earningsDate: null,
  dividendDate: null,
  exDividendDate: null,
  forwardDividendYield: null,
});

/** The offline sample has no live quote; show its fixed price so upside still reads. */
const DEMO_QUOTE: WatchQuote = {
  ticker: "DEMO",
  name: DEMO_COMPANY.name,
  currency: DEMO_COMPANY.currency,
  price: DEMO_COMPANY.price,
  changePct: null,
  preMarketChangePct: null,
  postMarketChangePct: null,
  trailingPE: null,
  forwardPE: null,
  targetMeanPrice: null,
  analystCount: null,
  earningsDate: null,
  dividendDate: null,
  exDividendDate: null,
  forwardDividendYield: null,
};

async function computeDcf(ticker: string): Promise<DcfCell> {
  const saved = loadSavedModel(ticker);
  if (ticker === "DEMO") {
    const a = saved ? { ...deriveAssumptions(DEMO_COMPANY), ...saved.assumptions } : deriveAssumptions(DEMO_COMPANY);
    return { value: runDcf(a).valuePerShare, source: saved ? "yours" : "default", currency: "USD" };
  }
  const r = await fetch(`/api/company/${encodeURIComponent(ticker)}`);
  if (!r.ok) {
    // No data to derive defaults from; a saved model still stands on its own.
    if (saved) return { value: runDcf(saved.assumptions).valuePerShare, source: "yours", currency: "USD" };
    return { value: null, source: "default", currency: "USD" };
  }
  const c = (await r.json()) as CompanyData;
  const defaults = deriveAssumptions(c);
  const a = saved ? { ...defaults, ...saved.assumptions } : defaults;
  const v = c.historicals.length || saved ? runDcf(a).valuePerShare : null;
  return { value: v != null && Number.isFinite(v) ? v : null, source: saved ? "yours" : "default", currency: c.currency };
}

type ColKey =
  | "ticker"
  | "price"
  | "changePct"
  | "trailingPE"
  | "preMarketChangePct"
  | "targetMeanPrice"
  | "dcf"
  | "postMarketChangePct"
  | "earningsDate"
  | "dividendDate"
  | "exDividendDate"
  | "forwardPE"
  | "forwardDividendYield";

interface Row {
  ticker: string;
  q?: WatchQuote;
  live?: LiveQuote;
  dcf?: DcfCell | "loading" | "error";
}

const COLS: { key: ColKey; label: string; title: string; num?: boolean }[] = [
  { key: "ticker", label: "Symbol", title: "Ticker and company" },
  { key: "price", label: "Last Price", title: "Last regular-session price", num: true },
  { key: "changePct", label: "Change %", title: "Change today, regular session", num: true },
  { key: "trailingPE", label: "P/E (TTM)", title: "Price over the last twelve months of earnings per share", num: true },
  { key: "preMarketChangePct", label: "Pre-Mkt Chg %", title: "Pre-market change vs. the previous close", num: true },
  { key: "targetMeanPrice", label: "1y Target Est", title: "Mean analyst 12-month price target", num: true },
  {
    key: "dcf",
    label: "DCF Value",
    title:
      "This app's base-case intrinsic value per share (5-year explicit forecast + terminal value), with upside vs. last price. A dot means it uses the model you edited in this browser.",
    num: true,
  },
  { key: "postMarketChangePct", label: "Post-Mkt Chg %", title: "After-hours change vs. the regular close", num: true },
  { key: "earningsDate", label: "Earnings Date", title: "Next expected earnings report", num: true },
  { key: "dividendDate", label: "Div Payment", title: "Next (or latest) dividend payment date", num: true },
  { key: "exDividendDate", label: "Ex-Div Date", title: "Buy before this date to receive the dividend", num: true },
  { key: "forwardPE", label: "Forward P/E", title: "Price over next fiscal year's expected EPS", num: true },
  { key: "forwardDividendYield", label: "Fwd Div Yield", title: "Forward annual dividend over price", num: true },
];

function sortValue(r: Row, key: ColKey): number | string | null {
  if (key === "ticker") return r.ticker;
  if (key === "dcf") {
    const v = typeof r.dcf === "object" ? r.dcf.value : null;
    const p = r.q?.price;
    return v != null && p ? v / p - 1 : v; // sort by upside when we can
  }
  const v = r.q?.[key];
  return v == null ? null : (v as number | string);
}

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return "–";
  const d = new Date(`${iso}T12:00:00Z`);
  const sameYear = d.getUTCFullYear() === new Date().getUTCFullYear();
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: sameYear ? undefined : "numeric", timeZone: "UTC" });
};

const daysFromToday = (iso: string | null | undefined) =>
  iso ? Math.round((new Date(`${iso}T12:00:00Z`).getTime() - Date.now()) / 86_400_000) : NaN;

function Chg({ x }: { x: number | null | undefined }) {
  if (x == null || !Number.isFinite(x)) return <span className="text-faint">–</span>;
  return <span className={x >= 0 ? "text-up" : "text-down"}>{signedPct(x, 2)}</span>;
}

export function Watchlist() {
  const list = useWatchlist();
  const live = useLiveQuotes(list);
  const [quotes, setQuotes] = useState<Record<string, WatchQuote>>({});
  const [dcf, setDcf] = useState<Record<string, DcfCell | "loading" | "error">>({});
  const [loading, setLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [sort, setSort] = useState<{ key: ColKey; dir: 1 | -1 } | null>(null);
  const [incoming, setIncoming] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const listKey = list.join(",");

  useEffect(() => setMounted(true), []);

  // A sync link (?add=AAPL,MSFT) offers to merge its tickers into this browser's list.
  useEffect(() => {
    const add = new URLSearchParams(window.location.search).get("add");
    if (add) setIncoming(normalizeTickers(add.split(",")));
  }, []);
  const newFromLink = incoming.filter((t) => !list.includes(t));

  const refresh = useCallback(async () => {
    const symbols = listKey.split(",").filter((t) => t && t !== "DEMO");
    if (!symbols.length) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/quotes?symbols=${encodeURIComponent(symbols.join(","))}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Quotes unavailable");
      setQuotes((prev) => ({ ...prev, ...Object.fromEntries((j as WatchQuote[]).map((q) => [q.ticker, q])) }));
      setQuoteError("");
      setUpdatedAt(new Date());
    } catch (e) {
      setQuoteError(e instanceof Error ? e.message : "Quotes unavailable");
    } finally {
      setLoading(false);
    }
  }, [listKey]);

  // Quotes on load, whenever the list changes, and every minute while the tab is visible.
  useEffect(() => {
    refresh();
    const id = setInterval(() => document.visibilityState === "visible" && refresh(), REFRESH_MS);
    return () => clearInterval(id);
  }, [refresh]);

  // DCF values, a few at a time; each needs the company's filings.
  const started = useRef(new Set<string>());
  useEffect(() => {
    const todo = list.filter((t) => !started.current.has(t));
    if (!todo.length) return;
    todo.forEach((t) => started.current.add(t));
    setDcf((prev) => ({ ...prev, ...Object.fromEntries(todo.map((t) => [t, "loading" as const])) }));
    let i = 0;
    const worker = async () => {
      while (i < todo.length) {
        const t = todo[i++];
        try {
          const cell = await computeDcf(t);
          setDcf((prev) => ({ ...prev, [t]: cell }));
        } catch {
          setDcf((prev) => ({ ...prev, [t]: "error" }));
        }
      }
    };
    Array.from({ length: Math.min(3, todo.length) }, worker);
  }, [list]);

  const rows: Row[] = useMemo(() => {
    const base = list.map((t) => {
      const l = live[t];
      const q0 = t === "DEMO" ? DEMO_QUOTE : quotes[t];
      // The live feed wins for price and day change; everything else comes from the fuller Yahoo quote.
      const q = l?.price != null ? ({ ...(q0 ?? blankQuote(t)), price: l.price, changePct: l.changePct ?? q0?.changePct ?? null, error: undefined } as WatchQuote) : q0;
      return { ticker: t, q, live: l, dcf: dcf[t] };
    });
    if (!sort) return base;
    return [...base].sort((a, b) => {
      const x = sortValue(a, sort.key);
      const y = sortValue(b, sort.key);
      if (x == null && y == null) return 0;
      if (x == null) return 1; // blanks always last
      if (y == null) return -1;
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });
  }, [list, quotes, live, dcf, sort]);

  const syncLink = mounted && list.length ? `${window.location.origin}/watchlist?add=${list.join(",")}` : "";
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(syncLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link", syncLink);
    }
  };

  const clickSort = (key: ColKey) =>
    setSort((s) => (s?.key !== key ? { key, dir: key === "ticker" ? 1 : -1 } : s.dir === -1 && key !== "ticker" ? { key, dir: 1 } : s.dir === 1 && key === "ticker" ? { key, dir: -1 } : null));

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-rule bg-paper">
        <div className="mx-auto flex max-w-[1440px] items-center gap-4 px-4 py-2.5 sm:px-6">
          <nav aria-label="Breadcrumb" className="flex shrink-0 items-center gap-2 text-[13px] text-brass">
            <Link href="/" className="hover:underline">
              DCF Studio
            </Link>
            <span className="text-faint">/</span>
            <span aria-current="page">Watchlist</span>
          </nav>
          <div className="ml-auto w-full max-w-xs">
            <TickerSearch />
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 pb-24 pt-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[clamp(22px,3.2vw,32px)] font-bold leading-[1.1] tracking-[-0.02em]">Watchlist</h1>
            <p className="mt-1.5 text-[13px] text-muted">
              {list.length} {list.length === 1 ? "stock" : "stocks"}
              {updatedAt && (
                <>
                  {" · "}details at {updatedAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  {Object.values(live).some((q) => q.source === "finnhub") ? ", prices live" : ", prices delayed"}
                </>
              )}
            </p>
          </div>
          {list.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={refresh}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-[3px] border border-rule px-3 py-1.5 text-[12.5px] text-muted hover:text-ink disabled:opacity-60"
              >
                <RefreshCw className={clsx("size-3.5", loading && "animate-spin")} aria-hidden />
                Refresh
              </button>
              <button
                onClick={copyLink}
                title="Open this link on another device or browser to bring your list there"
                className="inline-flex items-center gap-1.5 rounded-[3px] border border-rule px-3 py-1.5 text-[12.5px] text-muted hover:text-ink"
              >
                <Link2 className="size-3.5" aria-hidden />
                {copied ? "Link copied" : "Copy sync link"}
              </button>
            </div>
          )}
        </div>

        {newFromLink.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-[3px] border border-brass bg-brass-soft px-4 py-3 text-[13px]">
            <span className="min-w-0 flex-1">
              This link carries {newFromLink.length} {newFromLink.length === 1 ? "stock" : "stocks"} you don&apos;t follow here yet:{" "}
              <span className="num font-semibold">{newFromLink.join(", ")}</span>
            </span>
            <button
              onClick={() => {
                mergeIntoWatchlist(newFromLink);
                setIncoming([]);
                window.history.replaceState(null, "", "/watchlist");
              }}
              className="rounded-[3px] bg-brass px-3 py-1.5 font-semibold text-[#111]"
            >
              Add {newFromLink.length === 1 ? "it" : "them"}
            </button>
            <button
              onClick={() => {
                setIncoming([]);
                window.history.replaceState(null, "", "/watchlist");
              }}
              className="text-muted hover:text-ink"
            >
              Dismiss
            </button>
          </div>
        )}

        <AddTickers />

        {quoteError && <p className="mt-4 text-[13px] text-down">Couldn&apos;t refresh quotes: {quoteError}</p>}

        {mounted && list.length === 0 ? (
          <div className="mt-10 rounded-[3px] border border-dashed border-rule px-6 py-12 text-center">
            <Star className="mx-auto size-6 text-brass" aria-hidden />
            <p className="mt-3 text-[15px] font-semibold">No stocks yet</p>
            <p className="mt-1 text-[13px] text-muted">
              Press <span className="text-brass">Follow</span> on any stock page, or add tickers above.
            </p>
          </div>
        ) : (
          <div className="relative mt-5 overflow-x-auto rounded-[3px] border border-rule">
            <table className="w-full min-w-[1280px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-rule bg-surface text-left">
                  {COLS.map((c) => (
                    <th
                      key={c.key}
                      scope="col"
                      aria-sort={sort?.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : undefined}
                      className={clsx(
                        "whitespace-nowrap px-3 py-2 font-semibold text-muted",
                        c.num && "text-right",
                        c.key === "ticker" && "sticky left-0 z-10 bg-surface",
                        c.key === "dcf" && "text-brass",
                      )}
                    >
                      <button onClick={() => clickSort(c.key)} title={c.title} className="inline-flex items-center gap-1 hover:text-ink">
                        {c.label}
                        {sort?.key === c.key &&
                          (sort.dir === 1 ? <ArrowUp className="size-3" aria-hidden /> : <ArrowDown className="size-3" aria-hidden />)}
                      </button>
                    </th>
                  ))}
                  <th scope="col" className="px-2 py-2">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="num">
                {rows.map((r, i) => (
                  <WatchRow key={r.ticker} r={r} first={i === 0} last={i === rows.length - 1} reorder={!sort} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 max-w-3xl text-[11.5px] leading-relaxed text-faint">
          Prices are real-time from Finnhub where available (green dot), otherwise delayed from Yahoo (grey dot). Analyst targets,
          P/E, pre/post-market and dates come from Yahoo Finance. DCF value is this app&apos;s base case, from your saved model where you
          edited one in this browser (marked with a dot), otherwise from the defaults derived from filings. Your list is saved in this browser;
          use <span className="text-muted">Copy sync link</span> to bring it to another device.
        </p>
      </main>
    </div>
  );
}

function AddTickers() {
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  return (
    <form
      className="mt-5 flex max-w-md items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const tickers = normalizeTickers(text.split(/[\s,;]+/));
        if (!tickers.length) return;
        const added = mergeIntoWatchlist(tickers);
        setNote(added ? `Added ${added}.` : "Already on your list.");
        setText("");
        setTimeout(() => setNote(""), 2500);
      }}
    >
      <label htmlFor="add-tickers" className="sr-only">
        Add tickers
      </label>
      <input
        id="add-tickers"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add tickers, e.g. AAPL, MSFT"
        autoCapitalize="characters"
        autoComplete="off"
        className="num min-w-0 flex-1 rounded-[3px] border border-rule bg-surface px-3 py-1.5 text-[13px] outline-none placeholder:text-faint focus-visible:border-brass"
      />
      <button type="submit" className="rounded-[3px] bg-brass px-3 py-1.5 text-[12.5px] font-semibold text-[#111]">
        Add
      </button>
      {note && <span className="text-[12px] text-muted">{note}</span>}
    </form>
  );
}

function WatchRow({ r, first, last, reorder }: { r: Row; first: boolean; last: boolean; reorder: boolean }) {
  const q = r.q;
  const ccy = q?.currency ?? "USD";
  const d = r.dcf;
  const dcfVal = typeof d === "object" ? d.value : null;
  const upside = dcfVal != null && q?.price ? dcfVal / q.price - 1 : NaN;
  const targetUp = q?.targetMeanPrice && q.price ? q.targetMeanPrice / q.price - 1 : NaN;
  const earnIn = daysFromToday(q?.earningsDate);
  const cell = "whitespace-nowrap px-3 py-2.5 text-right";

  return (
    <tr className="group border-b border-rule last:border-b-0 hover:bg-surface">
      <th scope="row" className="sticky left-0 z-10 bg-paper px-3 py-2.5 text-left font-normal group-hover:bg-surface">
        <Link href={`/t/${r.ticker}`} className="block max-w-[130px] sm:max-w-[200px]">
          <span className="font-bold text-brass hover:underline">{r.ticker}</span>
          <span className="block truncate font-sans text-[11.5px] text-faint">{q?.name ?? (r.ticker === "DEMO" ? "Sample company" : " ")}</span>
        </Link>
      </th>
      <td className={clsx(cell, "text-ink")}>
        {q?.error ? <span className="text-faint" title={q.error}>n/a</span> : money(q?.price, ccy)}
        {r.live && (
          <span
            className={clsx("ml-1.5 inline-block size-1.5 rounded-full align-middle", r.live.source === "finnhub" ? "bg-up" : "bg-faint")}
            title={r.live.source === "finnhub" ? "Real-time (Finnhub)" : "Delayed (Yahoo)"}
          />
        )}
      </td>
      <td className={cell}>
        <Chg x={q?.changePct} />
      </td>
      <td className={cell}>{q?.trailingPE != null ? q.trailingPE.toFixed(1) : <span className="text-faint">–</span>}</td>
      <td className={cell}>
        <Chg x={q?.preMarketChangePct} />
      </td>
      <td className={cell} title={q?.analystCount ? `${q.analystCount} analysts` : undefined}>
        {money(q?.targetMeanPrice, ccy)}
        {Number.isFinite(targetUp) && <span className={clsx("ml-1.5 text-[11.5px]", targetUp >= 0 ? "text-up" : "text-down")}>{signedPct(targetUp)}</span>}
      </td>
      <td className={clsx(cell, "bg-brass-soft/40")}>
        {d === "loading" || d === undefined ? (
          <span className="inline-block h-3 w-16 animate-pulse rounded-[2px] bg-sunk align-middle" aria-label="Loading" />
        ) : d === "error" || dcfVal == null ? (
          <span className="text-faint" title="No financials to value this stock">–</span>
        ) : (
          <Link href={`/t/${r.ticker}`} className="hover:underline">
            {d.source === "yours" && <span className="mr-1 text-brass" title="Your edited model">•</span>}
            <span className="font-semibold text-ink">{money(dcfVal, d.currency)}</span>
            {Number.isFinite(upside) && (
              <span className={clsx("ml-1.5 text-[11.5px]", upside >= 0 ? "text-up" : "text-down")}>{signedPct(upside)}</span>
            )}
          </Link>
        )}
      </td>
      <td className={cell}>
        <Chg x={q?.postMarketChangePct} />
      </td>
      <td className={clsx(cell, earnIn >= 0 && earnIn <= 7 ? "text-brass" : "text-ink")} title={earnIn >= 0 && earnIn <= 7 ? "Within a week" : undefined}>
        {fmtDate(q?.earningsDate)}
      </td>
      <td className={cell}>{fmtDate(q?.dividendDate)}</td>
      <td className={cell}>{fmtDate(q?.exDividendDate)}</td>
      <td className={cell}>{q?.forwardPE != null ? q.forwardPE.toFixed(1) : <span className="text-faint">–</span>}</td>
      <td className={cell}>{q?.forwardDividendYield ? pct(q.forwardDividendYield, 2) : <span className="text-faint">–</span>}</td>
      <td className="whitespace-nowrap px-2 py-2.5 text-right">
        <div className="flex items-center justify-end gap-0.5 text-faint">
          {reorder && (
            <>
              <button onClick={() => moveInWatchlist(r.ticker, -1)} disabled={first} aria-label={`Move ${r.ticker} up`} className="p-1 hover:text-ink disabled:opacity-30">
                <ChevronUp className="size-3.5" aria-hidden />
              </button>
              <button onClick={() => moveInWatchlist(r.ticker, 1)} disabled={last} aria-label={`Move ${r.ticker} down`} className="p-1 hover:text-ink disabled:opacity-30">
                <ChevronDown className="size-3.5" aria-hidden />
              </button>
            </>
          )}
          <button onClick={() => unfollow(r.ticker)} aria-label={`Remove ${r.ticker}`} title="Unfollow" className="p-1 hover:text-down">
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
      </td>
    </tr>
  );
}
