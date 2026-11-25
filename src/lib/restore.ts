import { deriveAssumptions } from "./dcf/defaults";
import type { Assumptions, CompanyData } from "./dcf/types";

/**
 * Inputs that come straight from filings and market data rather than from your judgment.
 * A saved model refreshes these from the latest data unless you typed your own value, so a
 * stock split, a new 10-K or a new beta reaches models you saved before it.
 */
export const DATA_KEYS = [
  "baseRevenue",
  "cash",
  "debt",
  "minorityInterest",
  "bookEquity",
  "sharesOutstanding",
  "riskFreeRate",
  "beta",
] as const;
export type DataKey = (typeof DATA_KEYS)[number];

export interface SavedLike {
  assumptions: Assumptions;
  /** The data values the model was built on when it was saved. Missing on models saved before this existed. */
  base?: Partial<Pick<Assumptions, DataKey>>;
  savedAt: string;
}

export function dataBase(a: Assumptions): Partial<Pick<Assumptions, DataKey>> {
  return Object.fromEntries(DATA_KEYS.map((k) => [k, a[k]])) as Partial<Pick<Assumptions, DataKey>>;
}

/** Keys whose saved value is your own entry rather than the data it was built on. */
export function overriddenKeys(saved: SavedLike, c: CompanyData): DataKey[] {
  // Older saves don't record their data, so nothing in them can be told apart from an entry: take fresh data.
  if (!saved.base) return [];
  return DATA_KEYS.filter((k) => {
    const v = saved.assumptions[k];
    if (v === undefined || v === saved.base![k]) return false;
    // A share count typed before a split is on the old basis and no longer right.
    if (k === "sharesOutstanding" && c.lastSplit && saved.savedAt.slice(0, 10) < c.lastSplit.date) return false;
    return true;
  });
}

/**
 * Rebuild a model from fresh company data and what you saved: your judgment calls and your own
 * entries stay, data-driven inputs take the latest values.
 */
export function restoreAssumptions(c: CompanyData, saved: SavedLike | null): { defaults: Assumptions; assumptions: Assumptions } {
  const auto = deriveAssumptions(c);
  // Models saved before the equity approach existed have no `approach`. If this company now
  // defaults to the equity approach, their margins and reinvestment mean something else, so
  // start the assumptions fresh (notes and scenarios are kept).
  const savedA = saved?.assumptions;
  const usable = savedA && (savedA.approach != null || auto.approach === "firm") ? savedA : null;
  const defaults = usable?.approach && usable.approach !== auto.approach ? deriveAssumptions(c, usable.approach) : auto;
  if (!usable || !saved) return { defaults, assumptions: defaults };
  const keep = new Set(overriddenKeys(saved, c));
  const fresh = Object.fromEntries(DATA_KEYS.filter((k) => !keep.has(k)).map((k) => [k, defaults[k]]));
  return { defaults, assumptions: { ...defaults, ...usable, ...fresh } };
}
