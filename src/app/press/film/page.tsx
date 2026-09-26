import { notFound } from "next/navigation";
import { Film } from "@/components/press/Film";
import { pressStats } from "@/components/press/stats";

// The launch film, one frame at a time: scripts/press.mjs seeks window.__seek(t) and captures.
export const dynamic = "force-dynamic";

export default async function FilmPage({ searchParams }: { searchParams: Promise<{ format?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { format } = await searchParams;
  return <Film stats={pressStats()} portrait={format === "portrait"} />;
}
