import { NextResponse } from "next/server";
import { searchTickers } from "@/lib/data/edgar";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  try {
    const results = await searchTickers(q.slice(0, 40));
    return NextResponse.json(results, {
      headers: { "Cache-Control": "public, s-maxage=86400" },
    });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
