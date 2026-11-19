"use client";
import { useMemo } from "react";
import { Bar, BarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Panel, chartColors, tooltipStyle } from "../ui";
import { monteCarlo, reverseDcf, tornado } from "@/lib/dcf/analysis";
import { historicalMetrics } from "@/lib/dcf/defaults";
import { money, pct } from "@/lib/format";
import type { Assumptions, CompanyData } from "@/lib/dcf/types";

export function ImpliedTab({ a, c, price, base }: { a: Assumptions; c: CompanyData; price: number | null; base: number }) {
  const ccy = c.currency;
  const hist = historicalMetrics(c.historicals);
  const recent = hist.slice(-5);
  const avg = (xs: (number | null)[]) => {
    const v = xs.filter((x): x is number => x != null && Number.isFinite(x));
    return v.length ? v.reduce((s, x) => s + x, 0) / v.length : NaN;
  };
  const histGrowth = avg(recent.map((h) => h.growth));
  const histMargin = avg(recent.map((h) => h.operatingMargin));

  const implied = price
    ? {
        growth: reverseDcf(a, price, "revenueGrowth"),
        margin: reverseDcf(a, price, "targetMargin"),
        wacc: reverseDcf(a, price, "wacc"),
      }
    : null;

  const tor = tornado(a);
  const torMin = Math.min(...tor.map((t) => Math.min(t.low, t.high)), base);
  const torMax = Math.max(...tor.map((t) => Math.max(t.low, t.high)), base);
  const tx = (v: number) => ((v - torMin) / (torMax - torMin || 1)) * 100;

  const mc = useMemo(() => monteCarlo(a, 1500), [a]);
  const hist2 = useMemo(() => {
    if (!mc.samples.length) return [];
    const lo = mc.samples[Math.floor(mc.samples.length * 0.01)];
    const hi = mc.samples[Math.floor(mc.samples.length * 0.99)];
    const bins = 30;
    const w = (hi - lo) / bins || 1;
    const counts = Array.from({ length: bins }, (_, i) => ({ x: lo + w * (i + 0.5), n: 0 }));
    for (const s of mc.samples) {
      const i = Math.floor((s - lo) / w);
      if (i >= 0 && i < bins) counts[i].n++;
    }
    return counts;
  }, [mc]);
  const probAbove = price ? mc.samples.filter((s) => s > price).length / (mc.samples.length || 1) : NaN;

  return (
    <div className="grid gap-5">
      <Panel title="What the price implies" info="implied" tour="implied" note="Solves for one input at a time, holding the rest of your model fixed.">
        {implied ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <ImpliedCard label="Revenue growth" implied={implied.growth} model={a.revenueGrowth} history={histGrowth} historyLabel="5-yr avg" />
            <ImpliedCard label="Target operating margin" implied={implied.margin} model={a.targetMargin} history={histMargin} historyLabel="5-yr avg" />
            <ImpliedCard label="Discount rate (WACC)" implied={implied.wacc} model={null} history={NaN} historyLabel="" note="The return you earn buying at today's price, if your cash flows come true." />
          </div>
        ) : (
          <p className="text-[13px] text-muted">Enter a market price to see what it implies.</p>
        )}
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="What moves the value most" info="tornado" tour="tornado" note="Value per share when each driver swings alone">
          <ul className="grid gap-3">
            {tor.map((t) => {
              const l = Math.min(t.low, t.high);
              const h = Math.max(t.low, t.high);
              return (
                <li key={t.label}>
                  <div className="flex justify-between text-[12.5px]">
                    <span>{t.label}</span>
                    <span className="num text-muted">
                      {money(t.low, ccy, 0)} ({t.lowLabel}) · {money(t.high, ccy, 0)} ({t.highLabel})
                    </span>
                  </div>
                  <div className="relative mt-1 h-3">
                    <div className="absolute inset-y-0 rounded-sm bg-down/60" style={{ left: `${tx(l)}%`, width: `${Math.max(0, tx(base) - tx(l))}%` }} />
                    <div className="absolute inset-y-0 rounded-sm bg-up/60" style={{ left: `${tx(base)}%`, width: `${Math.max(0, tx(h) - tx(base))}%` }} />
                    <div className="absolute -inset-y-0.5 w-px bg-brass" style={{ left: `${tx(base)}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel
          title="Range of outcomes"
          info="monteCarlo"
          note={`${mc.samples.length.toLocaleString()} simulations, shocking growth, margin, WACC and reinvestment together`}
        >
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hist2} barCategoryGap={1} margin={{ left: 0, right: 12, top: 20 }}>
                <XAxis
                  dataKey="x"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={(x) => money(x, ccy, 0)}
                  tick={{ fill: chartColors.muted, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip {...tooltipStyle} formatter={(n) => [String(n), "Simulations"]} labelFormatter={(x) => money(Number(x), ccy, 0)} />
                <Bar dataKey="n" fill={chartColors.faint} />
                {price && <ReferenceLine x={price} stroke={chartColors.ink} strokeWidth={2} label={{ value: "Price", fill: chartColors.ink, fontSize: 11, position: "top" }} />}
                <ReferenceLine x={base} stroke={chartColors.brass} strokeWidth={2} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="num mt-3 grid grid-cols-4 gap-2 text-[12px] text-muted">
            <div>P10<span className="block text-[15px] font-semibold text-ink">{money(mc.p10, ccy, 0)}</span></div>
            <div>Median<span className="block text-[15px] font-semibold text-ink">{money(mc.p50, ccy, 0)}</span></div>
            <div>P90<span className="block text-[15px] font-semibold text-ink">{money(mc.p90, ccy, 0)}</span></div>
            <div>Above price<span className="block text-[15px] font-semibold text-ink">{pct(probAbove, 0)}</span></div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function ImpliedCard({
  label,
  implied,
  model,
  history,
  historyLabel,
  note,
}: {
  label: string;
  implied: number;
  model: number | null;
  history: number;
  historyLabel: string;
  note?: string;
}) {
  return (
    <div className="rounded-[3px] border border-rule p-4">
      <div className="text-[12.5px] text-muted">{label}</div>
      <div className="num mt-1 text-[28px] font-semibold leading-none">{Number.isFinite(implied) ? pct(implied) : "Out of range"}</div>
      <dl className="num mt-3 grid gap-1 text-[12px] text-muted">
        {model != null && (
          <div className="flex justify-between">
            <dt>Your model</dt>
            <dd className="text-ink">{pct(model)}</dd>
          </div>
        )}
        {Number.isFinite(history) && (
          <div className="flex justify-between">
            <dt>{historyLabel}</dt>
            <dd className="text-ink">{pct(history)}</dd>
          </div>
        )}
      </dl>
      {note && <p className="mt-2 text-[11.5px] leading-snug text-faint">{note}</p>}
    </div>
  );
}
