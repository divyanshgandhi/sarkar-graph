import { notFound } from "next/navigation";
import { Film } from "@/components/press/Film";
import { pressStats } from "@/components/press/stats";

// The launch film, one frame at a time: scripts/press.mjs seeks window.__seek(t) and captures.
export const dynamic = "force-dynamic";

export default function FilmPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Film stats={pressStats()} />;
}
