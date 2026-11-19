import Link from "next/link";
import { TickerSearch } from "@/components/TickerSearch";
import { RecentModels } from "@/components/RecentModels";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Home() {
  return (
    <>
      <header className="flex items-center justify-between px-4 py-3 sm:px-6">
        <span className="text-[13px] text-brass">DCF Studio</span>
        <ThemeToggle />
      </header>
      <main className="mx-auto max-w-[680px] px-4 pb-24 pt-[12vh] sm:px-6">
        <h1 className="text-[clamp(26px,4.2vw,40px)] font-bold leading-[1.15] tracking-[-0.03em]">
          What is it worth, and what is the market assuming?
        </h1>
        <p className="mt-5 text-[14px] leading-[1.75] text-muted">
          Type a US-listed ticker. Ten years of SEC filings become a driver-based DCF you can bend: scenarios, sensitivities, a
          reverse DCF, and a brief to argue it through with Claude.
        </p>
        <div className="mt-10">
          <TickerSearch size="lg" autoFocus />
        </div>
        <p className="mt-4 text-[13px] text-muted">
          Try{" "}
          {["AAPL", "MSFT", "COST", "NVDA"].map((t, i) => (
            <span key={t}>
              {i > 0 && " / "}
              <Link href={`/t/${t}`} className="text-brass hover:underline">
                {t}
              </Link>
            </span>
          ))}{" "}
          or the{" "}
          <Link href="/t/DEMO" className="text-brass hover:underline">
            sample company
          </Link>
          .
        </p>
        <RecentModels />
      </main>
    </>
  );
}
