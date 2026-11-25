import { describe, expect, it } from "vitest";
import { latestHolders, parseForm4, parseLegacySchedule13, parseSchedule13, summarizeInsiders, text } from "./ownership-parse";

const FORM4 = `<?xml version="1.0"?>
<ownershipDocument>
  <schemaVersion>X0508</schemaVersion>
  <documentType>4</documentType>
  <periodOfReport>2026-10-02</periodOfReport>
  <aff10b5One>1</aff10b5One>
  <issuer><issuerCik>0000320193</issuerCik><issuerName>Apple Inc.</issuerName><issuerTradingSymbol>AAPL</issuerTradingSymbol></issuer>
  <reportingOwner>
    <reportingOwnerId><rptOwnerCik>0001214156</rptOwnerCik><rptOwnerName>COOK TIMOTHY D</rptOwnerName></reportingOwnerId>
    <reportingOwnerRelationship><isDirector>1</isDirector><isOfficer>1</isOfficer><officerTitle>Chief Executive Officer</officerTitle></reportingOwnerRelationship>
  </reportingOwner>
  <nonDerivativeTable>
    <nonDerivativeTransaction>
      <securityTitle><value>Common Stock</value></securityTitle>
      <transactionDate><value>2026-10-02</value></transactionDate>
      <transactionCoding><transactionFormType>4</transactionFormType><transactionCode>F</transactionCode><equitySwapInvolved>0</equitySwapInvolved></transactionCoding>
      <transactionAmounts>
        <transactionShares><value>129963</value></transactionShares>
        <transactionPricePerShare><value>255.45</value></transactionPricePerShare>
        <transactionAcquiredDisposedCode><value>D</value></transactionAcquiredDisposedCode>
      </transactionAmounts>
      <postTransactionAmounts><sharesOwnedFollowingTransaction><value>3410000</value></sharesOwnedFollowingTransaction></postTransactionAmounts>
      <ownershipNature><directOrIndirectOwnership><value>D</value></directOrIndirectOwnership></ownershipNature>
    </nonDerivativeTransaction>
    <nonDerivativeTransaction>
      <securityTitle><value>Common Stock</value></securityTitle>
      <transactionDate><value>2026-10-03</value></transactionDate>
      <transactionCoding><transactionFormType>4</transactionFormType><transactionCode>S</transactionCode></transactionCoding>
      <transactionAmounts>
        <transactionShares><value>1,000</value><footnoteId id="F1"/></transactionShares>
        <transactionPricePerShare><value>256.00</value><footnoteId id="F2"/></transactionPricePerShare>
        <transactionAcquiredDisposedCode><value>D</value></transactionAcquiredDisposedCode>
      </transactionAmounts>
      <postTransactionAmounts><sharesOwnedFollowingTransaction><value>3409000</value></sharesOwnedFollowingTransaction></postTransactionAmounts>
      <ownershipNature><directOrIndirectOwnership><value>I</value></directOrIndirectOwnership><natureOfOwnership><value>By Trust</value></natureOfOwnership></ownershipNature>
    </nonDerivativeTransaction>
  </nonDerivativeTable>
  <footnotes><footnote id="F1">Sold under a plan.</footnote></footnotes>
</ownershipDocument>`;

const SC13G = `<?xml version="1.0" ?>
<edgarSubmission xmlns="http://www.sec.gov/edgar/schedule13g" xmlns:com="http://www.sec.gov/edgar/common">
  <headerData><submissionType>SCHEDULE 13G/A</submissionType></headerData>
  <formData>
    <coverPageHeader>
      <eventDateRequiresFilingThisStatement>09/30/2026</eventDateRequiresFilingThisStatement>
      <issuerInfo><issuerCik>0000320193</issuerCik><issuerName>Apple Inc.</issuerName><issuerCusip>037833100</issuerCusip></issuerInfo>
    </coverPageHeader>
    <coverPageHeaderReportingPersonDetails>
      <reportingCik>0000102909</reportingCik>
      <reportingPersonName>VANGUARD GROUP INC</reportingPersonName>
      <reportingPersonBeneficiallyOwnedAggregateNumberOfShares>1400000000.00</reportingPersonBeneficiallyOwnedAggregateNumberOfShares>
      <classPercent>9.4</classPercent>
    </coverPageHeaderReportingPersonDetails>
    <coverPageHeaderReportingPersonDetails>
      <reportingCik>0000999999</reportingCik>
      <reportingPersonName>Vanguard Sub Fund</reportingPersonName>
      <reportingPersonBeneficiallyOwnedAggregateNumberOfShares>10.00</reportingPersonBeneficiallyOwnedAggregateNumberOfShares>
      <classPercent>0.1</classPercent>
    </coverPageHeaderReportingPersonDetails>
  </formData>
</edgarSubmission>`;

