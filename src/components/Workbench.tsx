"use client";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { useModel } from "@/lib/store";
import { runDcf } from "@/lib/dcf/engine";
import { monteCarlo, scenarioValues } from "@/lib/dcf/analysis";
import type { CompanyData } from "@/lib/dcf/types";
import { DEMO_COMPANY } from "@/lib/demo";
import { big, money, pct, signedPct } from "@/lib/format";
import { TickerSearch } from "./TickerSearch";
import { ThemeToggle } from "./ThemeToggle";
import { ValueRail } from "./ValueRail";
import { AssumptionsPanel } from "./AssumptionsPanel";
import { Stat } from "./ui";
import { ModelTab } from "./tabs/ModelTab";
import { ScenariosTab } from "./tabs/ScenariosTab";
import { SensitivityTab } from "./tabs/SensitivityTab";
import { ImpliedTab } from "./tabs/ImpliedTab";
import { HistoryTab } from "./tabs/HistoryTab";
import { BriefTab } from "./tabs/BriefTab";

const TABS = [
  { id: "model", label: "Model" },
  { id: "scenarios", label: "Scenarios" },
  { id: "sensitivity", label: "Sensitivity" },
  { id: "implied", label: "Market-implied" },
  { id: "history", label: "History" },
  { id: "brief", label: "Brief for Claude" },
] as const;
type TabId = (typeof TABS)[number]["id"];

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
    fetch(`/api/company/${encodeURIComponent(ticker)}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Lookup failed");
        return j as CompanyData;
      })
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
  const scenarios = useModel((s) => s.scenarios);
  const reset = useModel((s) => s.reset);
  const [tab, setTab] = useState<TabId>("model");

  // Terminal-style shortcuts: number keys switch views when you're not typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || el.closest("input, textarea, select, [contenteditable]")) return;
      const i = Number(e.key) - 1;
      if (i >= 0 && i < TABS.length) setTab(TABS[i].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Heavy views (simulation, grids) follow the deferred value so dragging stays smooth.
  const a = useDeferredValue(liveA);
  const v = useMemo(() => runDcf(liveA), [liveA]);
  const sv = useMemo(() => scenarioValues(a, scenarios), [a, scenarios]);
  const mc = useMemo(() => monteCarlo(a, 600), [a]);

  const lastFy = c.historicals.at(-1)?.fiscalYear ?? new Date().getFullYear() - 1;
  const upside = price ? v.valuePerShare / price - 1 : NaN;
  const bear = sv.rows.find((r) => r.scenario.id === "bear")?.value ?? NaN;
  const bull = sv.rows.find((r) => r.scenario.id === "bull")?.value ?? NaN;
  const warnings = [...c.warnings, ...v.warnings];

  return (
    <main className="mx-auto max-w-[1440px] px-4 pb-24 sm:px-6">
      {/* Identity + headline value */}
      <section className="grid gap-6 pt-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-[clamp(22px,3.2vw,36px)] font-bold leading-[1.1] tracking-[-0.02em]">{c.name}</h1>
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
              ["BETA", c.beta != null ? c.beta.toFixed(2) : "–"],
              ["UST10Y", pct(c.riskFreeRate, 2)],
              ["HIST", `${c.historicals.length}Y`],
            ].map(([k, val]) => (
              <div key={k} className="flex gap-1.5">
                <dt className="text-brass">{k}</dt>
                <dd className="text-ink">{val}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
          <div>
            <div className="text-[12.5px] text-muted">Intrinsic value per share</div>
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
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-[3px] border border-rule bg-surface px-5 pb-4 pt-5 sm:px-8">
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
        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-rule pt-4 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Enterprise value" value={big(v.enterpriseValue, c.currency)} />
          <Stat label="Equity value" value={big(v.equityValue, c.currency)} sub={price ? `Market cap ${big(price * liveA.sharesOutstanding, c.currency)}` : undefined} />
          <Stat label="WACC" value={pct(v.wacc.wacc, 2)} sub={`Cost of equity ${pct(v.wacc.costOfEquity, 1)}`} />
          <Stat label="Terminal value share" value={pct(v.terminalShare, 0)} tone={v.terminalShare > 0.8 ? "down" : undefined} />
          <Stat label={`Year-${liveA.forecastYears} ROIC`} value={pct(v.years.at(-1)?.roic)} sub={`vs WACC ${pct(v.wacc.wacc, 1)}`} />
          <Stat label="Weighted value" value={money(sv.weighted, c.currency)} sub={price ? `${signedPct(sv.weighted / price - 1)} vs price` : undefined} />
        </div>
      </section>

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
          {tab === "brief" && <BriefTab c={c} a={liveA} price={price} />}
        </div>
      </div>
    </main>
  );
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
