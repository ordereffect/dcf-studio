"use client";
import clsx from "clsx";
import { InfoTip } from "./InfoTip";
import type { LessonId } from "@/lib/learn";
import { money, signedPct } from "@/lib/format";

export interface Metric {
  label: string;
  info?: LessonId;
  value: string;
  sub?: string;
  tone?: "up" | "down";
}

export interface ValuationCardProps {
  currency: string;
  price: number | null;
  base: number;
  bear: number;
  bull: number;
  weighted: number;
  p10: number;
  p90: number;
  metrics: Metric[];
  className?: string;
}

/**
 * The valuation card: one glowing rail that puts the market price beside every estimate of
 * value, a Bear / Base / Bull strip, and the key metrics in a hairline grid.
 */
export function ValuationCard(p: ValuationCardProps) {
  return <Card {...p} />;
}

/* ------------------------------------------------------------------ */
/* Shared scale                                                        */
/* ------------------------------------------------------------------ */

const ok = (v: number | null | undefined): v is number => v != null && Number.isFinite(v);

function useScale({ price, base, bear, bull, weighted, p10, p90 }: ValuationCardProps) {
  const pts = [price, base, bear, bull, weighted, p10, p90].filter(ok);
  if (!pts.length) return null;
  let lo = Math.min(...pts);
  let hi = Math.max(...pts);
  const pad = (hi - lo || Math.abs(hi) || 1) * 0.1;
  lo = lo >= 0 ? Math.max(0, lo - pad) : lo - pad;
  hi = hi + pad;
  const frac = (v: number) => Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
  const x = (v: number) => `${frac(v) * 100}%`;
  const span = hi - lo;
  const raw = span / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const ticks: number[] = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) ticks.push(t);
  return { lo, hi, frac, x, ticks, crossesZero: lo < 0 && hi > 0 };
}

/** Shift a label so it never leaves the card: left-aligned at the left edge, right-aligned at the right. */
const edgeSafe = (f: number) => ({ transform: `translateX(-${f * 100}%)` });

function vsPrice(v: number, price: number | null) {
  return price && ok(v) ? v / price - 1 : NaN;
}

function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx("flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.14em] text-faint", className)}>{children}</div>;
}

/* ------------------------------------------------------------------ */
/* Quiet, precise. One glowing rail, labels as pills, hairline grid.   */
/* ------------------------------------------------------------------ */

