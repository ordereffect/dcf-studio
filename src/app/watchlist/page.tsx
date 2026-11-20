import type { Metadata } from "next";
import { Watchlist } from "@/components/Watchlist";

export const metadata: Metadata = { title: "Watchlist · DCF Studio" };

export default function WatchlistPage() {
  return <Watchlist />;
}
