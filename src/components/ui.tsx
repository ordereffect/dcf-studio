import clsx from "clsx";
import { InfoTip } from "./InfoTip";
import type { LessonId } from "@/lib/learn";

export function Panel({
  title,
  note,
  children,
  className,
  info,
  tour,
}: {
  title?: string;
  note?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  info?: LessonId;
  tour?: string;
}) {
  return (
    <section data-tour={tour} className={clsx("rounded-[3px] border border-rule bg-surface p-5", className)}>
      {(title || note) && (
        <header className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          {title && (
            <h2 className="flex items-center gap-2 text-[14px] font-bold">
              {title}
              {info && <InfoTip id={info} />}
            </h2>
          )}
          {note && <p className="text-[11.5px] text-faint">{note}</p>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone,
  info,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "up" | "down";
  info?: LessonId;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[12.5px] text-muted">
        {label}
        {info && <InfoTip id={info} />}
      </div>
      <div className={clsx("num text-[20px] font-semibold leading-tight", tone === "up" && "text-up", tone === "down" && "text-down")}>{value}</div>
      {sub && <div className="num text-[12px] text-faint">{sub}</div>}
    </div>
  );
}

export const chartColors = {
  ink: "var(--ink)",
  muted: "var(--muted)",
  faint: "var(--faint)",
  rule: "var(--rule)",
  brass: "var(--brass)",
  brassSoft: "var(--brass-soft)",
  up: "var(--up)",
  down: "var(--down)",
};

export const tooltipStyle = {
  contentStyle: {
    background: "var(--surface)",
    border: "1px solid var(--rule)",
    borderRadius: 8,
    fontSize: 12,
    color: "var(--ink)",
  },
  labelStyle: { color: "var(--muted)" },
  cursor: { fill: "var(--sunk)" },
};
