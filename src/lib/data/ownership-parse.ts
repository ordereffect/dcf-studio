/**
 * Parsers for SEC ownership filings. Pure functions (no network), shared by the API and tests.
 *  - Form 4: insider transactions (officers, directors, 10% owners), filed within 2 business days.
 *  - Schedule 13G / 13D: anyone owning more than 5% of a class. XML since December 2024.
 */

export interface InsiderTxn {
  date: string; // YYYY-MM-DD
  filed: string;
  insider: string;
  role: string;
  code: string; // SEC transaction code: P, S, A, M, F, G…
  shares: number;
  price: number | null;
  value: number | null;
  acquired: boolean; // A = acquired, D = disposed
  ownedAfter: number | null;
  direct: boolean;
  planned: boolean; // made under a Rule 10b5-1 trading plan
  url: string;
}

export interface MajorHolder {
  name: string;
  cik: string | null;
  percent: number | null; // of the class, e.g. 8.4 = 8.4%
  shares: number | null;
  form: string; // SCHEDULE 13G, SCHEDULE 13D/A…
  eventDate: string | null; // YYYY-MM-DD
  filed: string;
  passive: boolean; // 13G (passive) vs 13D (activist / control intent)
  url: string;
}

export interface InsiderSummary {
  months: number;
  buyValue: number;
  sellValue: number;
  buyShares: number;
  sellShares: number;
  buyers: number;
  sellers: number;
  plannedSellShare: number | null; // share of sale value made under 10b5-1 plans
  monthly: { month: string; buy: number; sell: number }[];
}

export interface OwnershipData {
  ticker: string;
  cik: string;
  name: string;
  insiders: InsiderTxn[];
  summary: InsiderSummary;
  holders: MajorHolder[];
  formsScanned: number;
  notes: string[];
  fetchedAt: string;
}

export const CODE_LABELS: Record<string, string> = {
  P: "Buy",
  S: "Sell",
  A: "Grant",
  M: "Option exercise",
  X: "Option exercise",
  C: "Conversion",
  F: "Tax withholding",
  G: "Gift",
  D: "Return to issuer",
  J: "Other",
  W: "Inheritance",
  I: "Plan trade",
  K: "Swap",
  V: "Voluntary report",
  L: "Small acquisition",
  Z: "Voting trust",
  E: "Expired",
  H: "Expired",
  O: "Option exercise",
  U: "Tender",
};

// ── Minimal XML helpers. SEC ownership XML is flat and well-formed; a full parser isn't needed. ──

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
export function decode(s: string) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e: string) => {
      if (e[0] === "#") {
        const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(n) ? String.fromCodePoint(n) : m;
      }
      return ENTITIES[e.toLowerCase()] ?? m;
    })
    .trim();
}

/** Inner text of every <tag>…</tag>, ignoring namespace prefixes. */
export function blocks(xml: string, tag: string): string[] {
  const re = new RegExp(`<(?:[\\w-]+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w-]+:)?${tag}>`, "g");
  return [...xml.matchAll(re)].map((m) => m[1]);
}

