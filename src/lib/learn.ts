/**
 * Teaching content: one entry per input and output. Tooltips and the guided tour both read
 * from here, so the explanation of a number is written once.
 *
 * Each entry: what it is, how a disciplined analyst thinks about it, and a rule of thumb.
 */
export interface Lesson {
  title: string;
  what: string;
  think?: string;
  rule?: string;
}

export const LESSONS = {
  price: {
    title: "Market price",
    what: "What the market will pay for one share today. It is your starting point, not your answer.",
    think:
      "Expectations investing (Mauboussin & Rappaport) starts here: the price already embeds a set of beliefs about growth, margins and risk. Your job is to judge whether those beliefs are too high or too low.",
    rule: "Never ask 'is this a good company?' alone. Ask 'is it better than the price assumes?'",
  },
  intrinsic: {
    title: "Intrinsic value per share",
    what: "The present value of all the cash the business will generate for its owners, divided by shares outstanding.",
    think:
      "This is Buffett's definition of value: the discounted cash that can be taken out of a business over its remaining life. It is an estimate, a range really, never a precise number.",
    rule: "Treat it as the centre of a range. The bear-to-bull band matters more than the decimal places.",
  },
  upside: {
    title: "Margin of safety",
    what: "How far value sits above (or below) the price.",
    think:
      "Graham and Buffett insist on buying with a margin of safety because your inputs will be wrong. The wider your uncertainty, the bigger the discount you should demand.",
    rule: "Many value investors want 25–50% upside on the base case before acting, more for fragile businesses.",
  },
  rail: {
    title: "Value rail",
    what: "Price against every estimate: base, probability-weighted, bear to bull, and the middle 80% of simulated outcomes.",
    think:
      "Read it like a risk/reward picture. If the price sits near the bear case, the downside is limited; if it sits beyond the bull case, you need everything to go right.",
  },
  history: {
    title: "Reported history",
    what: "Up to ten years of revenue, margins, taxes, reinvestment and returns from annual filings.",
    think:
      "Understand the business before forecasting it. Look for the shape of growth, how cyclical margins are, and above all whether returns on capital have stayed above the cost of capital. That persistence is what a moat looks like in numbers.",
    rule: "If you can't explain why the last 10 years looked the way they did, you can't forecast the next 10.",
  },
  revenueGrowth: {
    title: "Revenue growth",
    what: "Annual growth during the high-growth period, before it fades to terminal growth.",
    think:
      "Use base rates (Mauboussin): very few large companies sustain double-digit growth for a decade, and growth rates regress toward the economy over time. Start from the outside view, then adjust for what is genuinely different about this company.",
    rule: "Check your number against the 3, 5 and 10-year history and against the company's size. Bigger companies grow slower.",
  },
  highGrowthYears: {
    title: "Years at that growth",
    what: "How long the company keeps its current growth rate before it starts to fade.",
    think:
      "This is the competitive advantage period in disguise: how long can the business outgrow the economy before competitors, saturation or size catch up?",
    rule: "3–5 years for most companies; longer only with a clear, durable advantage.",
  },
  forecastYears: {
    title: "Forecast length",
    what: "How many years are modelled explicitly before the terminal value takes over.",
    think: "Long enough for the company to reach a steady state: growth near the economy and margins at their mature level.",
    rule: "10 years for growing companies, 5 for mature ones.",
  },
  currentMargin: {
    title: "Operating margin today",
    what: "Operating income (EBIT) divided by revenue in the latest year. If the filings don't report operating income, it starts from pre-tax income instead.",
    think: "Your starting point. Check whether it is a normal year or a peak or trough before projecting from it.",
  },
  pretaxMargin: {
    title: "Pre-tax margin today",
    what: "Pre-tax income divided by revenue in the latest year. For a financial company, interest paid is an operating cost, so pre-tax income is the right profit line.",
    think: "Check whether credit losses, trading gains or one-offs made the latest year unusual.",
  },
  targetPretaxMargin: {
    title: "Target pre-tax margin",
    what: "The pre-tax margin you expect the business to settle at once mature.",
    think: "Anchor it to the company's own history and to the best-run peers. For lenders, a normal year includes normal credit losses.",
  },
  salesToEquity: {
    title: "Sales to equity",
    what: "Revenue added per $1 of new book equity. It sets how much of each year's earnings must be retained to fund growth.",
    think:
      "Financials grow on capital: regulators and counterparties require equity behind every loan, trade or policy. The default uses revenue added over equity added in recent years.",
    rule: "Lower it for capital-hungry lenders; higher for asset-light brokers and asset managers.",
  },
  terminalRoe: {
    title: "Return on new equity",
    what: "The return the company earns on equity retained in the terminal period.",
    think: "If it equals the cost of equity, growth adds nothing to value. A durable franchise (cheap deposits, scale, brand) keeps it above.",
    rule: "Set it equal to the cost of equity for an average financial, a few points above for a strong franchise.",
  },
  exitPE: {
    title: "Exit P/E",
    what: "An alternative terminal value: final-year net income times a price-to-earnings multiple.",
    think: "It imports today's market mood into your long-run estimate. Use it as a cross-check against the perpetuity method.",
  },
  targetMargin: {
    title: "Target operating margin",
    what: "The margin you expect the business to settle at once mature.",
    think:
      "This is one of the two or three inputs that drive most of the value. Anchor it to the company's own history and to the best peers in its industry, then ask what would let it do better or force it to do worse: scale, pricing power, competition.",
    rule: "Margins above the industry's best need an explicit reason.",
  },
  marginConvergenceYear: {
    title: "Margin reached by year",
    what: "When the margin arrives at its target. It moves in a straight line until then.",
    think: "Margin expansion takes time: operating leverage, mix shift or cost programmes rarely deliver in one year.",
  },
  effectiveTaxRate: {
    title: "Effective tax rate",
    what: "Taxes actually paid as a share of pre-tax income.",
    think: "Often lower than the statutory rate thanks to credits, foreign profits or deferrals that may not last.",
  },
  marginalTaxRate: {
    title: "Marginal tax rate",
    what: "The statutory rate on the next dollar of profit. The model drifts toward it over time and uses it forever after.",
    think: "Tax breaks tend to fade, so in the long run assume the company pays the full rate.",
    rule: "About 25% for US companies (21% federal plus state).",
  },
  salesToCapital: {
    title: "Sales to capital",
    what: "Revenue generated per $1 of capital invested. It sets how much the company must reinvest to grow.",
    think:
      "Growth is not free. Value is created only when the return on the capital invested to grow beats the cost of that capital. This ratio links the two: high sales-to-capital means cheap growth and high returns.",
    rule: "Software and asset-light businesses: 2–5×. Industrials, utilities and retailers with stores: below 1.5×.",
  },
  costOfEquity: {
    title: "Cost of equity",
    what: "The return shareholders require: the risk-free rate plus beta times the equity risk premium. In the equity approach it is the discount rate.",
    think: "Debt is not part of the discount rate here, because the cash flows are already after interest paid to depositors and lenders.",
    rule: "8–11% for a large, stable bank or insurer; 12%+ for volatile brokers and fintechs.",
  },
  costOfCapital: {
    title: "Cost of capital (WACC)",
    what: "The return investors require for the risk of owning the business, blended across equity and debt.",
    think:
      "It is the hurdle every future dollar must clear. Buffett famously skips the beta machinery and uses one demanding rate for everything; analysts build it up with CAPM. Either way, be consistent and don't fiddle with it to reach a target price.",
    rule: "7–9% for a stable US company, 10%+ for riskier or smaller ones.",
  },
  riskFreeRate: {
    title: "Risk-free rate",
    what: "The yield on the 10-year US Treasury, pulled live.",
    think: "Everything is priced off it. When rates rise, every stream of future cash is worth less today.",
  },
  equityRiskPremium: {
    title: "Equity risk premium",
    what: "The extra return investors demand to hold stocks instead of Treasuries.",
    think: "Aswath Damodaran publishes an implied estimate from market prices every month; 4–5% has been typical recently.",
  },
  beta: {
    title: "Beta",
    what: "How much the stock moves with the market. 1 means in line; above 1 means more volatile.",
    think:
      "Regression betas are noisy. Many analysts use an industry average beta instead of the company's own, because it's more stable.",
  },
  preTaxCostOfDebt: {
    title: "Pre-tax cost of debt",
    what: "The interest rate the company would pay to borrow today.",
    think: "Roughly the risk-free rate plus a credit spread for the company's rating. Interest is tax-deductible, so the model uses it after tax.",
  },
  debtToCapital: {
    title: "Debt share of capital",
    what: "Debt as a share of debt plus market value of equity, used to weight the cost of capital.",
    think: "Use a target or industry-typical mix rather than a single year's number.",
  },
  terminal: {
    title: "Terminal value",
    what: "The value of all cash flows after the forecast period, captured in one number.",
    think:
      "It is often 60–80% of the total, which is why the assumptions behind it deserve the most scrutiny, not the least.",
  },
  terminalGrowth: {
    title: "Terminal growth",
    what: "The growth rate the company sustains forever after the forecast.",
    think: "No company can outgrow the economy forever, or it would eventually become the economy.",
    rule: "Keep it at or below the risk-free rate, usually 2–3%.",
  },
  terminalRoic: {
    title: "Return on new capital",
    what: "The return the company earns on money reinvested in the terminal period.",
    think:
      "This is where the moat shows up in the long run. If returns equal the cost of capital, growth adds nothing to value. A wide moat lets returns stay above it for longer.",
    rule: "Set it equal to WACC for an average company, a few points above it for a durable franchise.",
  },
  exitMultiple: {
    title: "Exit EV / EBIT",
    what: "An alternative terminal value: final-year operating profit times a market multiple.",
    think:
      "It's convenient, but it imports today's market mood into your long-run estimate. Use it as a cross-check against the perpetuity method rather than the main answer.",
  },
  midYear: {
    title: "Cash flow timing",
    what: "Mid-year assumes cash arrives evenly through each year; year-end assumes it lands on the last day.",
    think: "Mid-year is closer to reality and standard in banking models. It adds a few percent to value.",
  },
  cash: {
    title: "Cash & investments",
    what: "Cash and short-term investments on the balance sheet. They are added to enterprise value.",
    think: "Check whether some of it is trapped abroad or needed to run the business.",
  },
  debt: {
    title: "Debt incl. leases",
    what: "Borrowings plus lease liabilities. They are subtracted to get to equity.",
    think: "Leases behave like debt: a fixed claim that comes ahead of shareholders.",
  },
  minorityInterest: {
    title: "Minority interest",
    what: "The part of consolidated subsidiaries owned by other shareholders. It is subtracted.",
  },
  otherAdjustments: {
    title: "Other adjustments",
    what: "Anything else that belongs to or has a claim on the company outside operations.",
    think: "Add equity stakes and excess real estate; subtract pension deficits, litigation and employee options.",
  },
  sharesOutstanding: {
    title: "Diluted shares",
    what: "The share count that equity value is divided by. It starts from shares outstanding in the latest filing or quote; add options and restricted stock to make it fully diluted.",
    think:
      "Stock-based compensation keeps adding shares. Either count it as an expense in margins (the model does, through GAAP operating income) or raise the share count. Never ignore it.",
  },
  projection: {
    title: "Projection",
    what: "Your assumptions turned into ten years of revenue, profit, reinvestment and free cash flow.",
    think:
      "Read it like a story. Does the revenue in the final year make sense against the size of the market? Does the ROIC path look like the history you studied?",
  },
  fcfe: {
    title: "Free cash flow to equity",
    what: "Net income minus the equity the company must retain to grow: the cash that could be paid to shareholders.",
    think: "For a bank or broker, growth needs capital. Each extra dollar of revenue needs 1 ÷ sales-to-equity of new book equity, which comes out of earnings.",
  },
  fcff: {
    title: "Free cash flow to the firm",
    what: "NOPAT (after-tax operating profit) minus reinvestment: the cash available to all investors.",
    think: "This is what you are actually buying. Growth that consumes more cash than it generates lowers it today.",
  },
  bridge: {
    title: "From cash flows to equity",
    what: "Enterprise value is the value of operations. Add cash, subtract debt and other claims, and you reach the value that belongs to shareholders.",
  },
  bridgeEquity: {
    title: "From cash flows to equity",
    what: "The equity approach values shareholders' cash flows directly, so there is no enterprise value and no cash or debt to add or subtract. Only minority interests and other adjustments remain.",
    think: "For a bank or broker, deposits, customer balances and borrowings are the raw material of the business, not financing. Their cost is already in net income.",
  },
  enterpriseValue: {
    title: "Enterprise value",
    what: "The value of the operating business to all its investors, lenders and shareholders alike: the present value of free cash flow to the firm, including the terminal value.",
    think: "It is independent of how the company is financed. Shareholders get what is left after debt and other claims are paid, which is the equity value.",
  },
  equityValue: {
    title: "Equity value",
    what: "The value that belongs to shareholders: enterprise value plus cash, minus debt, minority interest and other claims. Divide it by the share count to get value per share.",
    think: "Compare it with the market cap shown below it. The gap between the two is your margin of safety in total-company terms.",
  },
  equityValueFin: {
    title: "Equity value",
    what: "The value that belongs to shareholders: the present value of cash flow to equity plus the terminal value, minus minority interest and other claims. Divide it by the share count to get value per share.",
    think: "Compare it with the market cap shown below it, and with book equity. Financials are often judged by price to book against their return on equity.",
  },
  bookEquity: {
    title: "Book equity",
    what: "Shareholders' equity on the latest balance sheet. For a financial company it is the capital that supports its lending, trading or underwriting.",
    think: "Price to book should rise with return on equity. A firm earning below its cost of equity deserves to trade below book.",
  },
  approach: {
    title: "Valuation approach",
    what: "Firm: free cash flow to the firm, discounted at WACC, then cash added and debt subtracted. Equity: cash flow to shareholders, discounted at the cost of equity, with no cash/debt bridge.",
    think:
      "For banks, brokers and insurers, debt and cash are part of operations (deposits, customer balances, funding), so the firm approach double counts or misreads them and can even produce a negative value. Damodaran values financials on equity for this reason.",
    rule: "Use Equity for banks, brokers, insurers and lenders; Firm for everything else. The app picks one from the company's industry.",
  },
  terminalShare: {
    title: "Terminal value share",
    what: "The share of total present value (before cash and debt) that comes from after the forecast period. It shows a dash when that total is zero or negative, because a share of a negative number is meaningless.",
    rule: "Above 80% means the answer rests mostly on the long-run assumptions. Check them twice.",
  },
  roeOut: {
    title: "Final-year ROE",
    what: "Net income over book equity in the last forecast year, implied by your margin and sales-to-equity assumptions.",
    think: "Compare it with the history and with the cost of equity. An ROE far above anything the company or its peers have earned means the assumptions are generous.",
  },
  roicOut: {
    title: "Final-year ROIC",
    what: "Return on invested capital in the last forecast year, implied by your margin and sales-to-capital assumptions.",
    think: "Compare it with the history and with WACC. A sudden jump means your assumptions are more heroic than they look.",
  },
  weighted: {
    title: "Probability-weighted value",
    what: "Bear, base and bull values weighted by the probabilities you assign.",
    think: "Expected value thinking: you are paid on the whole distribution, not the most likely outcome.",
  },
  scenarios: {
    title: "Scenarios",
    what: "Bear and bull cases as shifts from your base case, each with a probability.",
    think:
      "Write the story first, then the numbers: what has to happen for the bull case, what breaks in the bear case? Damodaran calls this joining narrative and numbers.",
    rule: "If the bear case is a permanent loss of capital, size the position accordingly, however good the base case looks.",
  },
  sensitivity: {
    title: "Sensitivity",
    what: "Value per share as two inputs move together.",
    think: "Find out which assumptions the answer depends on, then spend your research time on those.",
  },
  implied: {
    title: "What the price implies",
    what: "A reverse DCF: the growth, margin or discount rate that would make value equal today's price.",
    think:
      "The core of expectations investing. Instead of forecasting from scratch, ask whether the bar the market has set is too high or too low. It's easier to judge.",
    rule: "If the implied growth is above anything the company or its peers have done, the stock needs a miracle.",
  },
  tornado: {
    title: "What moves the value most",
    what: "Each driver swung on its own, holding the rest fixed.",
    think: "The longest bars are where you need conviction. The short ones barely matter, so don't over-research them.",
  },
  monteCarlo: {
    title: "Range of outcomes",
    what: "Hundreds of runs with growth, margin, discount rate and reinvestment varied together.",
    think: "A reminder that value is a distribution. The share of outcomes above today's price is a rough probability that you're right.",
  },
  brief: {
    title: "Brief for Claude",
    what: "Everything in your model, written up as a brief you can paste into Claude.",
    think:
      "Use it to argue with yourself: ask Claude to attack your assumptions, to write the bear case, and to list the metrics that would prove you wrong.",
  },
} satisfies Record<string, Lesson>;

