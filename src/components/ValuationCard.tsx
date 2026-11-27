"use client";
import clsx from "clsx";
import { InfoTip } from "./InfoTip";
import type { LessonId } from "@/lib/learn";
import { money, signedPct } from "@/lib/format";

/** A small picture that sits under a metric's value (direction B only). */
export type MetricViz =
  | { kind: "meter"; frac: number; warnAt?: number }
  | { kind: "compare"; a: { label: string; v: number }; b: { label: string; v: number } }
  | { kind: "delta"; v: number };

export interface Metric {
  label: string;
  info?: LessonId;
  value: string;
  sub?: string;
  tone?: "up" | "down";
  viz?: MetricViz;
}

export interface ValuationCardProps {
  variant: "a" | "b";
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

export function ValuationCard(p: ValuationCardProps) {
  return p.variant === "b" ? <CardB {...p} /> : <CardA {...p} />;
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
  const minor: number[] = [];
  for (let t = Math.ceil(lo / (step / 5)) * (step / 5); t <= hi; t += step / 5) minor.push(t);
  return { lo, hi, frac, x, ticks, minor, crossesZero: lo < 0 && hi > 0 };
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
/* Direction A: Instrument                                             */
/* Quiet, precise. One glowing rail, labels as pills, hairline grid.   */
/* ------------------------------------------------------------------ */

function CardA(p: ValuationCardProps) {
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
            {gap >= 0 ? `${signedPct(gap, 1)} to base case` : `${signedPct(gap, 1)} to base case`}
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

/* ------------------------------------------------------------------ */
/* Direction B: Gauge + bento                                          */
/* Leads with the verdict, a ruler-style gauge tinted by over/under    */
/* value, and metric tiles that each carry a tiny picture.             */
/* ------------------------------------------------------------------ */

function CardB(p: ValuationCardProps) {
  const s = useScale(p);
  const { currency: ccy, price, base, bear, bull, weighted, p10, p90 } = p;
  const gap = vsPrice(base, price);
  const pf = ok(price) && s ? s.frac(price) * 100 : null;

  return (
    <section
      data-tour="rail"
      className={clsx("relative flex min-w-0 flex-col gap-4 rounded-[7px] border border-rule bg-surface p-4 sm:p-5", p.className)}
    >
      {/* Verdict header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>
            Margin of safety
            <InfoTip id="upside" />
          </Eyebrow>
          <div className="mt-1.5 flex items-baseline gap-3">
            <span className={clsx("num text-[34px] font-bold leading-none tracking-[-0.04em]", !ok(gap) ? "text-faint" : gap >= 0 ? "text-up" : "text-down")}>
              {ok(gap) ? signedPct(gap, 1) : "–"}
            </span>
            {ok(price) && (
              <span className="num text-[11.5px] text-faint">
                base {money(base, ccy, 0)} vs price {money(price, ccy, 2)}
              </span>
            )}
          </div>
        </div>
        <div className="num flex rounded-[6px] border border-rule bg-sunk/60 p-[3px] text-[11.5px]">
          {(
            [
              ["Bear", bear],
              ["Base", base],
              ["Bull", bull],
            ] as const
          ).map(([label, v]) => (
            <div
              key={label}
              className={clsx(
                "rounded-[4px] px-3 py-1.5",
                label === "Base" ? "bg-surface text-ink shadow-[0_1px_0_0_rgba(255,255,255,0.05),0_1px_3px_rgba(0,0,0,0.5)]" : "text-muted",
              )}
            >
              <span className={clsx("mr-1.5", label === "Base" ? "text-brass" : "text-faint")}>{label}</span>
              <span className="font-semibold">{money(v, ccy, 0)}</span>
            </div>
          ))}
        </div>
      </header>

      {/* Gauge */}
      {s && (
        <figure className="flex flex-1 flex-col justify-center rounded-[6px] border border-rule bg-[color-mix(in_oklab,var(--sunk)_45%,var(--surface))] px-4 pb-3 pt-9 sm:px-6" aria-label="Value compared with market price">
          <div className="relative">
            {/* price caret + label */}
            {pf != null && (
              <div className="absolute -top-[30px]" style={{ left: `${pf}%` }}>
                <div className="num whitespace-nowrap text-[11px] font-semibold text-ink" style={edgeSafe(pf / 100)}>
                  Price {money(price, ccy, 2)}
                </div>
              </div>
            )}
            {/* bar: red where estimates sit below price, green above */}
            <div className="relative h-[34px] overflow-hidden rounded-[5px] border border-rule">
              {pf != null ? (
                <>
                  <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-down/[0.18] to-down/[0.04]" style={{ width: `${pf}%` }} />
                  <div className="absolute inset-y-0 right-0 bg-gradient-to-r from-up/[0.04] to-up/[0.18]" style={{ width: `${100 - pf}%` }} />
                </>
              ) : (
                <div className="absolute inset-0 bg-sunk" />
              )}
              {/* P10–P90 */}
              {ok(p10) && ok(p90) && (
                <div
                  className="absolute inset-y-[9px] rounded-[3px] bg-brass/15"
                  style={{ left: s.x(p10), width: `calc(${s.x(p90)} - ${s.x(p10)})` }}
                  title={`80% of simulated outcomes fall between ${money(p10, ccy)} and ${money(p90, ccy)}`}
                />
              )}
              {/* bear–bull bracket */}
              {ok(bear) && ok(bull) && (
                <div
                  className="absolute inset-y-[14px] border-x-2 border-ink/60"
                  style={{ left: s.x(Math.min(bear, bull)), width: `calc(${s.x(Math.max(bear, bull))} - ${s.x(Math.min(bear, bull))})` }}
                  title={`Bear ${money(bear, ccy, 0)} to bull ${money(bull, ccy, 0)}`}
                >
                  <div className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-ink/60" />
                </div>
              )}
              {/* weighted */}
              {ok(weighted) && (
                <div
                  className="absolute top-1/2 size-[9px] -translate-x-1/2 -translate-y-1/2 rotate-45 border-[1.5px] border-brass bg-surface"
                  style={{ left: s.x(weighted) }}
                  title={`Probability-weighted ${money(weighted, ccy)}`}
                />
              )}
              {/* base needle */}
              {ok(base) && (
                <div className="absolute inset-y-0 w-[3px] -translate-x-1/2 bg-brass shadow-[0_0_12px_var(--brass)]" style={{ left: s.x(base) }} title={`Base ${money(base, ccy)}`} />
              )}
              {s.crossesZero && <div className="absolute inset-y-0 w-px bg-down" style={{ left: s.x(0) }} />}
            </div>
            {/* price needle overlays the bar and pokes above it */}
            {pf != null && (
              <div className="pointer-events-none absolute -top-[10px] bottom-0" style={{ left: `${pf}%` }}>
                <div className="absolute -left-[5px] top-0 size-0 border-x-[5px] border-t-[6px] border-x-transparent border-t-ink" />
                <div className="absolute left-0 top-[4px] bottom-0 w-[2px] -translate-x-1/2 bg-ink" />
              </div>
            )}
            {/* ruler */}
            <div className="relative mt-1 h-[22px]">
              {s.minor.map((t) => (
                <div key={t} className="absolute top-0 h-[4px] w-px bg-faint/40" style={{ left: s.x(t) }} />
              ))}
              {s.ticks.map((t) => (
                <div key={t} className="absolute top-0" style={{ left: s.x(t) }}>
                  <div className="h-[7px] w-px bg-faint" />
                  <span className={clsx("num absolute top-[8px] text-[10.5px] text-faint", t === 0 && s.crossesZero && "text-down")} style={edgeSafe(s.frac(t))}>
                    {money(t, ccy, 0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <figcaption className="num mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-faint">
            <LegendItem swatch={<span className="h-3 w-[3px] bg-brass" />}>Base {money(base, ccy, 0)}</LegendItem>
            <LegendItem swatch={<span className="size-[7px] rotate-45 border-[1.5px] border-brass" />}>Weighted {money(weighted, ccy, 0)}</LegendItem>
            <LegendItem swatch={<span className="h-[8px] w-4 border-x-2 border-ink/60 bg-[linear-gradient(var(--ink),var(--ink))] bg-[length:100%_2px] bg-center bg-no-repeat opacity-60" />}>Bear → bull</LegendItem>
            <LegendItem swatch={<span className="h-2 w-4 rounded-[2px] bg-brass/25" />}>80% of simulations</LegendItem>
          </figcaption>
        </figure>
      )}

      {/* Bento metrics */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {p.metrics.map((m) => (
          <div
            key={m.label}
            className="flex min-h-[92px] flex-col justify-between gap-2 rounded-[6px] border border-rule bg-[color-mix(in_oklab,var(--sunk)_45%,var(--surface))] p-3.5 transition-colors hover:border-[color-mix(in_oklab,var(--ink)_14%,var(--surface))]"
          >
            <div>
              <Eyebrow>
                {m.label}
                {m.info && <InfoTip id={m.info} />}
              </Eyebrow>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className={clsx("num text-[20px] font-semibold leading-none tracking-[-0.02em]", m.tone === "up" && "text-up", m.tone === "down" && "text-down")}>{m.value}</span>
              </div>
              {m.sub && <div className="num mt-1 text-[11px] text-faint">{m.sub}</div>}
            </div>
            {m.viz && <Viz viz={m.viz} />}
          </div>
        ))}
      </div>
    </section>
  );
}

function Viz({ viz }: { viz: MetricViz }) {
  if (viz.kind === "meter") {
    const f = Math.min(1, Math.max(0, viz.frac));
    const warn = viz.warnAt != null && f > viz.warnAt;
    return (
      <div className="relative h-[5px] rounded-full bg-sunk">
        <div className={clsx("h-full rounded-full", warn ? "bg-down" : "bg-brass")} style={{ width: `${f * 100}%` }} />
        {viz.warnAt != null && <div className="absolute -top-[2px] h-[9px] w-px bg-ink/40" style={{ left: `${viz.warnAt * 100}%` }} title={`Caution above ${Math.round(viz.warnAt * 100)}%`} />}
      </div>
    );
  }
  if (viz.kind === "compare") {
    const max = Math.max(Math.abs(viz.a.v), Math.abs(viz.b.v)) || 1;
    return (
      <div className="grid gap-[3px]">
        {[viz.a, viz.b].map((r, i) => (
          <div key={r.label} className="flex items-center gap-2 text-[9.5px] uppercase tracking-[0.1em] text-faint">
            <span className="w-7 shrink-0">{r.label}</span>
            <div className="h-[4px] flex-1 rounded-full bg-sunk">
              <div className={clsx("h-full rounded-full", i === 0 ? "bg-brass" : "bg-ink/40")} style={{ width: `${(Math.max(0, r.v) / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    );
  }
  // delta: a centred bar that grows right (green) or left (red), capped at ±50%
  const d = Math.max(-0.5, Math.min(0.5, viz.v));
  return (
    <div className="relative h-[5px] rounded-full bg-sunk">
      <div className="absolute -top-[2px] left-1/2 h-[9px] w-px bg-ink/40" />
      <div
        className={clsx("absolute inset-y-0 rounded-full", d >= 0 ? "bg-up" : "bg-down")}
        style={d >= 0 ? { left: "50%", width: `${d * 100}%` } : { right: "50%", width: `${-d * 100}%` }}
      />
    </div>
  );
}