/** Text at a path of tags. For Form 4 fields wrapped in <value>, the wrapper is unwrapped. */
export function text(xml: string | undefined, ...path: string[]): string | null {
  let cur: string | undefined = xml;
  for (const t of path) {
    if (cur == null) return null;
    cur = blocks(cur, t)[0];
  }
  if (cur == null) return null;
  const inner = blocks(cur, "value")[0];
  const out = decode((inner ?? cur).replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
  return out === "" ? null : out;
}

function num(s: string | null): number | null {
  if (s == null) return null;
  const n = parseFloat(s.replace(/[,$%\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

const truthy = (s: string | null) => s != null && /^(1|true|y)$/i.test(s.trim());

/** 05/11/2023 or 2023-05-11 → 2023-05-11 */
export function isoDate(s: string | null): string | null {
  if (!s) return null;
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (us) return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return iso ? iso[1] : null;
}

/** Title-case SEC's upper-case names ("COOK TIMOTHY D" stays in SEC order, just readable). */
export function prettyName(s: string) {
  if (s !== s.toUpperCase()) return s;
  return s
    .toLowerCase()
    .replace(/\b([a-z])/g, (c) => c.toUpperCase())
    .replace(/\b(Llc|Lp|Na|Usa|Ii|Iii|Iv)\b/g, (w) => w.toUpperCase());
}

// ── Form 4 ──

export function parseForm4(xml: string, meta: { filed: string; url: string; issuerCik?: string }): InsiderTxn[] {
  const issuerCik = text(xml, "issuer", "issuerCik");
  if (meta.issuerCik && issuerCik && Number(issuerCik) !== Number(meta.issuerCik)) return [];

  const owners = blocks(xml, "reportingOwner");
  const names = owners.map((o) => prettyName(text(o, "rptOwnerName") ?? "Unknown"));
  const rel = owners[0] ?? "";
  const roles: string[] = [];
  if (truthy(text(rel, "isOfficer"))) roles.push(text(rel, "officerTitle") ?? "Officer");
  if (truthy(text(rel, "isDirector"))) roles.push("Director");
  if (truthy(text(rel, "isTenPercentOwner"))) roles.push("10% owner");
  if (!roles.length && truthy(text(rel, "isOther"))) roles.push(text(rel, "otherText") ?? "Other");

  // Rule 10b5-1 checkbox (2023+), or the plan mentioned in a footnote on older filings.
  const planned = truthy(text(xml, "aff10b5One")) || /10b5-1/i.test(blocks(xml, "footnotes")[0] ?? "");

  const out: InsiderTxn[] = [];
  for (const t of blocks(xml, "nonDerivativeTransaction")) {
    const shares = num(text(t, "transactionAmounts", "transactionShares"));
    const date = isoDate(text(t, "transactionDate"));
    if (shares == null || !date) continue;
    const price = num(text(t, "transactionAmounts", "transactionPricePerShare"));
    out.push({
      date,
      filed: meta.filed,
      insider: names.join(" & "),
      role: roles.join(", ") || "Insider",
      code: (text(t, "transactionCoding", "transactionCode") ?? "?").toUpperCase(),
      shares,
      price: price && price > 0 ? price : null,
      value: price && price > 0 ? price * shares : null,
      acquired: (text(t, "transactionAmounts", "transactionAcquiredDisposedCode") ?? "A").toUpperCase() === "A",
      ownedAfter: num(text(t, "postTransactionAmounts", "sharesOwnedFollowingTransaction")),
      direct: (text(t, "ownershipNature", "directOrIndirectOwnership") ?? "D").toUpperCase() === "D",
      planned,
      url: meta.url,
    });
  }
  return out;
}

// ── Schedule 13G / 13D ──

export function parseSchedule13(xml: string, meta: { form: string; filed: string; url: string }): MajorHolder | null {
  const persons = [...blocks(xml, "coverPageHeaderReportingPersonDetails"), ...blocks(xml, "reportingPersonInfo")];
  if (!persons.length) return null;
  const parsed = persons.map((p) => ({
    name: prettyName(text(p, "reportingPersonName") ?? "Unknown"),
    cik: text(p, "reportingCik") ?? text(p, "reportingPersonCIK"),
    percent: num(text(p, "classPercent") ?? text(p, "percentOfClass")),
    shares: num(text(p, "reportingPersonBeneficiallyOwnedAggregateNumberOfShares") ?? text(p, "aggregateAmountOwned")),
  }));
  // Group filings list each entity; the parent with the largest stake speaks for the group.
  const top = parsed.reduce((a, b) => ((b.percent ?? -1) > (a.percent ?? -1) ? b : a));
  const event =
    text(xml, "eventDateRequiresFilingThisStatement") ?? text(xml, "dateOfEvent") ?? null;
  return {
    ...top,
    cik: top.cik ? String(Number(top.cik)) : null,
    form: meta.form,
    eventDate: isoDate(event),
    filed: meta.filed,
    passive: !/13D/i.test(meta.form),
    url: meta.url,
  };
}

/**
 * Schedule 13G/13D filed before December 2024 are free text or HTML. The cover page still follows
 * SEC's numbered rows, so the first reporting person (usually the parent) can be read from them.
 */
export function parseLegacySchedule13(doc: string, meta: { form: string; filed: string; url: string }): MajorHolder | null {
  const t = decode(doc.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/&nbsp;/gi, " ").replace(/\s+/g, " ");
  const nameM = t.match(/NAMES? OF REPORTING PERSONS?\.?:?\s*(.{2,200})/i);
  const pctM = t.match(/PERCENT OF CLASS REPRESENTED BY AMOUNT IN ROW\s*\(?\s*(?:9|11)\s*\)?\.?\s*:?\s*(?:\(\s*\d+\s*\)\s*)?([\d.]+)\s*%/i);
  if (!nameM || !pctM) return null;
  const name = nameM[1]
    .replace(/^(?:S\.S\. OR )?I\.?R\.?S\.? IDENTIFICATION NOS?\.? OF (?:THE )?ABOVE PERSONS?(?: \(?ENTITIES ONLY\)?)?\.?:?\s*/i, "")
    .split(/\s(?:\(?2\)?\.?\s*CHECK|CHECK THE APPROPRIATE|-?\s*\(?\d{2}-\d{7}\)?|I\.?R\.?S\.?|2\.\s)/i)[0]
    .replace(/^[\s:.\-]+|[\s:,\-]+$/g, "")
    .trim();
  const percent = parseFloat(pctM[1]);
  if (!name || name.length > 100 || !Number.isFinite(percent) || percent > 100) return null;
  const sharesM = t.match(/AGGREGATE AMOUNT BENEFICIALLY OWNED BY EACH REPORTING PERSON\.?\s*:?\s*([\d,]{1,20})/i);
  return {
    name: prettyName(name),
    cik: null,
    percent,
    shares: sharesM ? num(sharesM[1]) : null,
    form: meta.form,
    eventDate: null,
    filed: meta.filed,
    passive: !/13D/i.test(meta.form),
    url: meta.url,
  };
}

const holderKey = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(the|inc|incorporated|corp|corporation|llc|lp|ltd|co|plc)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Keep each holder's latest filing, largest stake first. Holders whose latest filing is below 5% sort last. */
export function latestHolders(all: MajorHolder[]): MajorHolder[] {
  const byKey = new Map<string, MajorHolder>();
  for (const h of all) {
    // By name: older text filings carry no CIK for the holder.
    const k = holderKey(h.name);
    const prev = byKey.get(k);
    if (!prev || h.filed > prev.filed) byKey.set(k, h);
  }
  return [...byKey.values()].sort((a, b) => {
    const ax = (a.percent ?? 0) >= 5 ? 1 : 0;
    const bx = (b.percent ?? 0) >= 5 ? 1 : 0;
    return bx - ax || (b.percent ?? 0) - (a.percent ?? 0);
  });
}

// ── Summary ──

/** Open-market buys (P) and sells (S) only: grants, exercises and tax withholding aren't signals. */
export function summarizeInsiders(txns: InsiderTxn[], asOf: Date, months = 6): InsiderSummary {
  const start = new Date(asOf);
  start.setMonth(start.getMonth() - months);
  const since = start.toISOString().slice(0, 10);
  const recent = txns.filter((t) => t.date >= since && (t.code === "P" || t.code === "S"));
  const buys = recent.filter((t) => t.code === "P");
  const sells = recent.filter((t) => t.code === "S");
  const sumV = (xs: InsiderTxn[]) => xs.reduce((a, t) => a + (t.value ?? 0), 0);
  const sumS = (xs: InsiderTxn[]) => xs.reduce((a, t) => a + t.shares, 0);
  const sellValue = sumV(sells);

  const monthly: InsiderSummary["monthly"] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(asOf.getFullYear(), asOf.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const inMonth = recent.filter((t) => t.date.startsWith(key));
    monthly.push({ month: key, buy: sumV(inMonth.filter((t) => t.code === "P")), sell: sumV(inMonth.filter((t) => t.code === "S")) });
  }

  return {
    months,
    buyValue: sumV(buys),
    sellValue,
    buyShares: sumS(buys),
    sellShares: sumS(sells),
    buyers: new Set(buys.map((t) => t.insider)).size,
    sellers: new Set(sells.map((t) => t.insider)).size,
    plannedSellShare: sellValue > 0 ? sumV(sells.filter((t) => t.planned)) / sellValue : null,
    monthly,
  };
}
