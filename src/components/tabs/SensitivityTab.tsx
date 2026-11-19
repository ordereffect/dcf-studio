"use client";
import { useState } from "react";
import { Panel } from "../ui";
import { SENSITIVITY_LABELS, sensitivityGrid, type SensitivityKey } from "@/lib/dcf/analysis";
import { money, mult, pct } from "@/lib/format";
import type { Assumptions } from "@/lib/dcf/types";

const STEPS: Record<SensitivityKey, number> = {
  wacc: 0.005,
  terminalGrowth: 0.005,
  revenueGrowth: 0.02,
  targetMargin: 0.02,
  exitMultiple: 2,
};
const fmt = (k: SensitivityKey, v: number) => (k === "exitMultiple" ? mult(v) : pct(v, k === "wacc" || k === "terminalGrowth" ? 1 : 0));

const PRESETS: { row: SensitivityKey; col: SensitivityKey; title: string }[] = [
  { row: "wacc", col: "terminalGrowth", title: "WACC × terminal growth" },
  { row: "revenueGrowth", col: "targetMargin", title: "Growth × margin" },
  { row: "wacc", col: "exitMultiple", title: "WACC × exit multiple" },
];

export function SensitivityTab({ a, currency, price }: { a: Assumptions; currency: string; price: number | null }) {
  const [preset, setPreset] = useState(0);
  const p = PRESETS[preset];
  const model = p.col === "exitMultiple" ? { ...a, terminalMethod: "exitMultiple" as const } : a;
  const g = sensitivityGrid(model, p.row, p.col, STEPS[p.row], STEPS[p.col], 7);

  const ref = price ?? g.values[3][3];
  const flat = g.values.flat().filter(Number.isFinite);
  const maxDev = Math.max(...flat.map((v) => Math.abs(v / ref - 1)), 0.01);

  const cellStyle = (v: number): React.CSSProperties => {
    if (!Number.isFinite(v)) return {};
    const dev = v / ref - 1;
    const t = Math.min(1, Math.abs(dev) / maxDev);
    const c = dev >= 0 ? "var(--up)" : "var(--down)";
    return { background: `color-mix(in oklab, ${c} ${Math.round(t * 38)}%, transparent)` };
  };

  return (
    <Panel
      title="Sensitivity"
      note={price ? "Green is above today's price, red below. The outlined cell is your base case." : "Shaded against the base case."}
    >
      <div role="tablist" aria-label="Sensitivity table" className="mb-4 flex flex-wrap gap-2">
        {PRESETS.map((x, i) => (
          <button
            key={x.title}
            role="tab"
            aria-selected={i === preset}
            onClick={() => setPreset(i)}
            className={`rounded-[3px] border px-3 py-1 text-[12.5px] ${i === preset ? "border-brass bg-brass font-semibold text-[#111]" : "border-rule text-muted hover:text-ink"}`}
          >
            {x.title}
          </button>
        ))}
      </div>
      {p.col === "exitMultiple" && a.terminalMethod !== "exitMultiple" && (
        <p className="mb-3 text-[12px] text-muted">This table uses the exit-multiple method regardless of your terminal setting.</p>
      )}
      <div className="-mx-5 overflow-x-auto px-5">
        <table className="num w-full min-w-[560px] border-separate border-spacing-[3px] text-center text-[13px]">
          <thead>
            <tr>
              <th className="w-24 text-left text-[11.5px] font-normal leading-tight text-muted">
                {SENSITIVITY_LABELS[p.row]} ↓<br />
                {SENSITIVITY_LABELS[p.col]} →
              </th>
              {g.cols.map((c, j) => (
                <th key={j} className="pb-1 text-[12px] font-medium text-muted">
                  {fmt(p.col, c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {g.rows.map((r, i) => (
              <tr key={i}>
                <th className="pr-2 text-left text-[12px] font-medium text-muted">{fmt(p.row, r)}</th>
                {g.values[i].map((v, j) => (
                  <td
                    key={j}
                    style={cellStyle(v)}
                    className={`rounded px-2 py-2 ${i === 3 && j === 3 ? "font-semibold outline-2 outline-brass" : ""}`}
                  >
                    {Number.isFinite(v) ? money(v, currency, 0) : "–"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
