# DCF Studio

Value any US-listed stock in minutes. Type a ticker and DCF Studio reads up to ten years of annual filings from SEC EDGAR, pulls the live price and beta, and builds a driver-based discounted cash flow model you can bend.

## What's inside

- **Driver-based FCFF model.** Revenue growth with a fade to terminal growth, operating margin converging to a target, effective-to-marginal tax, and reinvestment through a sales-to-capital ratio. Mid-year or year-end discounting.
- **Terminal value** by perpetuity growth (with return on new capital, so growth has to be paid for) or by exit EV/EBIT, each cross-checked against the other.
- **WACC builder**: CAPM with the live 10-year Treasury, an editable equity risk premium, beta, cost of debt and target capital structure. Or set WACC directly.
- **Scenarios**: bear and bull as shifts from your base case, with probabilities and a weighted value.
- **Sensitivity tables**: WACC × terminal growth, growth × margin, WACC × exit multiple.
- **Market-implied (reverse DCF)**: the growth, margin or discount rate that today's price implies.
- **Value drivers and Monte Carlo**: a tornado of one-at-a-time swings and a simulated range of outcomes.
- **Brief for Claude**: one click copies a structured markdown brief (history, assumptions, scenarios, implied expectations, your notes) to paste into Claude and build the investment narrative.
- Models save automatically in your browser. No account, no database.

Non-US companies: v1 lets you model them by hand (enter base revenue, margins, balance sheet and price). Automatic global data is planned for v1.1.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # valuation engine tests
```

Open `/t/DEMO` for a fictional sample company that works offline.

## Deploy to Vercel (free Hobby plan)

1. Sign in to the Vercel account you want to use at [vercel.com](https://vercel.com).
2. **Add New → Project**, then **Import** this GitHub repository (grant Vercel access to it if asked).
3. Leave the framework preset as **Next.js** and all build settings at their defaults.
4. Under **Environment Variables** add `SEC_USER_AGENT` = `DCF Studio your-email@example.com`. The SEC refuses requests (HTTP 403) from clients that do not identify themselves with a contact address. Without it, history falls back to Yahoo Finance (fewer years).
5. Click **Deploy**. Every push to `main` redeploys automatically.

## Data sources

| Data | Source | Notes |
|---|---|---|
| Annual financials | SEC EDGAR XBRL company facts | Free, no key. 10-K, 20-F and 40-F filers. |
| Price, shares, beta, profile | Yahoo Finance via `yahoo-finance2` | Unofficial; if it fails, type the price in. |
| Risk-free rate | US 10-year Treasury yield (`^TNX`) | Falls back to 4.3%. |
| Equity risk premium | Default 4.3% (in line with Damodaran's implied ERP) | Edit in the app. |

## Methodology notes

- FCFF = NOPAT − reinvestment, where reinvestment = Δrevenue ÷ sales-to-capital.
- No tax is charged on operating losses (there is no NOL schedule yet).
- Perpetuity terminal FCFF = NOPAT₍N+1₎ × (1 − g ÷ ROIC_terminal), discounted at (WACC − g).
- With mid-year discounting, explicit flows are discounted at t − 0.5 and the perpetuity value at N − 0.5; an exit-multiple value is discounted at N.
- Equity value = EV + cash − debt (incl. leases) − minority interest + other adjustments.
- ROIC in the projection uses invested capital implied by the sales-to-capital ratio, so it stays consistent with the reinvestment assumption.

## Code map

```
src/lib/dcf/        valuation engine (pure TypeScript, unit tested)
src/lib/data/       SEC EDGAR + Yahoo Finance adapters (server only)
src/app/api/        /api/company/[ticker], /api/search
src/components/     workbench UI, value rail, tabs
```
