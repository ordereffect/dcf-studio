"use client";
import { Field, Toggle } from "./Field";
import { InfoTip } from "./InfoTip";
import { terms, type LessonId } from "@/lib/learn";
import { useModel } from "@/lib/store";
import { computeWacc } from "@/lib/dcf/engine";
import { pct } from "@/lib/format";
import type { Assumptions } from "@/lib/dcf/types";

function Group({
  title,
  aside,
  children,
  info,
  tour,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  info?: LessonId;
  tour?: string;
}) {
  return (
    <section data-tour={tour} className="border-t border-rule py-3 first:border-t-0 first:pt-0">
      <div className="mb-1 flex items-baseline justify-between">
        <h3 className="flex items-center gap-1.5 text-[14px] font-semibold">
          {title}
          {info && <InfoTip id={info} />}
        </h3>
        {aside && <span className="num text-[12px] text-muted">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

export function AssumptionsPanel() {
  const a = useModel((s) => s.assumptions)!;
  const d = useModel((s) => s.defaults)!;
  const set = useModel((s) => s.set);
  const setApproach = useModel((s) => s.setApproach);
  const w = computeWacc(a);
  const T = terms(a.approach);

  const f = <K extends keyof Assumptions>(k: K) => ({
    value: a[k] as number,
    defaultValue: d[k] as number,
    onChange: (v: number) => set({ [k]: v } as Partial<Assumptions>),
  });

  return (
    <div>
      <Group title="Approach">
        <Toggle
          label="Value the"
          info="approach"
          value={a.approach ?? "firm"}
          onChange={setApproach}
          options={[
            { value: "firm", label: "Firm" },
            { value: "equity", label: "Equity" },
          ]}
        />
        <p className="text-[11.5px] leading-snug text-faint">
          {T.eq
            ? "Cash flow to shareholders at the cost of equity. Right for banks, brokers and insurers."
            : "Cash flow to the firm at WACC, then cash added and debt subtracted. Right for most companies."}
        </p>
      </Group>

      <Group title="Growth">
        <Field label="Revenue growth" unit="pct" min={-0.2} max={0.6} step={0.005} {...f("revenueGrowth")} info="revenueGrowth" tour="revenueGrowth" />
        <Field label="Years at that growth" unit="years" min={0} max={a.forecastYears} step={1} {...f("highGrowthYears")} info="highGrowthYears" tour="highGrowthYears" hint="Then fades in a straight line to terminal growth." />
        <Field label="Forecast length" unit="years" min={5} max={15} step={1} {...f("forecastYears")} info="forecastYears" tour="forecastYears" />
      </Group>

      <Group title="Profitability">
        <Field label={T.marginNow} unit="pct" min={-0.5} max={0.7} step={0.005} {...f("currentMargin")} info={T.marginNowLesson} tour="currentMargin" />
        <Field label={T.marginTarget} unit="pct" min={-0.2} max={0.7} step={0.005} {...f("targetMargin")} info={T.marginTargetLesson} tour="targetMargin" />
        <Field label="Reached by year" unit="years" min={1} max={a.forecastYears} step={1} {...f("marginConvergenceYear")} info="marginConvergenceYear" tour="marginConvergenceYear" />
        <Field label="Effective tax rate" unit="pct" min={0} max={0.4} step={0.005} {...f("effectiveTaxRate")} info="effectiveTaxRate" tour="effectiveTaxRate" />
        <Field label="Marginal tax rate" unit="pct" min={0} max={0.4} step={0.005} {...f("marginalTaxRate")} info="marginalTaxRate" tour="marginalTaxRate" hint="The effective rate drifts to this by the final year." />
      </Group>

      <Group title="Reinvestment">
        <Field
          label={T.stc}
          unit="x"
          min={0.2}
          max={6}
          step={0.05}
          {...f("salesToCapital")} info={T.stcLesson} tour="salesToCapital"
          hint={
            T.eq
              ? "Revenue added per $1 of new book equity. Higher means growth needs less retained profit."
              : "Revenue added per $1 invested. Higher means growth is cheaper to fund."
          }
        />
      </Group>

      <Group title={T.eq ? "Cost of equity" : "Cost of capital"} aside={`${T.rate} ${pct(w.wacc, 2)}`} info={T.rateLesson} tour="costOfCapital">
        <Field label="Risk-free rate" unit="pct" min={0} max={0.08} step={0.0005} decimals={2} {...f("riskFreeRate")} info="riskFreeRate" tour="riskFreeRate" />
        <Field label="Equity risk premium" unit="pct" min={0.02} max={0.09} step={0.0005} decimals={2} {...f("equityRiskPremium")} info="equityRiskPremium" tour="equityRiskPremium" />
        <Field label="Beta" unit="num" min={0.3} max={2.5} step={0.01} decimals={2} {...f("beta")} info="beta" tour="beta" />
        {!T.eq && (
          <>
            <Field label="Pre-tax cost of debt" unit="pct" min={0.01} max={0.15} step={0.0005} decimals={2} {...f("preTaxCostOfDebt")} info="preTaxCostOfDebt" tour="preTaxCostOfDebt" />
            <Field label="Debt share of capital" unit="pct" min={0} max={0.8} step={0.01} decimals={0} {...f("debtToCapital")} info="debtToCapital" tour="debtToCapital" />
            <p className="num pt-1 text-[11.5px] text-faint">
              Cost of equity {pct(w.costOfEquity, 2)} · after-tax debt {pct(w.afterTaxCostOfDebt, 2)}
            </p>
          </>
        )}
        <div className="flex items-center justify-between gap-2 pt-2">
          <label className="flex items-center gap-2 text-[13px] text-muted">
            <input
              type="checkbox"
              checked={a.waccOverride != null}
              onChange={(e) => set({ waccOverride: e.target.checked ? w.wacc : null })}
              className="accent-[var(--brass)]"
            />
            Set {T.eq ? "cost of equity" : "WACC"} directly
          </label>
        </div>
        {a.waccOverride != null && (
          <Field label={T.rate} unit="pct" min={0.03} max={0.2} step={0.0005} decimals={2} value={a.waccOverride} onChange={(v) => set({ waccOverride: v })} />
        )}
      </Group>

      <Group title="Terminal value" info="terminal" tour="terminal">
        <Toggle
          label="Method"
          value={a.terminalMethod}
          onChange={(v) => set({ terminalMethod: v })}
          options={[
            { value: "perpetuity", label: "Perpetuity" },
            { value: "exitMultiple", label: "Exit multiple" },
          ]}
        />
        {a.terminalMethod === "perpetuity" ? (
          <>
            <Field label="Terminal growth" unit="pct" min={-0.01} max={0.05} step={0.0005} decimals={2} {...f("terminalGrowth")} info="terminalGrowth" tour="terminalGrowth" />
            <Field
              label={T.terminalReturn}
              unit="pct"
              min={0.04}
              max={0.4}
              step={0.005}
              {...f("terminalRoic")} info={T.terminalReturnLesson} tour="terminalRoic"
              hint={`Sets how much must be reinvested to grow forever. Equal to ${T.eq ? "the cost of equity" : "WACC"} means growth adds no value.`}
            />
          </>
        ) : (
          <>
            <Field label={T.exit} unit="x" min={4} max={40} step={0.5} decimals={1} {...f("exitMultiple")} info={T.exitLesson} tour="exitMultiple" />
            <Field label="Terminal growth (fade target)" unit="pct" min={-0.01} max={0.05} step={0.0005} decimals={2} {...f("terminalGrowth")} info="terminalGrowth" tour="terminalGrowth" />
          </>
        )}
        <Toggle
          label="Cash flow timing"
          info="midYear"
          value={a.midYear ? "mid" : "end"}
          onChange={(v) => set({ midYear: v === "mid" })}
          options={[
            { value: "mid", label: "Mid-year" },
            { value: "end", label: "Year-end" },
          ]}
        />
      </Group>

      <Group title="Equity bridge" info={T.bridgeLesson} tour="bridgeInputs">
        {T.eq ? (
          <p className="pb-1 text-[11.5px] leading-snug text-faint">
            No cash or debt here: for a financial company they are part of the business and already in net income.
          </p>
        ) : (
          <>
            <Field label="Cash & investments" unit="money" min={0} max={Math.max(d.cash * 3, 1e9)} step={1e6} {...f("cash")} info="cash" tour="cash" />
            <Field label="Debt incl. leases" unit="money" min={0} max={Math.max(d.debt * 3, 1e9)} step={1e6} {...f("debt")} info="debt" tour="debt" />
          </>
        )}
        <Field label="Minority interest" unit="money" min={0} max={Math.max(d.minorityInterest * 3, 1e9)} step={1e6} {...f("minorityInterest")} info="minorityInterest" tour="minorityInterest" />
        <Field
          label="Other adjustments"
          unit="money"
          min={-Math.max(d.debt, 1e9)}
          max={Math.max(d.debt, 1e9)}
          step={1e6}
          {...f("otherAdjustments")} info="otherAdjustments" tour="otherAdjustments"
          hint="Add non-operating assets, subtract other claims such as pensions or options."
        />
        <Field label="Diluted shares" unit="money" min={0} max={Math.max(d.sharesOutstanding * 2, 1e6)} step={1e5} decimals={1} {...f("sharesOutstanding")} info="sharesOutstanding" tour="sharesOutstanding" />
      </Group>
    </div>
  );
}
