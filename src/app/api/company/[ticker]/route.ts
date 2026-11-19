import { NextResponse } from "next/server";
import { getCompany } from "@/lib/data/company";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(_req: Request, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  if (!/^[A-Za-z0-9.\-^]{1,12}$/.test(ticker)) {
    return NextResponse.json({ error: "That doesn't look like a ticker." }, { status: 400 });
  }
  try {
    const data = await getCompany(ticker);
    return NextResponse.json(data, {
      // Cache complete results for an hour; partial ones only briefly so a fixed data source shows up fast.
      headers: {
        "Cache-Control": data.historicals.length && data.price
          ? "public, s-maxage=3600, stale-while-revalidate=86400"
          : "public, s-maxage=60",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Lookup failed" }, { status: 404 });
  }
}
