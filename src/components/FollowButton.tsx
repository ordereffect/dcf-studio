"use client";
import Link from "next/link";
import clsx from "clsx";
import { Star } from "lucide-react";
import { follow, unfollow, useWatchlist } from "@/lib/watchlist";

/** Star a stock to add it to the watchlist; press again to drop it. */
export function FollowButton({ ticker }: { ticker: string }) {
  const list = useWatchlist();
  const on = list.includes(ticker.toUpperCase());
  return (
    <button
      type="button"
      onClick={() => (on ? unfollow(ticker) : follow(ticker))}
      aria-pressed={on}
      title={on ? "Remove from your watchlist" : "Add to your watchlist"}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-[3px] border px-2.5 py-1 text-[12.5px] font-semibold",
        on ? "border-brass bg-brass-soft text-brass" : "border-rule text-muted hover:border-brass hover:text-ink",
      )}
    >
      <Star className={clsx("size-3.5", on && "fill-current")} aria-hidden />
      {on ? "Following" : "Follow"}
    </button>
  );
}

/** Header link to the watchlist with a live count. */
export function WatchlistLink() {
  const n = useWatchlist().length;
  return (
    <Link href="/watchlist" className="inline-flex shrink-0 items-center gap-1.5 text-[13px] text-brass hover:underline">
      <Star className="size-3.5" aria-hidden />
      <span className="hidden sm:inline">Watchlist</span>
      {n > 0 && <span className="num rounded-[2px] bg-sunk px-1 text-[11px] text-muted">{n}</span>}
    </Link>
  );
}