export type LessonId = keyof typeof LESSONS;

export type TabId = "model" | "scenarios" | "sensitivity" | "implied" | "history" | "ownership" | "brief";

export interface TourStep {
  target?: string; // data-tour id; omitted for a centred card
  lesson?: LessonId;
  tab?: TabId;
  title: string;
  body: string;
  tryIt?: string;
}

/** The analyst's workflow, first input to last output. */
export const TOUR: TourStep[] = [
  {
    title: "How a professional values a business",
    body:
      "A share is a claim on future cash. A DCF estimates that cash, year by year, and discounts it back at the return investors require. This tour follows the order an analyst works in: understand the business, set the drivers, price the risk, then test your answer against the market. Use the arrows or ← and → keys. The ⓘ marks stay on every input afterwards.",
  },
  {
    target: "price",
    lesson: "price",
    title: "Start with the price",
    body:
      "Before forecasting anything, note what the market is paying. By the end you'll know which beliefs that price contains, and whether you disagree with them.",
  },
  {
    target: "tab-history",
    tab: "history",
    lesson: "history",
    title: "Study the history",
    body:
      "Read 10 years of growth, margins and returns on capital. Is growth steady or lumpy? Do margins swing with the cycle? Has ROIC stayed above roughly 9–10% (a typical cost of capital)? That persistence is the signature of a moat.",
  },
  {
    target: "revenueGrowth",
    tab: "model",
    lesson: "revenueGrowth",
    title: "Revenue growth",
    body:
      "The first driver. The default blends recent years; your job is to judge whether that pace can last given the company's size and market.",
    tryIt: "Drag it 3 points lower and watch the intrinsic value at the top move.",
  },
  {
    target: "highGrowthYears",
    lesson: "highGrowthYears",
    title: "How long growth lasts",
    body: "This is the competitive advantage period. After it, growth fades in a straight line to the terminal rate.",
  },
  {
    target: "targetMargin",
    lesson: "targetMargin",
    title: "Mature profitability",
    body:
      "Together with growth, the target margin usually drives most of the value. Anchor it to the company's history and its best peers.",
    tryIt: "Move it up 2 points. Notice it moves value more than most other inputs.",
  },
  {
    target: "effectiveTaxRate",
    lesson: "marginalTaxRate",
    title: "Taxes",
    body: "Today's effective rate drifts to the full statutory rate by the end of the forecast, because tax breaks rarely last forever.",
  },
  {
    target: "salesToCapital",
    lesson: "salesToCapital",
    title: "The cost of growth",
    body:
      "Growth must be funded. Sales-to-capital decides how much: each extra dollar of revenue needs 1 ÷ this ratio in new investment. This is where return on capital enters the model.",
    tryIt: "Lower it and watch the reinvestment line in the projection get bigger.",
  },
  {
    target: "costOfCapital",
    lesson: "costOfCapital",
    title: "The hurdle rate",
    body:
      "WACC is built from the risk-free rate, the equity risk premium, beta and the cost of debt. Set it once, honestly, and don't tune it to hit a price.",
  },
  {
    target: "terminal",
    lesson: "terminalRoic",
    title: "The long run",
    body:
      "Terminal value captures everything after year 10. Two inputs: perpetual growth (at or below the risk-free rate) and the return on new capital. If that return equals WACC, growth adds no value: the moat has gone.",
  },
  {
    target: "bridgeInputs",
    lesson: "sharesOutstanding",
    title: "From the business to the shares",
    body:
      "Add cash, subtract debt and leases, and divide by diluted shares. Check for anything else with a claim: pensions, options, stakes in other companies.",
  },
  {
    target: "projection",
    tab: "model",
    lesson: "fcff",
    title: "Read the projection",
    body:
      "Your assumptions become a 10-year story. Sanity-check the final year: is that revenue plausible for the market? Is the ROIC consistent with the history you studied?",
  },
  {
    target: "bridge",
    tab: "model",
    lesson: "terminalShare",
    title: "Where the value comes from",
    body: "Discounted cash flows plus terminal value give enterprise value. If the terminal value is above 80%, your answer rests on the long run.",
  },
  {
    target: "headline",
    lesson: "upside",
    title: "Value against price",
    body:
      "The base-case value next to the price gives your margin of safety. On the rail, price is the dark line and your estimates are in orange.",
  },
  {
    target: "tab-scenarios",
    tab: "scenarios",
    lesson: "scenarios",
    title: "Bear, base, bull",
    body:
      "Write each scenario as a story first, then shift the numbers. Weight them by probability. The weighted value is what an expected-value investor cares about.",
    tryIt: "Change the bear probability to 40% and watch the weighted value.",
  },
  {
    target: "tab-sensitivity",
    tab: "sensitivity",
    lesson: "sensitivity",
    title: "Stress-test it",
    body: "See how value moves when two inputs change together. Green cells are above today's price, red below.",
  },
  {
    target: "implied",
    tab: "implied",
    lesson: "implied",
    title: "What is the market assuming?",
    body:
      "The reverse DCF: what growth, margin or discount rate does today's price imply? If the implied growth is beyond anything the company has done, the market is very optimistic. If it is below history, you may have found an opportunity.",
  },
  {
    target: "tornado",
    tab: "implied",
    lesson: "tornado",
    title: "Focus your research",
    body: "The longest bars are the assumptions that matter. Spend your time on those, and get comfortable with the range of outcomes on the right.",
  },
  {
    target: "tab-brief",
    tab: "brief",
    lesson: "brief",
    title: "Build the narrative",
    body:
      "Write your thesis in the notes, then copy the brief and paste it into Claude. Ask it to attack your weakest assumption and write the bear case. A good thesis survives that.",
  },
  {
    title: "You've built a DCF like an analyst",
    body:
      "Price first, business second, drivers third, risk fourth, then test against the market. The ⓘ marks next to every input stay on, and you can restart this tour from the top bar at any time.",
  },
];