function Card(p: ValuationCardProps) {
  const s = useScale(p);
  const { currency: ccy, price, base, bear, bull, weighted, p10, p90 } = p;
  const gap = vsPrice(base, price);

  return (
    <section
      data-tour="rail"
      className={clsx(
        "relative isolate flex min-w-0 flex-col overflow-hidden rounded-[7px] border border-rule bg-surface",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]",
        p.className,
      )}
    >
      {/* ambient light behind the rail */}
      <div aria-hidden className="pointer-events-none absolute -top-28 left-1/2 -z-10 h-56 w-3/4 -translate-x-1/2 rounded-full bg-brass/[0.07] blur-3xl" />

      <header className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-7">
        <Eyebrow>
          Valuation range
          <InfoTip id="rail" />
        </Eyebrow>
        {ok(gap) && (
          <span
            className={clsx(
              "num inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11.5px] font-medium",
              gap >= 0 ? "border-up/25 bg-up/[0.08] text-up" : "border-down/25 bg-down/[0.08] text-down",
            )}
          >
            <span className="relative flex size-1.5">
              <span className={clsx("absolute inline-flex size-full animate-ping rounded-full opacity-60", gap >= 0 ? "bg-up" : "bg-down")} />
              <span className={clsx("relative inline-flex size-1.5 rounded-full", gap >= 0 ? "bg-up" : "bg-down")} />
            </span>
            {signedPct(gap, 1)} to base case
          </span>
        )}
      </header>

      {/* Rail */}
      {s && (
        <div className="flex flex-1 flex-col justify-center px-5 py-5 sm:px-7">
          <figure className="relative h-[148px] select-none" aria-label="Value compared with market price">
            {/* gridlines */}
            {s.ticks.map((t) => (
              <div key={t} aria-hidden className="absolute bottom-[22px] top-[10px] w-px bg-gradient-to-b from-transparent via-white/[0.05] to-transparent" style={{ left: s.x(t) }} />
            ))}
            {s.crossesZero && <div className="absolute bottom-[22px] top-[10px] w-px bg-down/60" style={{ left: s.x(0) }} title="Zero" />}

            {/* track */}
            <div className="absolute inset-x-0 top-[62px] h-[6px] rounded-full bg-sunk" />
            {/* P10–P90 halo */}
            {ok(p10) && ok(p90) && (
              <div
                className="absolute top-[55px] h-[20px] rounded-full bg-brass/[0.09] ring-1 ring-inset ring-brass/20"
                style={{ left: s.x(p10), width: `calc(${s.x(p90)} - ${s.x(p10)})` }}
                title={`80% of simulated outcomes fall between ${money(p10, ccy)} and ${money(p90, ccy)}`}
              />
            )}
            {/* bear → bull */}
            {ok(bear) && ok(bull) && (
              <div
                className="absolute top-[62px] h-[6px] rounded-full bg-gradient-to-r from-brass/25 to-brass/80"
                style={{ left: s.x(Math.min(bear, bull)), width: `calc(${s.x(Math.max(bear, bull))} - ${s.x(Math.min(bear, bull))})` }}
                title={`Bear ${money(bear, ccy, 0)} to bull ${money(bull, ccy, 0)}`}
              />
            )}
            {[bear, bull].filter(ok).map((v) => (
              <div key={v} className="absolute top-[58px] h-[14px] w-[2px] -translate-x-1/2 rounded-full bg-ink/50" style={{ left: s.x(v) }} />
            ))}
            {/* weighted */}
            {ok(weighted) && (
              <div
                className="absolute top-[60px] size-[10px] -translate-x-1/2 rotate-45 rounded-[2px] border-[1.5px] border-brass bg-surface"
                style={{ left: s.x(weighted) }}
                title={`Probability-weighted ${money(weighted, ccy)}`}
              />
            )}
            {/* base: dot on the track, pill below */}
            {ok(base) && (
              <>
                <div className="absolute top-[71px] h-[26px] w-px -translate-x-1/2 bg-gradient-to-b from-brass to-brass/20" style={{ left: s.x(base) }} />
                <div className="absolute top-[97px]" style={{ left: s.x(base) }}>
                  <div
                    className="num whitespace-nowrap rounded-full border border-brass/35 bg-[color-mix(in_oklab,var(--brass)_14%,var(--surface))] px-2.5 py-[3px] text-[11px] font-semibold text-brass"
                    style={edgeSafe(s.frac(base))}
                  >
                    BASE {money(base, ccy, 0)}
                  </div>
                </div>
                <div
                  className="absolute top-[58px] size-[14px] -translate-x-1/2 rounded-full bg-brass shadow-[0_0_0_3px_var(--surface),0_0_18px_2px_color-mix(in_oklab,var(--brass)_55%,transparent)]"
                  style={{ left: s.x(base) }}
                />
              </>
            )}
            {/* price: pill above, stem to a dot on the track */}
            {ok(price) && (
              <>
                <div className="absolute top-[10px]" style={{ left: s.x(price) }}>
                  <div className="num whitespace-nowrap rounded-full bg-ink px-2.5 py-[3px] text-[11px] font-semibold text-surface" style={edgeSafe(s.frac(price))}>
                    PRICE {money(price, ccy, 2)}
                  </div>
                </div>
                <div className="absolute top-[32px] h-[30px] w-px -translate-x-1/2 bg-gradient-to-b from-ink/20 to-ink" style={{ left: s.x(price) }} />
                <div className="absolute top-[60px] size-[10px] -translate-x-1/2 rounded-full bg-ink shadow-[0_0_0_3px_var(--surface)]" style={{ left: s.x(price) }} />
              </>
            )}
            {/* axis */}
            <div className="absolute inset-x-0 bottom-0 h-[14px] text-[10.5px] text-faint">
              {s.ticks.map((t) => (
                <span key={t} className={clsx("num absolute", t === 0 && s.crossesZero && "text-down")} style={{ left: s.x(t), ...edgeSafe(s.frac(t)) }}>
                  {money(t, ccy, 0)}
                </span>
              ))}
            </div>
          </figure>

          <figcaption className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-faint">
            <LegendItem swatch={<span className="size-2 rounded-full bg-brass shadow-[0_0_6px_var(--brass)]" />}>Base</LegendItem>
            <LegendItem swatch={<span className="size-[7px] rotate-45 rounded-[1px] border-[1.5px] border-brass" />}>Weighted {money(weighted, ccy, 0)}</LegendItem>
            <LegendItem swatch={<span className="h-[4px] w-4 rounded-full bg-gradient-to-r from-brass/25 to-brass/80" />}>Bear → bull</LegendItem>
            <LegendItem swatch={<span className="h-2.5 w-4 rounded-full bg-brass/10 ring-1 ring-inset ring-brass/25" />}>80% of simulations</LegendItem>
          </figcaption>
        </div>
      )}

      {/* Scenario strip */}
      <div className="grid grid-cols-3 divide-x divide-rule border-t border-rule">
        {(
          [
            ["Bear", bear, "bg-ink/40"],
            ["Base", base, "bg-brass"],
            ["Bull", bull, "bg-brass/60"],
          ] as const
        ).map(([label, v, dot]) => {
          const d = vsPrice(v, price);
          return (
            <div key={label} className="px-5 py-3 sm:px-7">
              <Eyebrow>
                <span className={clsx("size-1.5 rounded-full", dot)} />
                {label}
              </Eyebrow>
              <div className="mt-1 flex items-baseline gap-2">
                <span className={clsx("num text-[16px] font-semibold tracking-tight", label === "Base" && "text-brass")}>{money(v, ccy, 0)}</span>
                {ok(d) && <span className={clsx("num text-[11px]", d >= 0 ? "text-up" : "text-down")}>{signedPct(d)}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Metrics: hairline grid */}
      <div className="grid grid-cols-2 gap-px border-t border-rule bg-rule sm:grid-cols-3">
        {p.metrics.map((m) => (
          <div key={m.label} className="bg-surface px-5 py-4 transition-colors hover:bg-[color-mix(in_oklab,var(--ink)_2%,var(--surface))] sm:px-7">
            <Eyebrow>
              {m.label}
              {m.info && <InfoTip id={m.info} />}
            </Eyebrow>
            <div className={clsx("num mt-1.5 text-[22px] font-semibold leading-none tracking-[-0.02em]", m.tone === "up" && "text-up", m.tone === "down" && "text-down")}>{m.value}</div>
            <div className="num mt-1.5 min-h-[15px] text-[11px] text-faint">{m.sub}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function LegendItem({ swatch, children }: { swatch: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="num inline-flex items-center gap-1.5">
      <span className="inline-flex w-4 items-center justify-center">{swatch}</span>
      {children}
    </span>
  );
}
