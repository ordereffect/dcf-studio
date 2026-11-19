export const pct = (x: number | null | undefined, d = 1) =>
  x == null || !Number.isFinite(x) ? "–" : `${(x * 100).toFixed(d)}%`;

export const mult = (x: number | null | undefined, d = 1) =>
  x == null || !Number.isFinite(x) ? "–" : `${x.toFixed(d)}×`;

const SYMBOLS: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", JPY: "¥", CHF: "CHF ", CAD: "C$", CNY: "¥" };
export const sym = (ccy = "USD") => SYMBOLS[ccy] ?? `${ccy} `;

export const money = (x: number | null | undefined, ccy = "USD", d = 2) =>
  x == null || !Number.isFinite(x)
    ? "–"
    : `${x < 0 ? "−" : ""}${sym(ccy)}${Math.abs(x).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}`;

/** Compact large numbers: 1.23B, 456.7M. */
export const big = (x: number | null | undefined, ccy?: string) => {
  if (x == null || !Number.isFinite(x)) return "–";
  const a = Math.abs(x);
  const s = x < 0 ? "−" : "";
  const p = ccy ? sym(ccy) : "";
  if (a >= 1e12) return `${s}${p}${(a / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `${s}${p}${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${s}${p}${(a / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${s}${p}${(a / 1e3).toFixed(1)}K`;
  return `${s}${p}${a.toFixed(0)}`;
};

/** Millions with thousands separators, for statement tables. */
export const mm = (x: number | null | undefined) =>
  x == null || !Number.isFinite(x)
    ? "–"
    : (x < 0 ? "(" : "") + Math.abs(x / 1e6).toLocaleString("en-US", { maximumFractionDigits: 0 }) + (x < 0 ? ")" : "");

export const signedPct = (x: number, d = 0) =>
  !Number.isFinite(x) ? "–" : `${x >= 0 ? "+" : "−"}${Math.abs(x * 100).toFixed(d)}%`;
