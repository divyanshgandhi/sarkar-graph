import { notFound } from "next/navigation";
import { Banner } from "@/components/press/Banner";
import { pressStats } from "@/components/press/stats";

// Press assets are rendered locally by scripts/press.mjs; they never ship with the site.
export const dynamic = "force-dynamic";

export default function BannerPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Banner stats={pressStats()} />;
}
