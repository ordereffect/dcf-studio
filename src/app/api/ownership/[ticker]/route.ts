import { NextResponse } from "next/server";
import { getOwnership } from "@/lib/data/ownership";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(_req: Request, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  if (!/^[A-Za-z0-9.\-^]{1,12}$/.test(ticker)) {
    return NextResponse.json({ error: "That doesn't look like a ticker." }, { status: 400 });
  }
  try {
    const data = await getOwnership(ticker);
    if (!data) return NextResponse.json({ error: "No SEC filer found for this ticker." }, { status: 404 });
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400" },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Lookup failed" }, { status: 502 });
  }
}
