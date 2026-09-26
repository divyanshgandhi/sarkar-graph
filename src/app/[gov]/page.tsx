import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Explorer } from "@/components/Explorer";
import { readGovs, readGraph } from "@/lib/server/graphs";

export const dynamicParams = false;

export function generateStaticParams() {
  return readGovs().map((g) => ({ gov: g.gov }));
}

export async function generateMetadata({ params }: { params: Promise<{ gov: string }> }): Promise<Metadata> {
  const { gov } = await params;
  const s = readGovs().find((x) => x.gov === gov);
  if (!s) return {};
  if (gov === "in") return { title: "Government of India" };
  return {
    title: `Government of ${s.name}`,
    description: `Who governs ${s.name}: ${s.cm ? `Chief Minister ${s.cm.name}, ` : ""}${s.head ? `${s.head.title} ${s.head.name}, ` : ""}the council of ministers, legislature, courts, commissions and districts.`,
  };
}

export default async function GovPage({ params }: { params: Promise<{ gov: string }> }) {
  const { gov } = await params;
  const govs = readGovs();
  if (!govs.some((g) => g.gov === gov) || !readGraph(gov)) notFound();
  return <Explorer gov={gov} initialSelected={null} govs={govs} />;
}
