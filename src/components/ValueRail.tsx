"use client";
import clsx from "clsx";
import { money } from "@/lib/format";

interface Props {
  currency: string;
  price: number | null;
  base: number;
  bear: number;
  bull: number;
  weighted: number;
  p10: number;
  p90: number;
}

/**
 * The signature element: one horizontal price scale that puts the market price beside
 * every estimate of value, so the gap is the first thing you read.
 */
export function ValueRail({ currency, price, base, bear, bull, weighted, p10, p90 }: Props) {
  const pts = [price, base, bear, bull, weighted, p10, p90].filter((x): x is number => x != null && Number.isFinite(x));
  if (!pts.length) return null;
  let lo = Math.min(...pts);
  let hi = Math.max(...pts);
  const pad = (hi - lo || Math.abs(hi) || 1) * 0.12;
  lo = Math.max(0, lo - pad);
  hi = hi + pad;
  const x = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`;
  const ok = (v: number) => Number.isFinite(v);
  const frac = (v: number) => (v - lo) / (hi - lo);
  const near = (u: number, w: number, d: number) => ok(u) && ok(w) && Math.abs(frac(u) - frac(w)) < d;
  // Keep labels from colliding: price sits above the rail unless the base label is already there.
  const priceOnTop = price != null && !near(price, base, 0.2);
  const hideBearLabel = price != null && !priceOnTop && near(price, bear, 0.14);
  const hideBullLabel = price != null && !priceOnTop && near(price, bull, 0.14);

  // Axis ticks at "nice" intervals
  const span = hi - lo;
  const raw = span / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const ticks: number[] = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) ticks.push(t);

  return (
    <figure className="relative w-full select-none" aria-label="Value compared with market price">
      <div className="relative h-[124px]">
        {/* P10–P90 band from the simulation */}
        {ok(p10) && ok(p90) && (
          <div
            className="absolute top-[56px] h-[14px] rounded-sm bg-brass-soft"
            style={{ left: x(p10), width: `calc(${x(p90)} - ${x(p10)})` }}
            title={`80% of simulated outcomes fall between ${money(p10, currency)} and ${money(p90, currency)}`}
          />
        )}
        {/* axis */}
        <div className="absolute inset-x-0 top-[62px] h-px bg-rule" />
        {/* bear–bull range */}
        {ok(bear) && ok(bull) && (
          <div
            className="absolute top-[61px] h-[3px] bg-ink/70"
            style={{ left: x(Math.min(bear, bull)), width: `calc(${x(Math.max(bear, bull))} - ${x(Math.min(bear, bull))})` }}
          />
        )}
        {ok(bear) && <Tick at={x(bear)} label="Bear" value={money(bear, currency, 0)} hideLabel={hideBearLabel} />}
        {ok(bull) && <Tick at={x(bull)} label="Bull" value={money(bull, currency, 0)} hideLabel={hideBullLabel} />}
        {ok(weighted) && (
          <div
            className="absolute top-[57px] size-[11px] -translate-x-1/2 rotate-45 border-2 border-brass bg-surface"
            style={{ left: x(weighted) }}
            title={`Probability-weighted ${money(weighted, currency)}`}
          />
        )}
        {ok(base) && (
          <div className="absolute top-0 -translate-x-1/2 text-center" style={{ left: x(base) }}>
            <div className="whitespace-nowrap text-[12px] font-semibold text-brass">Base {money(base, currency, 0)}</div>
            <div className="mx-auto h-[38px] w-px bg-brass" />
            <div className="mx-auto -mt-px size-[13px] rounded-full border-2 border-brass bg-brass" />
          </div>
        )}
        {price != null &&
          (priceOnTop ? (
            <div className="absolute top-0 -translate-x-1/2 text-center" style={{ left: x(price) }}>
              <div className="whitespace-nowrap text-[12px] font-semibold">Price {money(price, currency, 2)}</div>
              <div className="mx-auto h-[76px] w-[2px] bg-ink" />
            </div>
          ) : (
            <div className="absolute top-[30px] -translate-x-1/2 text-center" style={{ left: x(price) }}>
              <div className="mx-auto h-[62px] w-[2px] bg-ink" />
              <div className="whitespace-nowrap text-[12px] font-semibold">Price {money(price, currency, 2)}</div>
            </div>
          ))}
      </div>
      <div className="relative h-4 border-t border-rule/0 text-[11px] text-faint">
        {ticks.map((t) => (
          <span key={t} className="num absolute -translate-x-1/2" style={{ left: x(t) }}>
            {money(t, currency, 0)}
          </span>
        ))}
      </div>
      <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-muted">
        <Legend swatch={<span className="inline-block size-2.5 rounded-full bg-brass" />}>Base case</Legend>
        <Legend swatch={<span className="inline-block size-2 rotate-45 border-2 border-brass" />}>Probability-weighted {money(weighted, currency, 0)}</Legend>
        <Legend swatch={<span className="inline-block h-[3px] w-4 bg-ink/70" />}>Bear to bull</Legend>
        <Legend swatch={<span className="inline-block h-2.5 w-4 rounded-sm bg-brass-soft" />}>80% of simulated outcomes</Legend>
      </figcaption>
    </figure>
  );
}

function Tick({ at, label, value, hideLabel }: { at: string; label: string; value: string; hideLabel?: boolean }) {
  return (
    <div className="absolute top-[56px] -translate-x-1/2 text-center" style={{ left: at }} title={`${label} ${value}`}>
      <div className="mx-auto h-[14px] w-px bg-ink/70" />
      <div className={clsx("mt-5 whitespace-nowrap text-[11px] leading-tight text-muted", hideLabel && "invisible")}>
        {label}
        <br />
        <span className="num text-ink">{value}</span>
      </div>
    </div>
  );
}

function Legend({ swatch, children }: { swatch: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {swatch}
      {children}
    </span>
  );
}
