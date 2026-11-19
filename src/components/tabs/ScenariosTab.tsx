"use client";
import clsx from "clsx";
import { Panel } from "../ui";
import { Field } from "../Field";
import { useModel } from "@/lib/store";
import { applyScenario, scenarioValues } from "@/lib/dcf/analysis";
import { runDcf } from "@/lib/dcf/engine";
import { money, pct, signedPct } from "@/lib/format";
import type { Assumptions } from "@/lib/dcf/types";

export function ScenariosTab({ a, currency, price }: { a: Assumptions; currency: string; price: number | null }) {
  const scenarios = useModel((s) => s.scenarios);
  const setShift = useModel((s) => s.setShift);
  const setScenario = useModel((s) => s.setScenario);
  const { rows, weighted } = scenarioValues(a, scenarios);
  const totalP = scenarios.reduce((s, x) => s + x.probability, 0);

  return (
    <div className="grid gap-5">
      <Panel
        title="Scenarios"
        note="Bear and bull are shifts from your base case, so they move when the base moves."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {rows.map(({ scenario: s, value }) => {
            const sa = applyScenario(a, s);
            const w = runDcf(sa).wacc.wacc;
            const up = price ? value / price - 1 : NaN;
            return (
              <div key={s.id} className={clsx("rounded-lg border p-4", s.id === "base" ? "border-brass" : "border-rule")}>
                <div className="flex items-baseline justify-between">
                  <h3 className="text-[15px] font-semibold">{s.label}</h3>
                  <span className={clsx("num text-[12px]", up >= 0 ? "text-up" : "text-down")}>{signedPct(up)}</span>
                </div>
                <div className="num mt-1 text-[28px] font-semibold leading-none">{money(value, currency)}</div>
                <p className="num mt-2 text-[12px] text-muted">
                  Growth {pct(sa.revenueGrowth)} · margin {pct(sa.targetMargin)} · WACC {pct(w, 1)}
                </p>
                <div className="mt-3 border-t border-rule pt-2">
                  <Field
                    label="Probability"
                    unit="pct"
                    decimals={0}
                    min={0}
                    max={1}
                    step={0.05}
                    value={s.probability}
                    onChange={(v) => setScenario(s.id, { probability: v })}
                  />
                  {s.id !== "base" && (
                    <>
                      <Field label="Growth shift" unit="pct" min={-0.2} max={0.2} step={0.005} value={s.shifts.revenueGrowth} onChange={(v) => setShift(s.id, "revenueGrowth", v)} />
                      <Field label="Margin shift" unit="pct" min={-0.2} max={0.2} step={0.005} value={s.shifts.targetMargin} onChange={(v) => setShift(s.id, "targetMargin", v)} />
                      <Field label="Sales to capital ×" unit="x" min={0.5} max={1.5} step={0.05} value={s.shifts.salesToCapital} onChange={(v) => setShift(s.id, "salesToCapital", v)} />
                      <Field label="WACC shift" unit="pct" decimals={2} min={-0.03} max={0.03} step={0.0025} value={s.shifts.wacc} onChange={(v) => setShift(s.id, "wacc", v)} />
                      <Field label="Terminal growth shift" unit="pct" decimals={2} min={-0.02} max={0.02} step={0.0025} value={s.shifts.terminalGrowth} onChange={(v) => setShift(s.id, "terminalGrowth", v)} />
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="num mt-5 flex flex-wrap items-baseline justify-between gap-3 border-t border-rule pt-4">
          <div className="text-[14px] text-muted">
            Probability-weighted value{" "}
            <span className="ml-2 text-[22px] font-semibold text-ink">{money(weighted, currency)}</span>
            {price ? <span className={clsx("ml-2 text-[13px]", weighted >= price ? "text-up" : "text-down")}>{signedPct(weighted / price - 1)} vs price</span> : null}
          </div>
          {Math.abs(totalP - 1) > 0.001 && (
            <p className="text-[12px] text-down">Probabilities add to {pct(totalP, 0)}; values are rescaled to 100%.</p>
          )}
        </div>
      </Panel>
    </div>
  );
}
