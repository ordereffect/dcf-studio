"use client";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { ExternalLink } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Panel, Stat, chartColors, tooltipStyle } from "../ui";
import { big, money, pct } from "@/lib/format";
import { CODE_LABELS, type OwnershipData } from "@/lib/data/ownership-parse";

// Filings change slowly: keep one result per ticker for the browser session.
const cache = new Map<string, OwnershipData>();

const MONTH = new Intl.DateTimeFormat("en-US", { month: "short" });
const DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "2-digit" });
const fmtDay = (d: string | null) => (d ? DAY.format(new Date(`${d}T12:00:00`)) : "–");
const shares = (n: number | null) => (n == null ? "–" : n.toLocaleString("en-US", { maximumFractionDigits: 0 }));

export function OwnershipTab({ ticker, sharesOutstanding }: { ticker: string; sharesOutstanding: number }) {
  const [data, setData] = useState<OwnershipData | null>(cache.get(ticker) ?? null);
  const [error, setError] = useState("");
  const [all, setAll] = useState(false);

  useEffect(() => {
    if (ticker === "DEMO" || cache.has(ticker)) return;
    let cancelled = false;
    setError("");
    fetch(`/api/ownership/${encodeURIComponent(ticker)}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Lookup failed");
        return j as OwnershipData;
      })
      .then((d) => {
        cache.set(ticker, d);
        if (!cancelled) setData(d);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [ticker]);

  const rows = useMemo(() => (data ? (all ? data.insiders : data.insiders.filter((t) => t.code === "P" || t.code === "S")) : []), [data, all]);

  if (ticker === "DEMO")
    return (
      <Panel title="Ownership">
        <p className="text-[13px] text-muted">The sample company has no SEC filings. Open a real ticker to see insider trades and major holders.</p>
      </Panel>
    );
  if (error)
    return (
      <Panel title="Ownership">
        <p className="text-[13px] text-muted">Couldn&apos;t read SEC ownership filings: {error}</p>
      </Panel>
    );
  if (!data)
    return (
      <Panel title="Ownership">
        <p className="text-[13px] text-muted">Reading Form 4 and Schedule 13G filings from SEC EDGAR… the first load can take 10 to 20 seconds.</p>
        <div className="mt-4 h-[180px] animate-pulse rounded-[3px] bg-sunk" />
      </Panel>
    );

  const s = data.summary;
  const net = s.buyValue - s.sellValue;
  const chart = s.monthly.map((m) => ({ m: MONTH.format(new Date(`${m.month}-15T12:00:00`)), buy: m.buy, sell: -m.sell }));
  const heldBy5 = data.holders.filter((h) => (h.percent ?? 0) >= 5).reduce((a, h) => a + (h.percent ?? 0), 0);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <Panel title="Insider trading" note={`Open-market trades, last ${s.months} months · SEC Form 4`}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat
            label="Net buying"
            value={`${net >= 0 ? "+" : "−"}${big(Math.abs(net), "USD")}`}
            tone={net > 0 ? "up" : net < 0 ? "down" : undefined}
            sub={s.buyValue || s.sellValue ? (net >= 0 ? "Insiders net buyers" : "Insiders net sellers") : "No open-market trades"}
          />
          <Stat label="Bought" value={big(s.buyValue, "USD")} sub={`${s.buyers} insider${s.buyers === 1 ? "" : "s"} · ${shares(s.buyShares)} sh`} />
          <Stat label="Sold" value={big(s.sellValue, "USD")} sub={`${s.sellers} insider${s.sellers === 1 ? "" : "s"} · ${shares(s.sellShares)} sh`} />
          <Stat
            label="Sales under 10b5-1 plans"
            value={pct(s.plannedSellShare, 0)}
            sub={s.sellShares && sharesOutstanding ? `Sold ${pct(s.sellShares / sharesOutstanding, 2)} of shares` : "Pre-scheduled sales say less"}
          />
        </div>
        <div className="mt-5 h-[180px]">
          <ResponsiveContainer>
            <BarChart data={chart} stackOffset="sign" margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={chartColors.rule} />
              <XAxis dataKey="m" tick={{ fill: chartColors.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: chartColors.muted, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(x) => big(Math.abs(x))} width={52} />
              <ReferenceLine y={0} stroke={chartColors.faint} />
              <Tooltip {...tooltipStyle} formatter={(x, n) => [big(Math.abs(Number(x)), "USD"), n === "buy" ? "Bought" : "Sold"]} />
              <Bar dataKey="buy" stackId="a" fill={chartColors.up} radius={[2, 2, 0, 0]} />
              <Bar dataKey="sell" stackId="a" fill={chartColors.down} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-faint">
          Open-market buys are the strongest signal: insiders sell for many reasons, but buy for one. Grants, option exercises and shares withheld for tax are left out of the totals.
        </p>
      </Panel>

      <Panel
        title="Insider transactions"
        note={
          <span className="inline-flex gap-1">
            {(["Buys and sells", "All"] as const).map((l, i) => (
              <button
                key={l}
                onClick={() => setAll(i === 1)}
                className={clsx("rounded-[3px] px-2 py-0.5 text-[11.5px]", all === (i === 1) ? "bg-brass font-semibold text-[#111]" : "text-muted hover:text-ink")}
              >
                {l}
              </button>
            ))}
          </span>
        }
      >
        {rows.length === 0 ? (
          <p className="text-[13px] text-muted">
            {all ? "No Form 4 filings in the last six months." : "No open-market buys or sells in the last six months. Switch to All to see grants and exercises."}
          </p>
        ) : (
          <div className="-mx-5 max-h-[480px] overflow-auto px-5">
            <table className="num w-full min-w-[720px] text-[13px]">
              <thead className="sticky top-0 bg-surface">
                <tr className="text-left text-[12px] text-muted">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Insider</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 text-right font-medium">Shares</th>
                  <th className="pb-2 text-right font-medium">Price</th>
                  <th className="pb-2 text-right font-medium">Value</th>
                  <th className="pb-2 text-right font-medium">Owned after</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((t, i) => (
                  <tr key={`${t.url}-${i}`} className="border-t border-rule align-top">
                    <td className="whitespace-nowrap py-1.5 pr-3 text-muted">{fmtDay(t.date)}</td>
                    <td className="py-1.5 pr-3 font-sans">
                      <div className="text-ink">{t.insider}</div>
                      <div className="text-[11.5px] text-faint">{t.role}</div>
                    </td>
                    <td className="whitespace-nowrap py-1.5 pr-3 font-sans">
                      <span className={clsx(t.code === "P" && "font-semibold text-up", t.code === "S" && "text-down")}>{CODE_LABELS[t.code] ?? t.code}</span>
                      {t.planned && t.code === "S" && <span className="ml-1.5 text-[11px] text-faint" title="Pre-scheduled under a Rule 10b5-1 trading plan">10b5-1</span>}
                      {!t.direct && <span className="ml-1.5 text-[11px] text-faint" title="Held indirectly, e.g. through a trust or family member">ind.</span>}
                    </td>
                    <td className="py-1.5 pl-3 text-right">{`${t.acquired ? "+" : "−"}${shares(t.shares)}`}</td>
                    <td className="py-1.5 pl-3 text-right text-muted">{t.price != null ? money(t.price) : "–"}</td>
                    <td className="py-1.5 pl-3 text-right">{t.value != null ? big(t.value, "USD") : "–"}</td>
                    <td className="py-1.5 pl-3 text-right text-muted">{shares(t.ownedAfter)}</td>
                    <td className="py-1.5 pl-3 text-right">
                      <a href={t.url} target="_blank" rel="noreferrer" className="text-faint hover:text-brass" aria-label="Open the filing on SEC.gov">
                        <ExternalLink className="inline size-3.5" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Major holders" note="Owners of 5% or more · SEC Schedule 13G / 13D">
        {data.holders.length === 0 ? (
          <p className="text-[13px] text-muted">No Schedule 13G or 13D filings in the last three years.</p>
        ) : (
          <>
            {heldBy5 > 0 && (
              <p className="mb-3 text-[13px] text-muted">
                Holders above 5% report <span className="num font-semibold text-ink">{heldBy5.toFixed(1)}%</span> of the shares between them.
              </p>
            )}
            <div className="-mx-5 overflow-x-auto px-5">
              <table className="num w-full min-w-[600px] text-[13px]">
                <thead>
                  <tr className="text-left text-[12px] text-muted">
                    <th className="pb-2 font-medium">Holder</th>
                    <th className="pb-2 text-right font-medium">% of class</th>
                    <th className="pb-2 text-right font-medium">Shares</th>
                    <th className="pb-2 pl-3 font-medium">Stance</th>
                    <th className="pb-2 font-medium">As of</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {data.holders.map((h) => {
                    const below = (h.percent ?? 0) < 5;
                    return (
                      <tr key={h.url} className={clsx("border-t border-rule", below && "text-faint")}>
                        <td className="py-1.5 pr-3 font-sans">
                          {h.name}
                          {below && <span className="ml-1.5 text-[11px]">now below 5%</span>}
                        </td>
                        <td className="py-1.5 pl-3 text-right font-semibold">{h.percent != null ? `${h.percent.toFixed(1)}%` : "–"}</td>
                        <td className="py-1.5 pl-3 text-right">{big(h.shares)}</td>
                        <td className="py-1.5 pl-3 font-sans" title={h.passive ? "Schedule 13G: passive investor" : "Schedule 13D: may seek to influence the company"}>
                          {h.passive ? "Passive" : <span className="font-semibold text-brass">Active (13D)</span>}
                        </td>
                        <td className="whitespace-nowrap py-1.5 pr-3 text-muted">{fmtDay(h.eventDate ?? h.filed)}</td>
                        <td className="py-1.5 text-right">
                          <a href={h.url} target="_blank" rel="noreferrer" className="text-faint hover:text-brass" aria-label="Open the filing on SEC.gov">
                            <ExternalLink className="inline size-3.5" />
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
        <p className="mt-3 text-[12px] leading-relaxed text-faint">
          Index funds and asset managers file Schedule 13G once they pass 5% and update it each year. A Schedule 13D means the holder may push for change. Smaller funds report only in quarterly 13F filings, which aren&apos;t included yet.
        </p>
      </Panel>

      {data.notes.map((n) => (
        <p key={n} className="text-[12px] text-faint">
          {n}
        </p>
      ))}
    </div>
  );
}
