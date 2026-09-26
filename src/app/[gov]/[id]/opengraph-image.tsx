import { ImageResponse } from "next/og";
import { OgCard } from "@/components/og/Card";
import { readGraph } from "@/lib/server/graphs";

export const alt = "A seat of power on Sarkar Graph";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ gov: string; id: string }> }) {
  const { gov, id } = await params;
  const g = readGraph(gov);
  const n = g?.nodes[decodeURIComponent(id)];
  if (!g || !n) return new ImageResponse(<OgCard title="Sarkar Graph" />, size);
  const holder = n.holder?.name ?? (n.head ? g.nodes[n.head]?.holder?.name : undefined);
  const where = gov === "in" ? "Government of India" : `Government of ${g.name}`;
  return new ImageResponse(
    <OgCard kicker={where} title={n.name} sub={holder ? `${n.isPosition ? "Held by" : "Headed by"} ${holder}${n.holder?.party ? ` (${n.holder.party})` : ""}` : undefined} />,
    size,
  );
}
