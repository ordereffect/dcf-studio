"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { listSavedModels, type SavedModel } from "@/lib/store";
import { runDcf } from "@/lib/dcf/engine";
import { money, signedPct } from "@/lib/format";

export function RecentModels() {
  const [models, setModels] = useState<SavedModel[]>([]);
  useEffect(() => setModels(listSavedModels().slice(0, 8)), []);
  if (!models.length) return null;
  return (
    <section className="mt-16">
      <h2 className="text-[14px] font-bold">Your models</h2>
      <ul className="mt-3 divide-y divide-rule border-y border-rule">
        {models.map((m) => {
          const v = runDcf(m.assumptions).valuePerShare;
          const up = m.price ? v / m.price - 1 : NaN;
          return (
            <li key={m.ticker}>
              <Link href={`/t/${m.ticker}`} className="num flex items-baseline gap-4 py-3 hover:bg-surface">
                <span className="w-16 font-bold text-brass">{m.ticker}</span>
                <span className="min-w-0 flex-1 truncate text-[14px] text-muted">{m.name}</span>
                <span className="text-[14px] text-ink">{money(v)}</span>
                <span className={`w-14 text-right text-[13px] ${up >= 0 ? "text-up" : "text-down"}`}>{signedPct(up)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
