"use client";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { AlertTriangle, RefreshCw, RotateCcw } from "lucide-react";
import { useModel, useUi } from "@/lib/store";
import { runDcf } from "@/lib/dcf/engine";
import { monteCarlo, scenarioValues } from "@/lib/dcf/analysis";
import type { CompanyData } from "@/lib/dcf/types";
import { DEMO_COMPANY } from "@/lib/demo";
import { big, money, mult, pct, signedPct } from "@/lib/format";
import { terms } from "@/lib/learn";
import { isFinancial } from "@/lib/dcf/defaults";
import { TickerSearch } from "./TickerSearch";
import { ThemeToggle } from "./ThemeToggle";
import { InfoTip } from "./InfoTip";
import { Tour, TourButton } from "./Tour";
import { ValueRail } from "./ValueRail";
import { AssumptionsPanel } from "./AssumptionsPanel";
import { Stat } from "./ui";
import { FollowButton, WatchlistLink } from "./FollowButton";
import { LiveBadge } from "./LiveBadge";
import { PriceChart } from "./PriceChart";
import { useLiveQuotes } from "@/lib/useLiveQuotes";
import { fetchCompany } from "@/lib/fetchCompany";
import { DATA_KEYS, type DataKey } from "@/lib/restore";
import type { Assumptions } from "@/lib/dcf/types";
import { ModelTab } from "./tabs/ModelTab";
import { ScenariosTab } from "./tabs/ScenariosTab";
import { SensitivityTab } from "./tabs/SensitivityTab";
import { ImpliedTab } from "./tabs/ImpliedTab";
import { HistoryTab } from "./tabs/HistoryTab";
import { OwnershipTab } from "./tabs/OwnershipTab";
import { BriefTab } from "./tabs/BriefTab";

const TABS = [
  { id: "model", label: "Model" },
  { id: "scenarios", label: "Scenarios" },
  { id: "sensitivity", label: "Sensitivity" },
  { id: "implied", label: "Market-implied" },
  { id: "history", label: "History" },
  { id: "ownership", label: "Ownership" },
  { id: "brief", label: "Brief for Claude" },
] as const;


function blankCompany(ticker: string): CompanyData {
  return {
    ticker,
    name: ticker,
    currency: "USD",
    price: null,
    sharesOutstanding: 100e6,
    marketCap: null,
    beta: 1,
    historicals: [],
    riskFreeRate: null,
    sources: ["Manual inputs"],
    warnings: ["Blank model: set revenue, margins, balance sheet and price by hand."],
    fetchedAt: new Date().toISOString(),
  };
}

export function Workbench({ ticker }: { ticker: string }) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const load = useModel((s) => s.load);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    if (ticker === "DEMO") {
      load(DEMO_COMPANY);
      setStatus("ready");
      return;
    }
    fetchCompany(ticker)
      .then((c) => {
        if (cancelled) return;
        load(c);
        setStatus("ready");
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setError(e.message);
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [ticker, load]);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-rule bg-paper">
        <div className="mx-auto flex max-w-[1440px] items-center gap-4 px-4 py-2.5 sm:px-6">
          <nav aria-label="Breadcrumb" className="flex shrink-0 items-center gap-2 text-[13px] text-brass">
            <Link href="/" className="hover:underline">
              DCF Studio
            </Link>
            <span className="text-faint">/</span>
            <span aria-current="page">{ticker}</span>
          </nav>
          <div className="ml-auto w-full max-w-xs">
            <TickerSearch />
          </div>
          <WatchlistLink />
          {status === "ready" && <TourButton />}
          <ThemeToggle />
        </div>
      </header>

      {status === "loading" && <Loading ticker={ticker} />}
      {status === "error" && (
        <main className="mx-auto max-w-xl px-4 py-24">
          <h1 className="text-2xl font-semibold">Couldn&apos;t load {ticker}</h1>
          <p className="mt-2 text-muted">{error}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => {
                load(blankCompany(ticker));
                setStatus("ready");
              }}
              className="rounded-[3px] bg-brass px-4 py-2 text-[14px] font-semibold text-[#111]"
            >
              Model {ticker} by hand
            </button>
            <Link href="/t/DEMO" className="rounded-[3px] border border-rule px-4 py-2 text-[14px] text-muted hover:text-ink">
              Open the sample company
            </Link>
          </div>
        </main>
      )}
      {status === "ready" && <Ready />}
    </div>
  );
}

function Loading({ ticker }: { ticker: string }) {
  return (
    <main className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6">
      <p className="text-[15px] text-muted">Reading {ticker}&apos;s filings and market data…</p>
      <div className="mt-6 h-[124px] animate-pulse rounded-[3px] bg-surface" />
    </main>
  );
}

