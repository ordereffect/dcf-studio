import "server-only";
import { loadTickerMap, secHeaders } from "./edgar";
import {
  latestHolders,
  parseForm4,
  parseSchedule13,
  summarizeInsiders,
  type InsiderTxn,
  type MajorHolder,
  type OwnershipData,
} from "./ownership-parse";

const MONTHS = 6;
const MAX_FORM4 = 60; // most recent Form 4s read per request
const MAX_SCHEDULE13 = 25;
const SCHEDULE13_YEARS = 3; // 13G holders refile yearly; older filings are stale

interface Recent {
  accessionNumber: string[];
  filingDate: string[];
  form: string[];
  primaryDocument: string[];
}

// SEC allows 10 requests a second per client. Space request starts to stay well under it.
let nextSlot = 0;
async function throttle() {
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + 130;
  if (wait) await new Promise((r) => setTimeout(r, wait));
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k]);
      }
    }),
  );
  return out;
}

/** Filing documents never change, so they're cached for a month. */
async function fetchDoc(url: string): Promise<string | null> {
  await throttle();
  try {
    const res = await fetch(url, {
      headers: { ...secHeaders, Accept: "application/xml,text/xml,*/*" },
      next: { revalidate: 30 * 86400 },
    });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

function docUrls(cik: string, acc: string, primary: string) {
  const base = `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${acc.replace(/-/g, "")}`;
  // primaryDocument points at SEC's rendered view (xslF345X05/…); the raw XML sits beside it.
  return { raw: `${base}/${primary.replace(/^xsl[^/]+\//, "")}`, view: `${base}/${primary}` };
}

export async function getOwnership(ticker: string): Promise<OwnershipData | null> {
  const t = ticker.trim().toUpperCase();
  const map = await loadTickerMap();
  const entry = map.get(t) ?? map.get(t.replace(".", "-"));
  if (!entry) return null;
  const cik = String(entry.cik_str).padStart(10, "0");

  await throttle();
  const res = await fetch(`https://data.sec.gov/submissions/CIK${cik}.json`, { headers: secHeaders, next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`SEC submissions returned ${res.status}${res.status === 403 ? " (set SEC_USER_AGENT with a contact email)" : ""}`);
  const sub = (await res.json()) as { name: string; filings: { recent: Recent } };
  const r = sub.filings.recent;

  const now = new Date();
  const since = new Date(now);
  since.setMonth(since.getMonth() - MONTHS);
  const sinceIso = since.toISOString().slice(0, 10);
  const since13 = `${now.getFullYear() - SCHEDULE13_YEARS}${now.toISOString().slice(4, 10)}`;

  const form4: { acc: string; filed: string; doc: string }[] = [];
  const sched: { acc: string; filed: string; doc: string; form: string }[] = [];
  let legacy13 = 0;
  for (let i = 0; i < r.form.length; i++) {
    const form = r.form[i];
    const filed = r.filingDate[i];
    const doc = r.primaryDocument[i] ?? "";
    if (form === "4" && filed >= sinceIso) form4.push({ acc: r.accessionNumber[i], filed, doc });
    else if (/^SCHEDULE 13[DG]/.test(form) && filed >= since13) sched.push({ acc: r.accessionNumber[i], filed, doc, form });
    else if (/^SC 13[DG]/.test(form) && filed >= since13) legacy13++;
  }

  const notes: string[] = [];
  if (form4.length > MAX_FORM4)
    notes.push(`${form4.length} Form 4 filings in the last ${MONTHS} months; the ${MAX_FORM4} most recent are included.`);

  const [insiderLists, holderList] = await Promise.all([
    mapLimit(form4.slice(0, MAX_FORM4), 4, async (f) => {
      if (!/\.xml$/i.test(f.doc)) return [] as InsiderTxn[];
      const u = docUrls(cik, f.acc, f.doc);
      const xml = await fetchDoc(u.raw);
      return xml ? parseForm4(xml, { filed: f.filed, url: u.view, issuerCik: cik }) : [];
    }),
    mapLimit(sched.slice(0, MAX_SCHEDULE13), 3, async (f) => {
      if (!/\.xml$/i.test(f.doc)) return null;
      const u = docUrls(cik, f.acc, f.doc);
      const xml = await fetchDoc(u.raw);
      return xml ? parseSchedule13(xml, { form: f.form, filed: f.filed, url: u.view }) : null;
    }),
  ]);

  const insiders = insiderLists.flat().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const holders = latestHolders(holderList.filter((h): h is MajorHolder => h != null));
  if (legacy13 && !holders.length)
    notes.push("Large holders filed in SEC's older text format (before December 2024), which isn't read here.");

  return {
    ticker: entry.ticker,
    cik,
    name: sub.name,
    insiders,
    summary: summarizeInsiders(insiders, now, MONTHS),
    holders,
    formsScanned: Math.min(form4.length, MAX_FORM4) + Math.min(sched.length, MAX_SCHEDULE13),
    notes,
    fetchedAt: now.toISOString(),
  };
}
