/**
 * Share counts lag stock splits: SEC cover pages only update with the next filing, and Yahoo's
 * shares figure can trail the split by days. A DCF divides equity value by shares, so a stale
 * count after an 8-for-1 split makes value per share 8x too high against a split-adjusted price.
 * These helpers put every share count on today's (post-split) basis.
 */

export interface Split {
  /** ISO date the split took effect (ex-date). */
  date: string;
  /** New shares per old share: 8 for 8-for-1, 0.1 for a 1-for-10 reverse split. */
  ratio: number;
}

/** Product of every split ratio after `asOf` (exclusive). 1 when nothing happened since. */
export function splitFactorSince(splits: Split[], asOf: string): number {
  return splits.filter((s) => s.date > asOf && s.ratio > 0 && Number.isFinite(s.ratio)).reduce((f, s) => f * s.ratio, 1);
}

const off = (a: number, b: number) => Math.abs(Math.log(a / b));
/** Within 25%: share counts move with buybacks and issuance, never by a split ratio. */
const CLOSE = Math.log(1.25);

export interface SharesInput {
  /** Yahoo's shares outstanding. No as-of date, can trail a split. */
  yahooShares: number | null;
  /** SEC cover-page shares and the date they were counted. */
  secShares: number | null;
  secAsOf: string | null;
  /** Yahoo market cap and price, a third view of the share count. */
  marketCap: number | null;
  price: number | null;
  splits: Split[];
  /** Today, ISO date. Splits in the last year are the ones a data feed may not have caught up with. */
  today: string;
}

export interface SharesResult {
  shares: number | null;
  source: "yahoo" | "sec" | "none";
  /** Set when the count was adjusted for a split, for the warning shown to the user. */
  adjustedFrom: number | null;
  split: Split | null;
}

/**
 * Pick the share count on today's basis.
 * 1. SEC shares are dated, so they are adjusted exactly for every split after their date.
 * 2. Yahoo's count is undated. If it disagrees with the split-adjusted SEC count (or with market
 *    cap / price) by about the size of a recent split, and applying that split brings it back in
 *    line, Yahoo hasn't caught up yet and the split is applied.
 */
export function reconcileShares(i: SharesInput): SharesResult {
  const yearAgo = new Date(Date.parse(i.today) - 365 * 86400_000).toISOString().slice(0, 10);
  const recent = i.splits.filter((s) => s.date > yearAgo && s.date <= i.today && s.ratio > 0 && s.ratio !== 1);
  const latest = recent.at(-1) ?? null;

  const secAdj = i.secShares && i.secShares > 0 ? i.secShares * (i.secAsOf ? splitFactorSince(i.splits, i.secAsOf) : 1) : null;
  const implied = i.marketCap && i.price && i.marketCap > 0 && i.price > 0 ? i.marketCap / i.price : null;
  const y = i.yahooShares && i.yahooShares > 0 ? i.yahooShares : null;

  if (y) {
    if (recent.length) {
      const recentFactor = recent.reduce((f, s) => f * s.ratio, 1);
      // Try the most recent split alone, then all splits in the last year.
      for (const factor of [latest!.ratio, recentFactor]) {
        const fixed = y * factor;
        for (const ref of [secAdj, implied]) {
          if (ref && off(fixed, ref) < CLOSE && off(fixed, ref) < off(y, ref)) {
            return { shares: fixed, source: "yahoo", adjustedFrom: y, split: latest };
          }
        }
      }
    }
    return { shares: y, source: "yahoo", adjustedFrom: null, split: null };
  }
  if (secAdj) {
    const adjusted = secAdj !== i.secShares;
    return { shares: secAdj, source: "sec", adjustedFrom: adjusted ? i.secShares : null, split: adjusted ? latest : null };
  }
  return { shares: null, source: "none", adjustedFrom: null, split: null };
}

/** "8-for-1" or "1-for-10". */
export function splitLabel(s: Split): string {
  if (s.ratio >= 1) return `${+s.ratio.toFixed(2)}-for-1`;
  return `1-for-${+(1 / s.ratio).toFixed(2)}`;
}