function Ready() {
  const c = useModel((s) => s.company)!;
  const liveA = useModel((s) => s.assumptions)!;
  const price = useModel((s) => s.price);
  const setPrice = useModel((s) => s.setPrice);
  const setLivePrice = useModel((s) => s.setLivePrice);
  const backToMarketPrice = useModel((s) => s.backToMarketPrice);
  const priceManual = useModel((s) => s.priceManual);
  const refresh = useRefresh(c);
  const canRefresh = c.ticker !== "DEMO" && c.sources[0] !== "Manual inputs";
  const live = useLiveQuotes([c.ticker])[c.ticker];
  useEffect(() => {
    if (live?.price) setLivePrice(live.price);
  }, [live, setLivePrice]);
  const scenarios = useModel((s) => s.scenarios);
  const reset = useModel((s) => s.reset);
  const tab = useUi((s) => s.tab);
  const setTab = useUi((s) => s.setTab);
  const tourOpen = useUi((s) => s.tourOpen);

  // Terminal-style shortcuts: number keys switch views when you're not typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (useUi.getState().tourOpen) return;
      if (e.metaKey || e.ctrlKey || e.altKey || el.closest("input, textarea, select, [contenteditable]")) return;
      const i = Number(e.key) - 1;
      if (i >= 0 && i < TABS.length) setTab(TABS[i].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setTab]);

  // Heavy views (simulation, grids) follow the deferred value so dragging stays smooth.
  const a = useDeferredValue(liveA);
  const v = useMemo(() => runDcf(liveA), [liveA]);
  const sv = useMemo(() => scenarioValues(a, scenarios), [a, scenarios]);
  const mc = useMemo(() => monteCarlo(a, 600), [a]);

  const lastFy = c.historicals.at(-1)?.fiscalYear ?? new Date().getFullYear() - 1;
  const upside = price ? v.valuePerShare / price - 1 : NaN;
  const bear = sv.rows.find((r) => r.scenario.id === "bear")?.value ?? NaN;
  const bull = sv.rows.find((r) => r.scenario.id === "bull")?.value ?? NaN;
  const T = terms(liveA.approach);
  const financial = isFinancial(c);
  const approachNote = financial
    ? T.eq
      ? `${c.industry} company, so it is valued on equity: cash flow to shareholders at the cost of equity. Its debt and cash are part of the business, not financing.`
      : `${c.industry} company valued as a firm. Its debt and cash are part of the business, so the Equity approach under Assumptions usually fits better.`
    : null;
  const warnings = [...(approachNote ? [approachNote] : []), ...c.warnings, ...v.warnings];
  const mcap = price ? price * liveA.sharesOutstanding : null;
  const bookEquity = liveA.bookEquity ?? c.historicals.at(-1)?.equity ?? null;

  return (
    <main className="mx-auto max-w-[1440px] px-4 pb-24 sm:px-6">
      {tourOpen && <Tour />}
      {/* Identity + headline value */}
      <section className="grid gap-6 pt-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-[clamp(22px,3.2vw,36px)] font-bold leading-[1.1] tracking-[-0.02em]">{c.name}</h1>
            <FollowButton ticker={c.ticker} />
            {canRefresh && (
              <button
                type="button"
                onClick={refresh.run}
                disabled={refresh.busy}
                title="Fetch the latest price, shares outstanding, filings, beta and Treasury yield, skipping cached data. Values you typed yourself stay."
                className="inline-flex items-center gap-1.5 rounded-[3px] border border-brass px-2.5 py-1 text-[12.5px] font-semibold text-brass hover:bg-brass-soft disabled:opacity-60"
              >
                <RefreshCw className={clsx("size-3.5", refresh.busy && "animate-spin")} aria-hidden />
                {refresh.busy ? "Refreshing…" : "Refresh data"}
              </button>
            )}
            {[c.exchange, c.industry].filter(Boolean).map((t) => (
              <span key={t} className="rounded-[3px] border border-rule bg-sunk px-2 py-0.5 text-[11px] text-muted">
                {t}
              </span>
            ))}
          </div>
          <dl className="num mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px]">
            {[
              ["TICKER", c.ticker],
              ["PX", price != null ? price.toFixed(2) : "–"],
              ["MCAP", big(price ? price * liveA.sharesOutstanding : c.marketCap, c.currency)],
              ["SHARES", big(liveA.sharesOutstanding)],
              ["BETA", c.beta != null ? c.beta.toFixed(2) : "–"],
              ["UST10Y", pct(c.riskFreeRate, 2)],
              ["HIST", `${c.historicals.length}Y`],
            ].map(([k, val]) => (
              <div key={k} className="flex gap-1.5">
                <dt className="text-brass">{k}</dt>
                <dd className="text-ink">{val}</dd>
              </div>
            ))}
            {canRefresh && (
              <div className="flex gap-1.5">
                <dt className="text-brass">DATA</dt>
                <dd className="text-ink" title={`Fetched ${new Date(c.fetchedAt).toLocaleString()}`}>
                  {timeAgo(c.fetchedAt)}
                </dd>
              </div>
            )}
          </dl>
          {refresh.note && (
            <p role="status" className={clsx("num mt-1.5 text-[12px]", refresh.note.startsWith("Couldn") ? "text-down" : "text-muted")}>
              {refresh.note}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-x-8 gap-y-3" data-tour="headline">
          <div>
            <div className="flex items-center gap-1.5 text-[12.5px] text-muted">
              Intrinsic value per share
              <InfoTip id="intrinsic" />
            </div>
            <div className="num text-[clamp(36px,5vw,56px)] font-bold leading-none tracking-[-0.04em] text-brass">
              {money(v.valuePerShare, c.currency)}
            </div>
          </div>
          <div className="pb-1">
            <label htmlFor="price" className="block text-[12.5px] text-muted">
              Market price
            </label>
            <PriceInput price={price} onChange={setPrice} />
            <div className={clsx("num text-[13px] font-medium", upside >= 0 ? "text-up" : "text-down")}>
              {Number.isFinite(upside) ? `${signedPct(upside)} ${upside >= 0 ? "upside" : "downside"}` : " "}
            </div>
            {priceManual ? (
              <button onClick={() => backToMarketPrice(live?.price ?? null)} className="num text-[11.5px] text-brass hover:underline">
                Your price · use market{live?.price ? ` ${live.price.toFixed(2)}` : ""}
              </button>
            ) : (
              live && <LiveBadge q={live} />
            )}
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
      <section
        data-tour="rail"
        className={clsx(
          "relative min-w-0 rounded-[3px] border border-rule bg-surface px-5 pb-4 pt-5 sm:px-8",
          c.ticker === "DEMO" ? "lg:col-span-3" : "lg:col-span-2",
        )}
      >
        <div className="absolute right-3 top-3">
          <InfoTip id="rail" />
        </div>
        <ValueRail
          currency={c.currency}
          price={price}
          base={v.valuePerShare}
          bear={bear}
          bull={bull}
          weighted={sv.weighted}
          p10={mc.p10}
          p90={mc.p90}
        />
        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-rule pt-4 sm:grid-cols-3">
          {T.eq ? (
            <Stat
              label="Book equity"
              info="bookEquity"
              value={big(bookEquity, c.currency)}
              sub={mcap && bookEquity && bookEquity > 0 ? `Price / book ${mult(mcap / bookEquity)}` : undefined}
            />
          ) : (
            <Stat label="Enterprise value" info="enterpriseValue" value={big(v.enterpriseValue, c.currency)} />
          )}
          <Stat label="Equity value" info={T.equityValueLesson} value={big(v.equityValue, c.currency)} sub={mcap ? `Market cap ${big(mcap, c.currency)}` : undefined} />
          {T.eq ? (
            <Stat label="Cost of equity" info="costOfEquity" value={pct(v.wacc.wacc, 2)} sub="Discount rate (equity approach)" />
          ) : (
            <Stat label="WACC" info="costOfCapital" value={pct(v.wacc.wacc, 2)} sub={`Cost of equity ${pct(v.wacc.costOfEquity, 1)}`} />
          )}
          <Stat
            label="Terminal value share"
            info="terminalShare"
            value={pct(v.terminalShare, 0)}
            sub={Number.isFinite(v.terminalShare) ? undefined : "Not meaningful: value ≤ 0"}
            tone={v.terminalShare > 0.8 ? "down" : undefined}
          />
          <Stat label={`Year-${liveA.forecastYears} ${T.returns}`} info={T.returnsLesson} value={pct(v.years.at(-1)?.roic)} sub={`vs ${T.rate.replace("Cost of equity", "cost of equity")} ${pct(v.wacc.wacc, 1)}`} />
          <Stat label="Weighted value" info="weighted" value={money(sv.weighted, c.currency)} sub={price ? `${signedPct(sv.weighted / price - 1)} vs price` : undefined} />
        </div>
      </section>

      <PriceChart ticker={c.ticker} exchange={c.exchange} />
      </div>

      {warnings.length > 0 && (
        <ul className="mt-4 grid gap-1.5">
          {warnings.map((w) => (
            <li key={w} className="flex items-start gap-2 text-[13px] text-muted">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-brass" aria-hidden />
              {w}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="lg:sticky lg:top-[64px] lg:max-h-[calc(100dvh-80px)] lg:self-start lg:overflow-y-auto lg:pr-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[16px] font-semibold">Assumptions</h2>
            <button onClick={reset} className="inline-flex items-center gap-1.5 text-[12.5px] text-muted hover:text-ink" title="Back to values derived from filings">
              <RotateCcw className="size-3.5" aria-hidden />
              Reset all
            </button>
          </div>
          <AssumptionsPanel />
          <p className="mt-4 text-[11.5px] leading-relaxed text-faint">
            Sources: {c.sources.join("; ")}. A dot next to a label means you changed it; click the dot to restore it. Your edits save in this browser.
          </p>
        </aside>

        <div className="min-w-0">
          <nav role="tablist" aria-label="Analysis views" className="mb-5 flex gap-1 overflow-x-auto border-b border-rule">
            {TABS.map((t, i) => (
              <button
                key={t.id}
                role="tab"
                data-tour={`tab-${t.id}`}
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                title={`Press ${i + 1}`}
                className={clsx(
                  "-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-[13px]",
                  tab === t.id ? "border-brass font-bold text-ink" : "border-transparent text-muted hover:text-ink",
                )}
              >
                <kbd
                  className={clsx(
                    "rounded-[2px] px-1 font-sans text-[10.5px] leading-[1.5]",
                    tab === t.id ? "bg-brass text-[#111]" : "bg-sunk text-faint",
                  )}
                >
                  {i + 1}
                </kbd>
                {t.label}
              </button>
            ))}
          </nav>
          {tab === "model" && <ModelTab v={v} a={liveA} currency={c.currency} lastFy={lastFy} />}
          {tab === "scenarios" && <ScenariosTab a={a} currency={c.currency} price={price} />}
          {tab === "sensitivity" && <SensitivityTab a={a} currency={c.currency} price={price} />}
          {tab === "implied" && <ImpliedTab a={a} c={c} price={price} base={v.valuePerShare} />}
          {tab === "history" && <HistoryTab c={c} />}
          {tab === "ownership" && <OwnershipTab ticker={c.ticker} sharesOutstanding={liveA.sharesOutstanding} />}
          {tab === "brief" && <BriefTab c={c} a={liveA} price={price} />}
        </div>
      </div>
    </main>
  );
}

const DATA_LABELS: Record<DataKey, string> = {
  sharesOutstanding: "shares",
  baseRevenue: "revenue",
  cash: "cash",
  debt: "debt",
  minorityInterest: "minority interest",
  bookEquity: "book equity",
  riskFreeRate: "risk-free rate",
  beta: "beta",
};

function describeChange(k: DataKey, from: number | undefined, to: number | undefined, ccy: string) {
  const f = (x: number | undefined) =>
    k === "riskFreeRate" ? pct(x, 2) : k === "beta" ? (x ?? NaN).toFixed(2) : k === "sharesOutstanding" ? big(x) : big(x, ccy);
  return `${DATA_LABELS[k]} ${f(from)} → ${f(to)}`;
}

function timeAgo(iso: string) {
  const min = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (!Number.isFinite(min) || min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  return h < 24 ? `${h} h ago` : new Date(iso).toLocaleDateString();
}

/** The Refresh data button: refetch the company past every cache and say what changed. */
function useRefresh(c: CompanyData) {
  const load = useModel((s) => s.load);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  // Re-render each minute so "as of" stays honest.
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => setNote(null), [c.ticker]);

  const run = async () => {
    setBusy(true);
    setNote(null);
    const before: Assumptions | null = useModel.getState().assumptions;
    try {
      const fresh = await fetchCompany(c.ticker, { fresh: true });
      load(fresh, { refresh: true });
      const after = useModel.getState().assumptions;
      const changed =
        before && after
          ? DATA_KEYS.filter((k) => {
              const a = before[k];
              const b = after[k];
              return a !== b && !(typeof a === "number" && typeof b === "number" && Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a)));
            })
          : [];
      setNote(
        changed.length
          ? `Updated ${changed.map((k) => describeChange(k, before![k], after![k], fresh.currency)).join(" · ")}`
          : "Up to date: nothing changed in the data.",
      );
    } catch (e) {
      setNote(`Couldn't refresh: ${e instanceof Error ? e.message : "lookup failed"}`);
    } finally {
      setBusy(false);
    }
  };
  return { run, busy, note };
}

function PriceInput({ price, onChange }: { price: number | null; onChange: (p: number | null) => void }) {
  const [text, setText] = useState(price != null ? price.toFixed(2) : "");
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (!editing) setText(price != null ? price.toFixed(2) : "");
  }, [price, editing]);
  return (
    <input
      id="price"
      type="number"
      inputMode="decimal"
      step="0.01"
      value={text}
      placeholder="Enter"
      onFocus={() => setEditing(true)}
      onBlur={() => setEditing(false)}
      onChange={(e) => {
        setText(e.target.value);
        const n = parseFloat(e.target.value);
        onChange(e.target.value === "" ? null : Number.isFinite(n) && n > 0 ? n : price);
      }}
      className="num w-28 border-b border-rule bg-transparent text-[24px] font-semibold outline-none focus-visible:border-brass"
    />
  );
}
