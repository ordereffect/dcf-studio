"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";

/** TradingView wants an exchange prefix to pick the right listing; Yahoo names exchanges its own way. */
export function tradingViewSymbol(ticker: string, exchange?: string): string {
  const e = (exchange ?? "").toLowerCase();
  const prefix = e.startsWith("nasdaq")
    ? "NASDAQ"
    : e.includes("arca") || e.includes("american") || e === "amex"
      ? "AMEX"
      : e === "nyse"
        ? "NYSE"
        : "";
  return prefix ? `${prefix}:${ticker}` : ticker;
}

function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const read = () => setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);
  return theme;
}

/** TradingView's free Advanced Chart widget. It's for looking only: the app can't read prices out of it. */
export function PriceChart({ ticker, exchange }: { ticker: string; exchange?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const [open, setOpen] = useState(true);
  const symbol = tradingViewSymbol(ticker, exchange);

  useEffect(() => {
    const el = host.current;
    if (!el || !open) return;
    el.innerHTML = '<div class="tradingview-widget-container__widget" style="height:100%;width:100%"></div>';
    const s = document.createElement("script");
    s.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    s.async = true;
    s.type = "text/javascript";
    s.innerHTML = JSON.stringify({
      symbol,
      interval: "D",
      range: "12M",
      timezone: "America/New_York",
      theme,
      style: "1",
      locale: "en",
      autosize: true,
      allow_symbol_change: false,
      hide_side_toolbar: true,
      withdateranges: true,
      details: false,
      calendar: false,
      backgroundColor: theme === "dark" ? "#161616" : "#ffffff",
      gridColor: theme === "dark" ? "rgba(42,42,42,0.6)" : "rgba(224,224,224,0.6)",
      support_host: "https://www.tradingview.com",
    });
    el.appendChild(s);
    return () => {
      el.innerHTML = "";
    };
  }, [symbol, theme, open]);

  if (ticker === "DEMO") return null;
  return (
    <section
      className={clsx(
        "flex min-w-0 flex-col self-start rounded-[3px] border border-rule bg-surface",
        open && "lg:aspect-square",
      )}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full shrink-0 items-center justify-between px-5 py-3 text-left text-[14px] font-bold"
      >
        Price chart
        <span className="flex items-center gap-2 text-[11.5px] font-normal text-faint">
          TradingView
          <ChevronDown className={clsx("size-4 transition-transform", open && "rotate-180")} aria-hidden />
        </span>
      </button>
      {open && <div ref={host} className="tradingview-widget-container h-[380px] border-t border-rule sm:h-[440px] lg:h-auto lg:min-h-0 lg:flex-1" />}
    </section>
  );
}
