"use client";
import { useEffect, useRef, useState } from "react";

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
  const symbol = tradingViewSymbol(ticker, exchange);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
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
      backgroundColor: theme === "dark" ? "#101010" : "#ffffff",
      gridColor: theme === "dark" ? "rgba(40,40,40,0.6)" : "rgba(224,224,224,0.6)",
      support_host: "https://www.tradingview.com",
    });
    el.appendChild(s);
    return () => {
      el.innerHTML = "";
    };
  }, [symbol, theme]);

  if (ticker === "DEMO") return null;
  return (
    <section className="flex min-w-0 flex-col self-start overflow-hidden rounded-[7px] border border-rule bg-surface lg:aspect-square" aria-label="Price chart">
      <div ref={host} className="tradingview-widget-container h-[380px] sm:h-[440px] lg:h-auto lg:min-h-0 lg:flex-1" />
    </section>
  );
}