describe("Form 4", () => {
  const txns = parseForm4(FORM4, { filed: "2026-10-04", url: "u", issuerCik: "0000320193" });

  it("reads each non-derivative transaction", () => {
    expect(txns).toHaveLength(2);
    const [f, s] = txns;
    expect(f).toMatchObject({ code: "F", shares: 129963, price: 255.45, acquired: false, direct: true, insider: "Cook Timothy D" });
    expect(f.role).toBe("Chief Executive Officer, Director");
    expect(s).toMatchObject({ code: "S", shares: 1000, value: 256000, direct: false, planned: true, ownedAfter: 3409000 });
  });

  it("skips filings about another issuer", () => {
    expect(parseForm4(FORM4, { filed: "x", url: "u", issuerCik: "123" })).toEqual([]);
  });

  it("unwraps <value> and ignores footnote refs", () => {
    expect(text("<a><b><value>12</value><footnoteId id='F1'/></b></a>", "a", "b")).toBe("12");
  });
});

describe("Schedule 13G", () => {
  it("takes the largest reporting person in a group", () => {
    const h = parseSchedule13(SC13G, { form: "SCHEDULE 13G/A", filed: "2026-10-10", url: "u" })!;
    expect(h).toMatchObject({ name: "Vanguard Group Inc", cik: "102909", percent: 9.4, shares: 1.4e9, eventDate: "2026-09-30", passive: true });
  });

  it("keeps each holder's latest filing, 5%+ first", () => {
    const base = { shares: 1, form: "SCHEDULE 13G", eventDate: null, passive: true, url: "u" };
    const out = latestHolders([
      { ...base, name: "A", cik: "1", percent: 6, filed: "2025-02-01" },
      { ...base, name: "A", cik: "1", percent: 4.2, filed: "2026-02-01" },
      { ...base, name: "B", cik: "2", percent: 5.5, filed: "2026-02-01" },
      { ...base, name: "C", cik: "3", percent: 8, filed: "2026-02-01" },
    ]);
    expect(out.map((h) => [h.name, h.percent])).toEqual([["C", 8], ["B", 5.5], ["A", 4.2]]);
  });
});

describe("insider summary", () => {
  it("counts open-market buys and sells only", () => {
    const t = (code: string, date: string, value: number, insider = "X", planned = false) => ({
      date, filed: date, insider, role: "", code, shares: value / 10, price: 10, value, acquired: code === "P", ownedAfter: null, direct: true, planned, url: "",
    });
    const s = summarizeInsiders(
      [t("P", "2026-11-01", 100, "A"), t("S", "2026-10-01", 300, "B", true), t("S", "2026-09-01", 100, "C"), t("A", "2026-11-01", 999), t("S", "2026-01-01", 5000)],
      new Date("2026-11-20T12:00:00Z"),
    );
    expect(s).toMatchObject({ buyValue: 100, sellValue: 400, buyers: 1, sellers: 2, plannedSellShare: 0.75 });
    expect(s.monthly).toHaveLength(6);
    expect(s.monthly.at(-1)).toEqual({ month: "2026-11", buy: 100, sell: 0 });
  });
});

const LEGACY_TXT = `SCHEDULE 13G
Amendment No: 15
Apple Inc.
(Name of Issuer)
CUSIP NO. 037833100
1. NAME OF REPORTING PERSON
I.R.S. IDENTIFICATION NO. OF ABOVE PERSON
BlackRock, Inc.
2. CHECK THE APPROPRIATE BOX IF A MEMBER OF A GROUP
(a) [ ]
(b) [X]
3. SEC USE ONLY
4. CITIZENSHIP OR PLACE OF ORGANIZATION
Delaware
9. AGGREGATE AMOUNT BENEFICIALLY OWNED BY EACH REPORTING PERSON
1,042,147,045
11. PERCENT OF CLASS REPRESENTED BY AMOUNT IN ROW 9
6.7%
12. TYPE OF REPORTING PERSON
HC`;

const LEGACY_HTML = `<html><body><table>
<tr><td>(1)</td><td>Names of reporting persons<br>The Vanguard Group - 23-1945930</td></tr>
<tr><td>(2)</td><td>Check the appropriate box if a member of a group</td></tr>
<tr><td>(9)</td><td>Aggregate amount beneficially owned by each reporting person<br>1,317,966,471</td></tr>
<tr><td>(11)</td><td>Percent of class represented by amount in Row (9)<br>8.47%</td></tr>
</table></body></html>`;

describe("legacy Schedule 13G", () => {
  const meta = { form: "SCHEDULE 13G/A", filed: "2024-02-13", url: "u" };
  it("reads plain-text cover pages", () => {
    expect(parseLegacySchedule13(LEGACY_TXT, meta)).toMatchObject({ name: "BlackRock, Inc.", percent: 6.7, shares: 1042147045, passive: true });
  });
  it("reads HTML cover pages", () => {
    expect(parseLegacySchedule13(LEGACY_HTML, meta)).toMatchObject({ name: "The Vanguard Group", percent: 8.47, shares: 1317966471 });
  });
  it("returns null when the cover page can't be read", () => {
    expect(parseLegacySchedule13("<p>Exhibit 99</p>", meta)).toBeNull();
  });
  it("matches a holder across old and new filings by name", () => {
    const old = parseLegacySchedule13(LEGACY_TXT, meta)!;
    const out = latestHolders([old, { ...old, cik: "1364742", name: "BlackRock Inc", percent: 7.1, filed: "2026-02-01" }]);
    expect(out).toHaveLength(1);
    expect(out[0].percent).toBe(7.1);
  });
});
