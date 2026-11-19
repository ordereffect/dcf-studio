"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";

interface Hit {
  ticker: string;
  name: string;
}

export function TickerSearch({ size = "sm", autoFocus }: { size?: "sm" | "lg"; autoFocus?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim()) {
      setHits([]);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = (await r.json()) as Hit[];
        setHits(Array.isArray(data) ? data : []);
        setActive(0);
      } catch {
        setHits([]);
      }
    }, 150);
  }, [q]);

  const go = (t: string) => {
    if (!t.trim()) return;
    setOpen(false);
    setQ("");
    router.push(`/t/${encodeURIComponent(t.trim().toUpperCase())}`);
  };

  const lg = size === "lg";
  return (
    <div className="relative w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(hits[active]?.ticker ?? q);
        }}
        className={clsx(
          "flex items-center gap-3 border-rule bg-surface focus-within:border-[var(--focus)]",
          lg ? "rounded-[3px] border px-5 py-4" : "rounded-[3px] border px-3 py-1.5",
        )}
      >
        <span className={clsx("shrink-0 font-bold text-brass", lg ? "text-2xl" : "text-sm")} aria-hidden>
          &gt;
        </span>
        <input
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, hits.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Escape") setOpen(false);
          }}
          placeholder={lg ? "ticker or company name_" : "value another ticker"}
          aria-label="Search for a ticker"
          role="combobox"
          aria-expanded={open && hits.length > 0}
          aria-controls="ticker-results"
          className={clsx("w-full bg-transparent outline-none placeholder:text-faint focus-visible:outline-none", lg ? "text-2xl font-medium" : "text-sm")}
        />
      </form>
      {open && hits.length > 0 && (
        <ul
          id="ticker-results"
          role="listbox"
          className="absolute z-30 mt-1 w-full overflow-hidden rounded-[3px] border border-rule bg-surface"
        >
          {hits.map((h, i) => (
            <li key={h.ticker} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(h.ticker)}
                onMouseEnter={() => setActive(i)}
                className={clsx("flex w-full items-baseline gap-3 px-4 py-2 text-left", i === active && "bg-sunk")}
              >
                <span className="w-16 shrink-0 font-bold text-brass">{h.ticker}</span>
                <span className="truncate text-sm text-muted">{h.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
