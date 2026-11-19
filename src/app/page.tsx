import Link from "next/link";
import { TickerSearch } from "@/components/TickerSearch";
import { RecentModels } from "@/components/RecentModels";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-[14vh] sm:px-6">
      <p className="text-[15px] font-bold tracking-tight">DCF Studio</p>
      <h1 className="mt-6 text-[clamp(36px,6vw,64px)] font-semibold leading-[1.02] tracking-[-0.035em]">
        What is it worth, and what is the market assuming?
      </h1>
      <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-muted">
        Type a US-listed ticker. Ten years of filings become a driver-based DCF you can bend: scenarios, sensitivities, a reverse DCF,
        and a brief to argue it through with Claude.
      </p>
      <div className="mt-10">
        <TickerSearch size="lg" autoFocus />
      </div>
      <p className="mt-4 text-[13.5px] text-muted">
        Try{" "}
        {["AAPL", "MSFT", "COST", "NVDA"].map((t, i) => (
          <span key={t}>
            {i > 0 && ", "}
            <Link href={`/t/${t}`} className="font-medium text-ink underline decoration-rule underline-offset-4 hover:decoration-brass">
              {t}
            </Link>
          </span>
        ))}
        , or open the{" "}
        <Link href="/t/DEMO" className="font-medium text-ink underline decoration-rule underline-offset-4 hover:decoration-brass">
          sample company
        </Link>
        .
      </p>
      <RecentModels />
    </main>
  );
}
