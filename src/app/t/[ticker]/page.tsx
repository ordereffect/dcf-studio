import type { Metadata } from "next";
import { Workbench } from "@/components/Workbench";

export async function generateMetadata({ params }: { params: Promise<{ ticker: string }> }): Promise<Metadata> {
  const { ticker } = await params;
  return { title: `${decodeURIComponent(ticker).toUpperCase()} · DCF Studio` };
}

export default async function TickerPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  return <Workbench ticker={decodeURIComponent(ticker).toUpperCase()} />;
}
