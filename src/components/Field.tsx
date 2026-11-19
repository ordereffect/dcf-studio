"use client";
import { useEffect, useId, useState } from "react";
import clsx from "clsx";

type Unit = "pct" | "x" | "num" | "money" | "years";

interface FieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: Unit;
  min: number;
  max: number;
  step: number;
  hint?: string;
  defaultValue?: number; // shows a reset dot when the value differs
  decimals?: number;
}

const toDisplay = (v: number, unit: Unit) => (unit === "pct" ? v * 100 : unit === "money" ? v / 1e6 : v);
const fromDisplay = (v: number, unit: Unit) => (unit === "pct" ? v / 100 : unit === "money" ? v * 1e6 : v);
const suffix: Record<Unit, string> = { pct: "%", x: "×", num: "", money: "M", years: "yrs" };

/** A labelled number with a slider beneath. Typing and dragging stay in sync. */
export function Field({ label, value, onChange, unit = "num", min, max, step, hint, defaultValue, decimals }: FieldProps) {
  const id = useId();
  const d = decimals ?? (unit === "pct" ? 1 : unit === "x" ? 2 : unit === "money" ? 0 : 0);
  const shown = toDisplay(value, unit);
  const [text, setText] = useState(shown.toFixed(d));
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (!editing) setText(Number.isFinite(shown) ? shown.toFixed(d) : "");
  }, [shown, d, editing]);

  const changed = defaultValue != null && Math.abs(defaultValue - value) > 1e-9;
  const dMin = toDisplay(min, unit);
  const dMax = toDisplay(max, unit);
  const dStep = toDisplay(step, unit);

  return (
    <div className="group py-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="flex items-center gap-1.5 text-[13px] text-muted">
          {label}
          {changed && (
            <button
              type="button"
              onClick={() => onChange(defaultValue!)}
              title={`Reset to ${toDisplay(defaultValue!, unit).toFixed(d)}${suffix[unit]}`}
              aria-label={`Reset ${label}`}
              className="size-1.5 rounded-full bg-brass"
            />
          )}
        </label>
        <div className="flex items-baseline gap-0.5">
          <input
            id={id}
            type="number"
            inputMode="decimal"
            className="num w-[4.5rem] bg-transparent text-right text-[15px] font-medium text-ink outline-none focus-visible:rounded focus-visible:bg-sunk"
            value={text}
            step={dStep}
            onFocus={() => setEditing(true)}
            onBlur={() => {
              setEditing(false);
              const n = parseFloat(text);
              if (Number.isFinite(n)) onChange(fromDisplay(n, unit));
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            onChange={(e) => setText(e.target.value)}
          />
          <span className="w-5 text-[12px] text-faint">{suffix[unit]}</span>
        </div>
      </div>
      <input
        type="range"
        aria-label={`${label} slider`}
        min={dMin}
        max={dMax}
        step={dStep}
        value={Math.min(dMax, Math.max(dMin, shown))}
        onChange={(e) => onChange(fromDisplay(parseFloat(e.target.value), unit))}
        className={clsx("mt-0.5")}
      />
      {hint && <p className="mt-0.5 text-[11.5px] leading-snug text-faint">{hint}</p>}
    </div>
  );
}

export function Toggle<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-[13px] text-muted">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex rounded-md border border-rule p-0.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={clsx(
              "rounded px-2 py-0.5 text-[12px]",
              value === o.value ? "bg-ink text-paper" : "text-muted hover:text-ink",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