/** Labels and tooltips that change with the valuation approach, so every view says the same thing. */
export function terms(approach: "firm" | "equity" | undefined) {
  const eq = approach === "equity";
  return {
    eq,
    rate: eq ? "Cost of equity" : "WACC",
    rateLesson: (eq ? "costOfEquity" : "costOfCapital") as LessonId,
    margin: eq ? "pre-tax margin" : "operating margin",
    marginNow: eq ? "Pre-tax margin today" : "Operating margin today",
    marginTarget: eq ? "Target pre-tax margin" : "Target operating margin",
    marginNowLesson: (eq ? "pretaxMargin" : "currentMargin") as LessonId,
    marginTargetLesson: (eq ? "targetPretaxMargin" : "targetMargin") as LessonId,
    profit: eq ? "Pre-tax income" : "EBIT",
    afterTax: eq ? "Net income" : "NOPAT",
    stc: eq ? "Sales to equity" : "Sales to capital",
    stcLesson: (eq ? "salesToEquity" : "salesToCapital") as LessonId,
    returns: eq ? "ROE" : "ROIC",
    returnsLesson: (eq ? "roeOut" : "roicOut") as LessonId,
    terminalReturn: eq ? "Return on new equity" : "Return on new capital",
    terminalReturnLesson: (eq ? "terminalRoe" : "terminalRoic") as LessonId,
    exit: eq ? "Exit P/E" : "Exit EV / EBIT",
    exitShort: eq ? "P/E" : "EV/EBIT",
    exitLesson: (eq ? "exitPE" : "exitMultiple") as LessonId,
    fcf: eq ? "Free cash flow to equity" : "Free cash flow to firm",
    fcfShort: eq ? "FCFE" : "FCFF",
    fcfLesson: (eq ? "fcfe" : "fcff") as LessonId,
    bridgeLesson: (eq ? "bridgeEquity" : "bridge") as LessonId,
    equityValueLesson: (eq ? "equityValueFin" : "equityValue") as LessonId,
  };
}
