import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Explorer } from "@/components/Explorer";
import { readGovs, readGraph } from "@/lib/server/graphs";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ gov: string; id: string }> }): Promise<Metadata> {
  const { gov, id } = await params;
  const g = readGraph(gov);
  const n = g?.nodes[decodeURIComponent(id)];
  if (!g || !n) return {};
  const who = n.holder?.name ?? (n.head ? g.nodes[n.head]?.holder?.name : undefined);
  return {
    title: n.name,
    description: [who ? `${n.isPosition ? "Held by" : "Headed by"} ${who}.` : null, n.description].filter(Boolean).join(" ").slice(0, 300),
  };
}

export default async function EntityPage({ params }: { params: Promise<{ gov: string; id: string }> }) {
  const { gov, id } = await params;
  const g = readGraph(gov);
  const key = decodeURIComponent(id);
  if (!g || !g.nodes[key]) notFound();
  return <Explorer gov={gov} initialSelected={key} govs={readGovs()} />;
}
