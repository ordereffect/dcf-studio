"use client";
import { useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { Panel } from "../ui";
import { useModel } from "@/lib/store";
import { buildBrief } from "@/lib/brief";
import type { Assumptions, CompanyData } from "@/lib/dcf/types";

export function BriefTab({ c, a, price }: { c: CompanyData; a: Assumptions; price: number | null }) {
  const scenarios = useModel((s) => s.scenarios);
  const notes = useModel((s) => s.notes);
  const setNotes = useModel((s) => s.setNotes);
  const [copied, setCopied] = useState(false);
  const brief = buildBrief(c, a, scenarios, price, notes);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(brief);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  const download = () => {
    const blob = new Blob([brief], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = url;
    el.download = `${c.ticker}-valuation-brief.md`;
    el.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
      <Panel title="Your notes" note="Saved with this model and included in the brief">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={14}
          placeholder="What do you believe that the market doesn't? Moat, management, catalysts, what would make you wrong…"
          className="w-full resize-y rounded-[3px] border border-rule bg-sunk p-3 text-[14px] leading-relaxed outline-none placeholder:text-faint focus-visible:border-brass"
        />
      </Panel>
      <Panel
        title="Brief for Claude"
        info="brief"
        note="Paste it into your Claude project to build the narrative together"
      >
        <div className="mb-3 flex gap-2">
          <button
            onClick={copy}
            className="inline-flex items-center gap-2 rounded-[3px] bg-brass px-4 py-2 text-[13px] font-semibold text-[#111] hover:opacity-90"
          >
            {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
            {copied ? "Copied" : "Copy brief"}
          </button>
          <button
            onClick={download}
            className="inline-flex items-center gap-2 rounded-[3px] border border-rule px-4 py-2 text-[13.5px] text-muted hover:text-ink"
          >
            <Download className="size-4" aria-hidden />
            Download .md
          </button>
        </div>
        <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap rounded-[3px] bg-sunk p-4 text-[12.5px] leading-relaxed text-muted">{brief}</pre>
      </Panel>
    </div>
  );
}
